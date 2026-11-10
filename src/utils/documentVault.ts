import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { Booking, StoredDocument, DocumentCategory, UserProfile } from '../types';
import { saveCloudDocument } from './api';
import { loadDocuments, saveDocuments } from './storage';

/**
 * Formats byte size into human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Downloads a Blob directly to the client's device
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Shares or downloads a generated PDF file
 */
export async function shareOrDownloadPdf(
  blob: Blob,
  filename: string,
  title: string,
  text: string
): Promise<{ shared: boolean; downloaded: boolean }> {
  try {
    const file = new File([blob], filename, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title,
        text,
      });
      return { shared: true, downloaded: false };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { shared: false, downloaded: false };
    }
    console.warn('Web Share API failed or cancelled, falling back to direct download:', err);
  }

  // Fallback: direct download
  triggerFileDownload(blob, filename);
  return { shared: false, downloaded: true };
}

/**
 * Generates a high-quality PDF from a DOM element, automatically saves it to the
 * common Document Vault repository, and gives share/download options.
 */
export async function generateAndSavePdf(
  element: HTMLElement,
  options: {
    booking: Booking;
    documentType: 'Check-in Slip' | 'Invoice';
    activeUser?: UserProfile;
    autoShare?: boolean;
    notes?: string;
  }
): Promise<{
  success: boolean;
  doc: StoredDocument;
  blob: Blob;
  dataUrl: string;
  filename: string;
  shared: boolean;
}> {
  const { booking, documentType, activeUser, autoShare = true, notes } = options;

  // Clean filename: e.g. "Mrudugandha_Invoice_BK101_Vikramaditya.pdf"
  const safeName = (booking.guestName || 'Guest').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
  const typeTag = documentType === 'Invoice' ? 'Invoice' : 'CheckInSlip';
  const filename = `Mrudugandha_${typeTag}_BK${booking.srNo || '1'}_${safeName}.pdf`;

  // 1. Render element to high-res canvas (scale: 2 for sharp print quality)
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  // 2. Generate PDF document using standard A4 dimensions
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const ratio = (canvasHeight * pdfWidth) / canvasWidth;

  if (ratio <= pdfHeight) {
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, ratio);
  } else {
    // Multi-page or fit to height
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(ratio, pdfHeight));
  }

  const blob = pdf.output('blob');
  const dataUrl = pdf.output('datauristring');
  const fileSize = formatFileSize(blob.size);

  // 3. Create document record for the common Document Vault
  const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const docTitle = `${documentType} #${booking.srNo} - ${booking.guestName}`;

  const storedDoc: StoredDocument = {
    id: docId,
    bookingId: booking.id,
    bookingSrNo: booking.srNo,
    guestName: booking.guestName,
    guestPhone: booking.phone,
    documentType: documentType as DocumentCategory,
    title: docTitle,
    fileUrl: dataUrl,
    fileType: 'application/pdf',
    fileSize,
    bookingDate: booking.bookingDate,
    createdAt: new Date().toISOString(),
    notes: notes || `Generated from ${documentType} on booking #${booking.srNo}`,
    uploadedBy: activeUser ? `${activeUser.name} (${activeUser.role})` : 'Front Desk',
  };

  // 4. Simultaneously save into local storage & Cloud DB vault
  try {
    const existingDocs = loadDocuments();
    // Avoid exact duplicate title for same booking if generated repeatedly
    const filtered = existingDocs.filter(
      d => !(d.bookingId === booking.id && d.documentType === documentType && d.title === docTitle)
    );
    const updatedDocs = [storedDoc, ...filtered];
    saveDocuments(updatedDocs);
  } catch (err) {
    console.error('Failed to save to local documents storage:', err);
  }

  try {
    await saveCloudDocument(storedDoc, activeUser);
  } catch (cloudErr) {
    console.warn('Failed to save document to cloud repository:', cloudErr);
  }

  // 5. Trigger native share or automatic download
  let shared = false;
  if (autoShare) {
    const shareTitle = `${documentType} - ${booking.guestName} (#${booking.srNo})`;
    const shareText = `Official ${documentType} for ${booking.guestName} (Booking #${booking.srNo}, ${booking.unitAllotted}) at Mrudugandha Guesthouse, Kotawade.`;
    const res = await shareOrDownloadPdf(blob, filename, shareTitle, shareText);
    shared = res.shared;
  }

  return {
    success: true,
    doc: storedDoc,
    blob,
    dataUrl,
    filename,
    shared,
  };
}
