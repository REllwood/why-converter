import * as path from 'path';
import { ImageExporter } from './ImageExporter';
import { ConversionOptions, VideoMetadata } from '../core/types';
import * as nodeUtils from '../utils/node';

/**
 * Node.js implementation of image sequence exporter
 *
 * Frames arrive already encoded in the requested image format by ffmpeg,
 * so this only needs to write them out.
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
        await nodeUtils.writeBufferToFile(filePath, frame.data);
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
