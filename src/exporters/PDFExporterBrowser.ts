import { jsPDF } from 'jspdf';
import { PDFExporter } from './PDFExporter';
import { ConversionOptions, VideoMetadata } from '../core/types';
import { withContext } from '../core/errors';

/**
 * Browser implementation of PDF exporter using jsPDF
 */
export class PDFExporterBrowser extends PDFExporter {
  constructor(options: ConversionOptions, metadata: VideoMetadata) {
    super(options, metadata);
  }

  /**
   * Export frames to PDF
   */
  async export(
    frames: Array<{ data: Blob; width: number; height: number; timestamp: number }>
  ): Promise<Blob> {
    const pageDimensions = this.getPageDimensions();
    const framesPerPage = this.options.framesPerPage || 1;
    const margin = 20;
    const layout = this.options.pdfLayout || 'landscape';

    // Create PDF document
    const doc = new jsPDF({
      orientation: layout === 'landscape' ? 'landscape' : 'portrait',
      unit: 'pt',
      format: [pageDimensions.width, pageDimensions.height],
      compress: true
    });

    // Process frames
    const totalPages = Math.ceil(frames.length / framesPerPage);
    let currentPage = 0;

    for (let i = 0; i < frames.length; i += framesPerPage) {
      if (i > 0) {
        doc.addPage();
      }
      currentPage++;

      const pageFrames = frames.slice(i, i + framesPerPage);
      const frameLayout = this.calculateFrameLayout(
        framesPerPage,
        pageDimensions.width,
        pageDimensions.height,
        margin
      );

      // Draw frames on page
      for (let j = 0; j < pageFrames.length; j++) {
        const frame = pageFrames[j];
        const position = this.calculateFramePosition(
          j,
          frameLayout,
          pageDimensions.width,
          pageDimensions.height,
          margin
        );

        // Fit image within bounds
        const fit = this.fitImageInBounds(
          frame.width,
          frame.height,
          position.width,
          position.height
        );

        try {
          const png = new Uint8Array(await frame.data.arrayBuffer());

          // jsPDF stores images uncompressed unless asked, which made PDFs
          // around 20x larger than the PNG frames; FAST costs little extra time
          doc.addImage(
            png,
            'PNG',
            position.x + fit.x,
            position.y + fit.y,
            fit.width,
            fit.height,
            undefined,
            'FAST'
          );

          // Optionally add timestamp
          if (framesPerPage > 1) {
            doc.setFontSize(8);
            doc.setTextColor(102, 102, 102);
            doc.text(
              `${frame.timestamp.toFixed(2)}s`,
              position.x + position.width / 2,
              position.y + position.height - 5,
              { align: 'center' }
            );
          }
        } catch (error) {
          throw withContext(`Failed to add frame ${i + j} to PDF`, error);
        }
      }

      // Report progress
      if (this.options.onProgress) {
        const progress = 50 + (currentPage / totalPages) * 50; // 50-100%
        this.options.onProgress(progress);
      }
    }

    // Generate PDF blob
    const pdfBlob = doc.output('blob');
    return pdfBlob;
  }
}

