import { GIFExporter } from './GIFExporter';
import { ConversionOptions, VideoMetadata } from '../core/types';
import { withContext } from '../core/errors';
import * as browserUtils from '../utils/browser';

/**
 * Browser implementation of GIF exporter
 *
 * Encodes on the page itself, so unlike worker-based encoders it needs no
 * extra script to be fetched and works under any origin.
 */
export class GIFExporterBrowser extends GIFExporter {
  constructor(options: ConversionOptions, metadata: VideoMetadata) {
    super(options, metadata);
  }

  /**
   * Export frames to GIF
   */
  async export(
    frames: Array<{ data: Blob; width: number; height: number; timestamp: number }>
  ): Promise<Blob> {
    if (frames.length === 0) {
      throw new Error('No frames to export');
    }

    const width = frames[0].width;
    const height = frames[0].height;

    const canvas = browserUtils.createCanvas(width, height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    const encoder = this.createEncoder(width, height);

    // Process each frame
    for (let i = 0; i < frames.length; i++) {
      try {
        const image = await browserUtils.blobToImage(frames[i].data);

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);
        encoder.addFrame(ctx.getImageData(0, 0, width, height).data);
      } catch (error) {
        throw withContext(`Failed to add frame ${i} to GIF`, error);
      }

      // Report progress
      if (this.options.onProgress) {
        const progress = 50 + ((i + 1) / frames.length) * 50; // 50-100%
        this.options.onProgress(progress);
      }
    }

    // Copying into a new Uint8Array gives it the plain ArrayBuffer that Blob's types require
    return new Blob([new Uint8Array(encoder.finish())], { type: 'image/gif' });
  }
}
