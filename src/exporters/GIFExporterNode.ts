import GIFEncoder from 'gifencoder';
import { createCanvas, loadImage } from 'canvas';
import { GIFExporter } from './GIFExporter';
import { ConversionOptions, VideoMetadata } from '../core/types';

/**
 * Node.js implementation of GIF exporter using gifencoder
 */
export class GIFExporterNode extends GIFExporter {
  constructor(options: ConversionOptions, metadata: VideoMetadata) {
    super(options, metadata);
  }

  /**
   * Export frames to GIF
   */
  async export(
    frames: Array<{ data: Buffer; width: number; height: number; timestamp: number }>
  ): Promise<Buffer> {
    if (frames.length === 0) {
      throw new Error('No frames to export');
    }

    const width = frames[0].width;
    const height = frames[0].height;

    // Create encoder
    const encoder = new GIFEncoder(width, height);

    // Configure encoder
    const delay = this.getFrameDelay();
    const repeat = this.getRepeat();
    const quality = this.getQuality();

    encoder.setDelay(delay * 10); // gifencoder expects delay in milliseconds
    encoder.setRepeat(repeat);
    encoder.setQuality(11 - quality); // gifencoder uses 1 (best) to 10 (worst)

    // Start encoding
    encoder.start();

    // Create canvas for drawing frames
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Process each frame
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];

      try {
        // Load image from buffer
        const image = await loadImage(frame.data);

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw image
        ctx.drawImage(image, 0, 0, width, height);

        // Add frame to GIF
        encoder.addFrame(ctx as any);

        // Report progress
        if (this.options.onProgress) {
          const progress = 50 + ((i + 1) / frames.length) * 50; // 50-100%
          this.options.onProgress(progress);
        }
      } catch (error) {
        console.error(`Failed to add frame ${i} to GIF:`, error);
      }
    }

    // Finish encoding
    encoder.finish();

    // Get buffer
    const buffer = encoder.out.getData();
    return Buffer.from(buffer);
  }
}

