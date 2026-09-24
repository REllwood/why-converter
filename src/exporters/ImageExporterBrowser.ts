import { ImageExporter } from './ImageExporter';
import { ConversionOptions, VideoMetadata, ImageFormat } from '../core/types';
import { withContext } from '../core/errors';
import * as browserUtils from '../utils/browser';

/**
 * Browser implementation of image sequence exporter
 */
export class ImageExporterBrowser extends ImageExporter {
  constructor(options: ConversionOptions, metadata: VideoMetadata) {
    super(options, metadata);
  }

  /**
   * Export frames as image sequence
   */
  async export(
    frames: Array<{ data: Blob; width: number; height: number; timestamp: number }>
  ): Promise<{ files: File[] }> {
    if (frames.length === 0) {
      throw new Error('No frames to export');
    }

    const format = this.getImageFormat();
    const quality = this.getImageQuality();
    const mimeType = this.getMimeType(format);

    const files: File[] = [];

    // Process each frame
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const filename = this.generateFilename(i, format);

      try {
        let blob = frame.data;

        // Convert format if needed
        if (format !== 'png' || quality !== 100) {
          blob = await this.convertFrameFormat(frame.data, frame.width, frame.height, format, quality);
        }

        // Create File from Blob
        const file = new File([blob], filename, { type: mimeType });
        files.push(file);

        // Report progress
        if (this.options.onProgress) {
          const progress = 50 + ((i + 1) / frames.length) * 50; // 50-100%
          this.options.onProgress(progress);
        }
      } catch (error) {
        throw withContext(`Failed to export frame ${i}`, error);
      }
    }

    return { files };
  }

  /**
   * Convert frame to desired format
   */
  private async convertFrameFormat(
    blob: Blob,
    width: number,
    height: number,
    format: ImageFormat,
    quality: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = browserUtils.createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      const imageUrl = URL.createObjectURL(blob);
      const image = new Image();

      image.onload = () => {
        ctx.drawImage(image, 0, 0, width, height);
        URL.revokeObjectURL(imageUrl);

        const mimeType = this.getMimeType(format);
        const qualityValue = format === 'png' ? undefined : quality / 100;

        canvas.toBlob(
          (convertedBlob: Blob | null) => {
            if (convertedBlob) {
              resolve(convertedBlob);
            } else {
              reject(new Error('Failed to convert frame format'));
            }
          },
          mimeType,
          qualityValue
        );
      };

      image.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        reject(new Error('Failed to load frame image'));
      };

      image.src = imageUrl;
    });
  }
}

