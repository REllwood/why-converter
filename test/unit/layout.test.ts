import { VideoProcessor } from '../../src/core/VideoProcessor';
import { PDFExporter } from '../../src/exporters/PDFExporter';
import { ConversionOptions, VideoMetadata } from '../../src/core/types';
import { makeMetadata, makeOptions } from '../helpers';

class TestProcessor extends VideoProcessor {
  async loadVideo(): Promise<VideoMetadata> {
    return makeMetadata();
  }

  async extractFrames(): Promise<[]> {
    return [];
  }

  async cleanup(): Promise<void> {}

  public dimensions(
    width: number,
    height: number,
    targetWidth?: number,
    targetHeight?: number,
    maintainAspectRatio?: boolean
  ) {
    return this.calculateDimensions(width, height, targetWidth, targetHeight, maintainAspectRatio);
  }
}

class TestPDFExporter extends PDFExporter {
  async export(): Promise<Buffer> {
    return Buffer.alloc(0);
  }

  public page() {
    return this.getPageDimensions();
  }

  public layout(framesPerPage: number, pageWidth: number, pageHeight: number) {
    return this.calculateFrameLayout(framesPerPage, pageWidth, pageHeight);
  }

  public fit(imageWidth: number, imageHeight: number, maxWidth: number, maxHeight: number) {
    return this.fitImageInBounds(imageWidth, imageHeight, maxWidth, maxHeight);
  }
}

function pdfExporter(options: Partial<ConversionOptions> = {}): TestPDFExporter {
  return new TestPDFExporter(makeOptions(options), makeMetadata());
}

describe('VideoProcessor.calculateDimensions', () => {
  const processor = new TestProcessor(makeOptions());

  it('keeps the original size when no target is given', () => {
    expect(processor.dimensions(1920, 1080)).toEqual({ width: 1920, height: 1080 });
  });

  it('scales height from width', () => {
    expect(processor.dimensions(1920, 1080, 640)).toEqual({ width: 640, height: 360 });
  });

  it('scales width from height', () => {
    expect(processor.dimensions(1920, 1080, undefined, 540)).toEqual({ width: 960, height: 540 });
  });

  it('fits inside both bounds when keeping the aspect ratio', () => {
    expect(processor.dimensions(1920, 1080, 800, 800)).toEqual({ width: 800, height: 450 });
  });

  it('uses the exact size when the aspect ratio is not kept', () => {
    expect(processor.dimensions(1920, 1080, 800, 800, false)).toEqual({ width: 800, height: 800 });
  });
});

describe('PDFExporter layout', () => {
  it('uses A4 landscape by default', () => {
    expect(pdfExporter().page()).toEqual({ width: 841.89, height: 595.28 });
  });

  it('supports portrait and named sizes', () => {
    expect(pdfExporter({ pdfLayout: 'portrait', pageSize: 'Letter' }).page()).toEqual({
      width: 612,
      height: 792
    });
  });

  it('supports custom page sizes', () => {
    expect(pdfExporter({ pdfLayout: 'portrait', pageSize: [800, 1200] }).page()).toEqual({
      width: 800,
      height: 1200
    });
  });

  it.each([
    [1, 1, 1],
    [2, 1, 2],
    [4, 2, 2],
    [6, 2, 3],
    [9, 3, 3],
    [12, 3, 4],
    [16, 4, 4]
  ])('lays out %i frames per page as %i x %i', (framesPerPage, rows, cols) => {
    const layout = pdfExporter().layout(framesPerPage, 800, 600);
    expect(layout.rows).toBe(rows);
    expect(layout.cols).toBe(cols);
  });

  it('fits a wide image to the width of its cell and centres it', () => {
    expect(pdfExporter().fit(1920, 1080, 400, 400)).toEqual({ width: 400, height: 225, x: 0, y: 87.5 });
  });

  it('fits a tall image to the height of its cell and centres it', () => {
    expect(pdfExporter().fit(1080, 1920, 400, 400)).toEqual({ width: 225, height: 400, x: 87.5, y: 0 });
  });
});
