/**
 * PDF Export Utility
 * Handles conversion of HTML content to PDF for session reports
 * 
 * Uses html-to-image for better compatibility with:
 * - Tailwind v4 (no oklch parsing issues)
 * - Modern CSS features
 * - SVG charts (Recharts)
 */

interface PDFExportOptions {
  filename?: string;
  scale?: number;
  quality?: number;
  singlePage?: boolean; // If true, scales content to fit on one page
}

/**
 * Exports HTML element to PDF
 * @param element - The HTML element to export
 * @param options - Export configuration options
 */
export async function exportToPDF(
  element: HTMLElement,
  options: PDFExportOptions = {}
): Promise<void> {
  const {
    filename = `Report_${new Date().toISOString().split('T')[0]}.pdf`,
    scale = 2,
    singlePage = true, // Default to single page for cleaner reports
  } = options;

  // Lazy load libraries only when needed (reduces initial bundle size)
  const [{ toPng }, { default: jsPDF }] = await Promise.all([
    import('html-to-image'),
    import('jspdf')
  ]);

  // Store original styles to restore later
  const originalWidth = element.style.width;
  const originalMinWidth = element.style.minWidth;
  const originalMaxWidth = element.style.maxWidth;
  
  // Set fixed width for consistent PDF rendering (A4 portrait paper width ~210mm = 794px)
  element.style.width = '1200px';
  element.style.minWidth = '1200px';
  element.style.maxWidth = '1200px';

  try {
    // Convert HTML to PNG using html-to-image
    const dataUrl = await toPng(element, {
      cacheBust: true,
      pixelRatio: scale,
      backgroundColor: '#ffffff',
    });

    // Restore original styles
    element.style.width = originalWidth;
    element.style.minWidth = originalMinWidth;
    element.style.maxWidth = originalMaxWidth;

    // Load the image to get dimensions
    const img = new Image();
    img.src = dataUrl;
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
    });

    // Create PDF with compression
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate dimensions based on single-page or multi-page mode
    let imgWidth: number;
    let imgHeight: number;
    
    if (singlePage) {
      // Scale content to fit on a single page
      const widthRatio = pdfWidth / img.width;
      const heightRatio = pdfHeight / img.height;
      const scale = Math.min(widthRatio, heightRatio);
      
      imgWidth = img.width * scale;
      imgHeight = img.height * scale;
      
      // Center the content on the page
      const xOffset = (pdfWidth - imgWidth) / 2;
      const yOffset = (pdfHeight - imgHeight) / 2;
      
      pdf.addImage(dataUrl, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
    } else {
      // Multi-page mode: fit to width and span across pages
      imgWidth = pdfWidth;
      imgHeight = (img.height * imgWidth) / img.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Add additional pages if content is longer than one page
      while (heightLeft > 0) {
        position = -(imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
    }

    // Save the PDF
    pdf.save(filename);
  } catch (error) {
    // Restore original styles even on error
    element.style.width = originalWidth;
    element.style.minWidth = originalMinWidth;
    element.style.maxWidth = originalMaxWidth;
    
    console.error('PDF generation failed:', error);
    throw error;
  }
}

/**
 * Generate a session report filename
 * @param sessionName - Name of the session
 * @param sessionId - ID of the session (fallback if name is not available)
 */
export function generateSessionFilename(sessionName?: string, sessionId?: string): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const sanitizedName = sessionName?.replace(/[^a-z0-9]/gi, '_') || sessionId || 'unknown';
  return `Session_Report_${sanitizedName}_${timestamp}.pdf`;
}
