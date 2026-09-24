import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { ConversionOptions, VideoMetadata } from '../core/types';

/**
 * Builds a GIF one frame of raw RGBA pixels at a time
 */
export interface GIFFrameEncoder {
  addFrame(rgba: Uint8Array | Uint8ClampedArray): void;
  finish(): Uint8Array;
}

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
   * Get the palette size for each frame from the 1-100 quality setting
   */
  protected getMaxColors(): number {
    const quality = this.options.gifQuality || 80;
    return Math.min(256, Math.max(2, Math.round((quality / 100) * 256)));
  }

  /**
   * Create an encoder that turns frames of raw RGBA pixels into a GIF, using
   * the configured frame rate, repeat count and quality
   */
  protected createEncoder(width: number, height: number): GIFFrameEncoder {
    const encoder = GIFEncoder();
    const delay = this.getFrameDelay() * 10; // gifenc expects milliseconds
    const repeat = this.getRepeat();
    const maxColors = this.getMaxColors();

    return {
      addFrame(rgba: Uint8Array | Uint8ClampedArray): void {
        const palette = quantize(rgba, maxColors);
        encoder.writeFrame(applyPalette(rgba, palette), width, height, { palette, delay, repeat });
      },
      finish(): Uint8Array {
        encoder.finish();
        return encoder.bytes();
      }
    };
  }
}
