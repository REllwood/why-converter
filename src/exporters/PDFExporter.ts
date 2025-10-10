import { ConversionOptions, VideoMetadata } from '../core/types';
import { PAGE_SIZES } from '../config';

/**
 * Abstract base class for PDF export
 */
export abstract class PDFExporter {
  protected options: ConversionOptions;
  protected metadata: VideoMetadata;

  constructor(options: ConversionOptions, metadata: VideoMetadata) {
    this.options = options;
    this.metadata = metadata;
  }

  /**
   * Export frames to PDF
   */
  abstract export(
    frames: Array<{ data: Buffer | Blob; width: number; height: number; timestamp: number }>
  ): Promise<Buffer | Blob>;

  /**
   * Get page dimensions
   */
  protected getPageDimensions(): { width: number; height: number } {
    const pageSize = this.options.pageSize || 'A4';
    const layout = this.options.pdfLayout || 'landscape';

    let dimensions: [number, number];

    if (typeof pageSize === 'string') {
      dimensions = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
    } else {
      dimensions = pageSize;
    }

    // Swap dimensions for landscape
    if (layout === 'landscape') {
      return { width: dimensions[1], height: dimensions[0] };
    } else {
      return { width: dimensions[0], height: dimensions[1] };
    }
  }

  /**
   * Calculate layout for multiple frames per page
   */
  protected calculateFrameLayout(
    framesPerPage: number,
    pageWidth: number,
    pageHeight: number,
    margin: number = 20
  ): {
    rows: number;
    cols: number;
    frameWidth: number;
    frameHeight: number;
    spacing: number;
  } {
    // Determine grid layout
    let rows = 1;
    let cols = 1;

    if (framesPerPage === 1) {
      rows = 1;
      cols = 1;
    } else if (framesPerPage === 2) {
      rows = 1;
      cols = 2;
    } else if (framesPerPage <= 4) {
      rows = 2;
      cols = 2;
    } else if (framesPerPage <= 6) {
      rows = 2;
      cols = 3;
    } else if (framesPerPage <= 9) {
      rows = 3;
      cols = 3;
    } else if (framesPerPage <= 12) {
      rows = 3;
      cols = 4;
    } else {
      // For larger numbers, calculate optimal grid
      cols = Math.ceil(Math.sqrt(framesPerPage));
      rows = Math.ceil(framesPerPage / cols);
    }

    const spacing = 10;
    const availableWidth = pageWidth - (2 * margin) - ((cols - 1) * spacing);
    const availableHeight = pageHeight - (2 * margin) - ((rows - 1) * spacing);

    const frameWidth = availableWidth / cols;
    const frameHeight = availableHeight / rows;

    return {
      rows,
      cols,
      frameWidth,
      frameHeight,
      spacing
    };
  }

  /**
   * Calculate position for frame on page
   */
  protected calculateFramePosition(
    frameIndex: number,
    layout: { rows: number; cols: number; frameWidth: number; frameHeight: number; spacing: number },
    pageWidth: number,
    pageHeight: number,
    margin: number = 20
  ): { x: number; y: number; width: number; height: number } {
    const row = Math.floor(frameIndex / layout.cols);
    const col = frameIndex % layout.cols;

    const x = margin + col * (layout.frameWidth + layout.spacing);
    const y = margin + row * (layout.frameHeight + layout.spacing);

    return {
      x,
      y,
      width: layout.frameWidth,
      height: layout.frameHeight
    };
  }

  /**
   * Fit image dimensions within bounds maintaining aspect ratio
   */
  protected fitImageInBounds(
    imageWidth: number,
    imageHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number; x: number; y: number } {
    const aspectRatio = imageWidth / imageHeight;
    const boundsRatio = maxWidth / maxHeight;

    let width: number;
    let height: number;

    if (aspectRatio > boundsRatio) {
      // Image is wider than bounds
      width = maxWidth;
      height = maxWidth / aspectRatio;
    } else {
      // Image is taller than bounds
      height = maxHeight;
      width = maxHeight * aspectRatio;
    }

    // Center image in bounds
    const x = (maxWidth - width) / 2;
    const y = (maxHeight - height) / 2;

    return { width, height, x, y };
  }
}

