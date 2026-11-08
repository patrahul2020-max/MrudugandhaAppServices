import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

/**
 * Robust client-side PDF generation supporting modern CSS (including Tailwind v4 OKLCH colors).
 * Uses html2canvas-pro for canvas rasterization and jsPDF for vector document container.
 */
export async function generatePdfFromElement(
  element: HTMLElement,
  filename: string
): Promise<void> {
  // Capture high-DPI canvas (scale: 2 for crisp 300dpi printing)
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.98);

  // Initialize A4 PDF document
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const margin = 8; // 8mm margin
  const contentWidth = pdfWidth - margin * 2;
  const contentHeight = (canvas.height * contentWidth) / canvas.width;

  // Single page or multi-page output
  if (contentHeight <= pdfHeight - margin * 2) {
    pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight);
  } else {
    let position = margin;
    let heightLeft = contentHeight;

    pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
    heightLeft -= (pdfHeight - margin * 2);

    while (heightLeft > 0) {
      position = -(pdfHeight - margin * 2 - position);
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
      heightLeft -= (pdfHeight - margin * 2);
    }
  }

  pdf.save(filename);
}
