import { createCanvas, loadImage } from 'canvas';
import * as path from 'path';
import { ImageExporter } from './ImageExporter';
import { ConversionOptions, VideoMetadata, ImageFormat } from '../core/types';
import * as nodeUtils from '../utils/node';

/**
 * Node.js implementation of image sequence exporter
 */
export class ImageExporterNode extends ImageExporter {
  constructor(options: ConversionOptions, metadata: VideoMetadata) {
    super(options, metadata);
  }

  /**
   * Export frames as image sequence
   */
  async export(
    frames: Array<{ data: Buffer; width: number; height: number; timestamp: number }>
  ): Promise<{ files: string[]; directory: string }> {
    if (frames.length === 0) {
      throw new Error('No frames to export');
    }

    const format = this.getImageFormat();
    const quality = this.getImageQuality();

    // Determine output directory
    let outputDir: string;
    if (this.options.outputPath) {
      if (nodeUtils.isDirectory(this.options.outputPath)) {
        outputDir = this.options.outputPath;
      } else {
        // Use parent directory
        outputDir = path.dirname(this.options.outputPath);
      }
    } else {
      // Create temp directory
      outputDir = nodeUtils.createTempDir();
    }

    nodeUtils.ensureDir(outputDir);

    const filePaths: string[] = [];

    // Process each frame
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const filename = this.generateFilename(i, format);
      const filePath = path.join(outputDir, filename);

      try {
        // If the frame is already in PNG format and we want PNG, just save it
        if (format === 'png') {
          await nodeUtils.writeBufferToFile(filePath, frame.data);
        } else {
          // Convert to desired format
          const image = await loadImage(frame.data);
          const canvas = createCanvas(frame.width, frame.height);
          const ctx = canvas.getContext('2d');

          ctx.drawImage(image, 0, 0, frame.width, frame.height);

          // Convert to buffer
          let buffer: Buffer;
          if (format === 'jpeg') {
            buffer = canvas.toBuffer('image/jpeg', { quality: quality / 100 });
          } else if (format === 'webp') {
            buffer = canvas.toBuffer('image/png'); // node-canvas doesn't support webp
            // Fallback to PNG for webp
            console.warn('WebP not supported in Node.js, using PNG instead');
          } else {
            buffer = canvas.toBuffer('image/png');
          }

          await nodeUtils.writeBufferToFile(filePath, buffer);
        }

        filePaths.push(filePath);

        // Report progress
        if (this.options.onProgress) {
          const progress = 50 + ((i + 1) / frames.length) * 50; // 50-100%
          this.options.onProgress(progress);
        }
      } catch (error) {
        console.error(`Failed to export frame ${i}:`, error);
      }
    }

    return {
      files: filePaths,
      directory: outputDir
    };
  }
}

