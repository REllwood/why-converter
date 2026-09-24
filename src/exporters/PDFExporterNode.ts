import PDFDocument from 'pdfkit';
import { PDFExporter } from './PDFExporter';
import { ConversionOptions, VideoMetadata } from '../core/types';
import { withContext } from '../core/errors';

/**
 * Node.js implementation of PDF exporter using PDFKit
 */
export class PDFExporterNode extends PDFExporter {
  constructor(options: ConversionOptions, metadata: VideoMetadata) {
    super(options, metadata);
  }

  /**
   * Export frames to PDF
   */
  async export(
    frames: Array<{ data: Buffer; width: number; height: number; timestamp: number }>
  ): Promise<Buffer> {
    const pageDimensions = this.getPageDimensions();
    const framesPerPage = this.options.framesPerPage || 1;
    const margin = 20;

    // Create PDF document
    const doc = new PDFDocument({
      size: [pageDimensions.width, pageDimensions.height],
      margin: 0
    });

    // Collect PDF data
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    // Process frames
    const totalPages = Math.ceil(frames.length / framesPerPage);
    let currentPage = 0;

    for (let i = 0; i < frames.length; i += framesPerPage) {
      if (i > 0) {
        doc.addPage();
      }
      currentPage++;

      const pageFrames = frames.slice(i, i + framesPerPage);
      const layout = this.calculateFrameLayout(
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
          layout,
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
          doc.image(frame.data, position.x + fit.x, position.y + fit.y, {
            width: fit.width,
            height: fit.height
          });

          // Optionally add timestamp
          if (framesPerPage > 1) {
            doc.fontSize(8)
              .fillColor('#666666')
              .text(
                `${frame.timestamp.toFixed(2)}s`,
                position.x,
                position.y + position.height - 15,
                {
                  width: position.width,
                  align: 'center'
                }
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

    // Finalize PDF
    doc.end();

    // Wait for PDF to finish
    return new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);
    });
  }
}

