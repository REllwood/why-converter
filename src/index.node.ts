import {
  ConversionOptions,
  ConversionResult,
  VideoInput
} from './core/types';
import { runConversion } from './core/convert';
import { VideoProcessorNode } from './core/VideoProcessorNode';
import { PDFExporterNode } from './exporters/PDFExporterNode';
import { GIFExporterNode } from './exporters/GIFExporterNode';
import { ImageExporterNode } from './exporters/ImageExporterNode';
import * as nodeUtils from './utils/node';
import * as path from 'path';

/**
 * Main function to convert video to various formats (Node.js version)
 */
export function convertVideo(
  input: VideoInput,
  options: Partial<ConversionOptions> = {}
): Promise<ConversionResult> {
  return runConversion(input, options, processVideo);
}

/**
 * Process video in Node.js environment
 */
async function processVideo(
  input: VideoInput,
  options: ConversionOptions
): Promise<ConversionResult> {
  // Create video processor
  const processor = new VideoProcessorNode(options);

  try {
    // Process video and extract frames
    const { frames, metadata } = await processor.process(input);

    let outputPath: string | undefined;
    let buffer: Buffer | undefined;
    let filePaths: string[] | undefined;

    // Export based on output format
    switch (options.outputFormat) {
      case 'pdf': {
        const exporter = new PDFExporterNode(options, metadata);
        buffer = await exporter.export(frames as any);

        // Save to file if outputPath specified
        if (options.outputPath) {
          outputPath = options.outputPath;
          if (nodeUtils.isDirectory(outputPath)) {
            outputPath = path.join(outputPath, 'output.pdf');
          }
          await nodeUtils.writeBufferToFile(outputPath, buffer);
        }
        break;
      }

      case 'gif': {
        const exporter = new GIFExporterNode(options, metadata);
        buffer = await exporter.export(frames as any);

        // Save to file if outputPath specified
        if (options.outputPath) {
          outputPath = options.outputPath;
          if (nodeUtils.isDirectory(outputPath)) {
            outputPath = path.join(outputPath, 'output.gif');
          }
          await nodeUtils.writeBufferToFile(outputPath, buffer);
        }
        break;
      }

      case 'images': {
        const exporter = new ImageExporterNode(options, metadata);
        const imageResult = await exporter.export(frames as any);
        outputPath = imageResult.directory;
        filePaths = imageResult.files;
        break;
      }

      default:
        throw new Error(`Unsupported output format: ${options.outputFormat}`);
    }

    // Cleanup
    await processor.cleanup();

    return {
      success: true,
      outputPath,
      buffer,
      filePaths,
      metadata
    };
  } catch (error) {
    await processor.cleanup();
    throw error;
  }
}

// Export types for users
export * from './core/types';
export { DEFAULT_CONFIG } from './config';

// Default export
export default convertVideo;

