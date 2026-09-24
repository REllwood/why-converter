import {
  ConversionOptions,
  ConversionResult,
  VideoInput
} from './core/types';
import { runConversion } from './core/convert';
import { VideoProcessorBrowser } from './core/VideoProcessorBrowser';
import { PDFExporterBrowser } from './exporters/PDFExporterBrowser';
import { GIFExporterBrowser } from './exporters/GIFExporterBrowser';
import { ImageExporterBrowser } from './exporters/ImageExporterBrowser';

/**
 * Main function to convert video to various formats (Browser version)
 */
export function convertVideo(
  input: VideoInput,
  options: Partial<ConversionOptions> = {}
): Promise<ConversionResult> {
  return runConversion(input, options, processVideo);
}

/**
 * Process video in browser environment
 */
async function processVideo(
  input: VideoInput,
  options: ConversionOptions
): Promise<ConversionResult> {
  // Create video processor
  const processor = new VideoProcessorBrowser(options);

  try {
    // Process video and extract frames
    const { frames, metadata } = await processor.process(input);

    let blob: Blob | undefined;
    let files: File[] | undefined;

    // Export based on output format
    switch (options.outputFormat) {
      case 'pdf': {
        const exporter = new PDFExporterBrowser(options, metadata);
        blob = await exporter.export(frames as any);
        break;
      }

      case 'gif': {
        const exporter = new GIFExporterBrowser(options, metadata);
        blob = await exporter.export(frames as any);
        break;
      }

      case 'images': {
        const exporter = new ImageExporterBrowser(options, metadata);
        const imageResult = await exporter.export(frames as any);
        files = imageResult.files;
        break;
      }

      default:
        throw new Error(`Unsupported output format: ${options.outputFormat}`);
    }

    // Cleanup
    await processor.cleanup();

    return {
      success: true,
      blob,
      files,
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

