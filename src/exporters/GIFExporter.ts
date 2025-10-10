import { ConversionOptions, VideoMetadata } from '../core/types';

/**
 * Abstract base class for GIF export
 */
export abstract class GIFExporter {
  protected options: ConversionOptions;
  protected metadata: VideoMetadata;

  constructor(options: ConversionOptions, metadata: VideoMetadata) {
    this.options = options;
    this.metadata = metadata;
  }

  /**
   * Export frames to GIF
   */
  abstract export(
    frames: Array<{ data: Buffer | Blob; width: number; height: number; timestamp: number }>
  ): Promise<Buffer | Blob>;

  /**
   * Get GIF delay based on FPS
   */
  protected getFrameDelay(): number {
    const fps = this.options.gifFps || 10;
    return Math.round(100 / fps); // Delay in hundredths of a second
  }

  /**
   * Get GIF repeat setting
   */
  protected getRepeat(): number {
    const repeat = this.options.gifRepeat;
    if (repeat === undefined || repeat === null) {
      return 0; // Infinite loop
    }
    return repeat;
  }

  /**
   * Get quality setting
   */
  protected getQuality(): number {
    const quality = this.options.gifQuality || 80;
    // Convert 1-100 to 1-10 scale (10 is best quality)
    return Math.round((quality / 100) * 10);
  }
}

