import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { Booking, StoredDocument, DocumentCategory, UserProfile } from '../types';
import { saveCloudDocument } from './api';
import { loadDocuments, saveDocuments } from './storage';
import { uploadToClientDriveFolder } from './googleDrive';

/**
 * Formats byte size into human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Converts a base64 Data URL to a Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
  const binary = atob(parts[1]);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
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
 * Generates a full-content high-quality PDF from a DOM element.
 * Ensures 100% of the content (including all scrollable tables, terms, and signatures)
 * is captured and properly paginated into A4 pages without any clipping.
 * Automatically saves the document into the local and cloud Document Vault,
 * and optionally uploads it to Google Drive in the client's dedicated folder.
 */
export async function generateAndSavePdf(
  element: HTMLElement,
  options: {
    booking: Booking;
    documentType: 'Check-in Slip' | 'Invoice';
    activeUser?: UserProfile;
    autoShare?: boolean;
    uploadToDrive?: boolean;
    notes?: string;
  }
): Promise<{
  success: boolean;
  doc: StoredDocument;
  blob: Blob;
  dataUrl: string;
  filename: string;
  shared: boolean;
  driveResult?: {
    success: boolean;
    fileId?: string;
    webViewLink?: string;
    clientFolder?: string;
    error?: string;
  };
}> {
  const { booking, documentType, activeUser, autoShare = true, uploadToDrive = false, notes } = options;

  // Clean filename: e.g. "Mrudugandha_Invoice_BK101_Rahul_Patil.pdf"
  const safeName = (booking.guestName || 'Guest').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25);
  const typeTag = documentType === 'Invoice' ? 'Tax_Invoice' : 'CheckIn_Slip';
  const filename = `Mrudugandha_${typeTag}_BK${booking.srNo || '1'}_${safeName}.pdf`;

  // --- FULL CONTENT CAPTURE PREPARATION ---
  // Save previous inline styles so we can temporarily expand the container to render 100% of the content
  const prevMaxHeight = element.style.maxHeight;
  const prevOverflow = element.style.overflow;
  const prevHeight = element.style.height;

  element.style.maxHeight = 'none';
  element.style.overflow = 'visible';
  element.style.height = 'auto';

  let canvas: HTMLCanvasElement;
  try {
    // Render full element height to high-res canvas (scale: 2 for crisp print typography)
    canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      width: element.scrollWidth,
      height: element.scrollHeight,
      scrollY: -window.scrollY,
      scrollX: -window.scrollX,
    });
  } finally {
    // Restore original styles
    element.style.maxHeight = prevMaxHeight;
    element.style.overflow = prevOverflow;
    element.style.height = prevHeight;
  }

  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  // --- MULTI-PAGE A4 PDF BUILDER ---
  // Standard A4 dimensions: 210mm x 297mm
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210 mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297 mm
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const totalHeightMm = (canvasHeight * pdfWidth) / canvasWidth;

  let heightLeft = totalHeightMm;
  let position = 0;

  // Add first page
  pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, totalHeightMm);
  heightLeft -= pdfHeight;

  // If content spans beyond 1 A4 page, create additional pages to capture full content
  while (heightLeft > 2) {
    position -= pdfHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, totalHeightMm);
    heightLeft -= pdfHeight;
  }

  const blob = pdf.output('blob');
  const dataUrl = pdf.output('datauristring');
  const fileSize = formatFileSize(blob.size);

  // Create document record for the common Document Vault
  const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const docTitle = `${documentType} #${booking.srNo} - ${booking.guestName}`;

  let driveResult:
    | {
        success: boolean;
        fileId?: string;
        webViewLink?: string;
        clientFolder?: string;
        error?: string;
      }
    | undefined;

  // Upload to Google Drive if requested
  if (uploadToDrive) {
    try {
      const uploadRes = await uploadToClientDriveFolder({
        filename,
        mimeType: 'application/pdf',
        blob,
        clientName: booking.guestName,
      });
      driveResult = {
        success: uploadRes.success,
        fileId: uploadRes.fileId,
        webViewLink: uploadRes.webViewLink,
        clientFolder: uploadRes.clientFolder,
        error: uploadRes.error,
      };
    } catch (dErr: any) {
      console.warn('Google Drive direct upload error:', dErr);
      driveResult = {
        success: false,
        error: dErr.message || 'Google Drive upload failed',
      };
    }
  }

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
    driveFileId: driveResult?.fileId,
    driveWebViewLink: driveResult?.webViewLink,
    driveUploadedAt: driveResult?.success ? new Date().toISOString() : undefined,
    driveClientFolder: driveResult?.clientFolder || booking.guestName,
  };

  // Simultaneously save into local storage & Cloud DB vault
  try {
    const existingDocs = loadDocuments();
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

  // Trigger native share or automatic download
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
    driveResult,
  };
}

/**
 * Uploads an existing StoredDocument from the Document Vault directly to Google Drive.
 * Keeps data organized folder-wise: parent "clients documents" -> client-named folder.
 */
export async function uploadVaultDocToGoogleDrive(
  doc: StoredDocument,
  activeUser?: UserProfile
): Promise<{
  success: boolean;
  updatedDoc: StoredDocument;
  webViewLink?: string;
  clientFolder: string;
  error?: string;
}> {
  const clientName = doc.guestName || 'Client';
  const ext = doc.fileType?.includes('pdf') || doc.title.toLowerCase().endsWith('.pdf') ? 'pdf' : 'jpg';
  const cleanTitle = doc.title.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${cleanTitle}.${ext}`;
  const mimeType = doc.fileType || (ext === 'pdf' ? 'application/pdf' : 'image/jpeg');

  let blob: Blob;
  if (doc.fileUrl.startsWith('data:')) {
    blob = dataUrlToBlob(doc.fileUrl);
  } else {
    const response = await fetch(doc.fileUrl);
    blob = await response.blob();
  }

  const result = await uploadToClientDriveFolder({
    filename,
    mimeType,
    blob,
    clientName,
  });

  if (!result.success) {
    return {
      success: false,
      updatedDoc: doc,
      clientFolder: result.clientFolder,
      error: result.error,
    };
  }

  // Update document record with Drive metadata
  const updatedDoc: StoredDocument = {
    ...doc,
    driveFileId: result.fileId,
    driveWebViewLink: result.webViewLink,
    driveUploadedAt: new Date().toISOString(),
    driveClientFolder: result.clientFolder,
  };

  try {
    const existing = loadDocuments();
    const updatedList = existing.map(d => (d.id === doc.id ? updatedDoc : d));
    saveDocuments(updatedList);
  } catch (err) {
    console.warn('Failed to update local storage after Drive upload:', err);
  }

  try {
    await saveCloudDocument(updatedDoc, activeUser);
  } catch (err) {
    console.warn('Failed to update Cloud DB after Drive upload:', err);
  }

  return {
    success: true,
    updatedDoc,
    webViewLink: result.webViewLink,
    clientFolder: result.clientFolder,
  };
}
