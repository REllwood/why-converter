import GIF from 'gif.js';
import { GIFExporter } from './GIFExporter';
import { ConversionOptions, VideoMetadata } from '../core/types';
import * as browserUtils from '../utils/browser';

/**
 * Browser implementation of GIF exporter using gif.js
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

    // Calculate delay in milliseconds
    const fps = this.options.gifFps || 10;
    const delay = Math.round(1000 / fps);

    const repeat = this.getRepeat();
    const quality = this.getQuality();

    // Create GIF encoder
    const gif = new GIF({
      workers: 2,
      quality: 11 - quality, // gif.js uses 1 (best) to 10 (worst)
      width,
      height,
      repeat,
      workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js'
    });

    // Process each frame
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];

      try {
        // Convert blob to image
        const canvas = browserUtils.createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Load image from blob
        const imageUrl = URL.createObjectURL(frame.data);
        const image = new Image();

        await new Promise<void>((resolve, reject) => {
          image.onload = () => {
            ctx.drawImage(image, 0, 0, width, height);
            URL.revokeObjectURL(imageUrl);
            resolve();
          };
          image.onerror = () => {
            URL.revokeObjectURL(imageUrl);
            reject(new Error('Failed to load frame image'));
          };
          image.src = imageUrl;
        });

        // Add frame to GIF
        gif.addFrame(canvas, { delay });

        // Report progress
        if (this.options.onProgress) {
          const progress = 50 + ((i + 1) / frames.length) * 25; // 50-75%
          this.options.onProgress(progress);
        }
      } catch (error) {
        console.error(`Failed to add frame ${i} to GIF:`, error);
      }
    }

    // Render GIF
    return new Promise<Blob>((resolve, reject) => {
      gif.on('finished', (blob: Blob) => {
        if (this.options.onProgress) {
          this.options.onProgress(100);
        }
        resolve(blob);
      });

      gif.on('progress', (p: number) => {
        if (this.options.onProgress) {
          const progress = 75 + p * 25; // 75-100%
          this.options.onProgress(progress);
        }
      });

      gif.on('error', (error: Error) => {
        reject(error);
      });

      gif.render();
    });
  }
}

