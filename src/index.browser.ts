import {
  ConversionOptions,
  ConversionResult,
  VideoInput
} from './core/types';
import { DEFAULT_CONFIG } from './config';
import { VideoProcessorBrowser } from './core/VideoProcessorBrowser';
import { PDFExporterBrowser } from './exporters/PDFExporterBrowser';
import { GIFExporterBrowser } from './exporters/GIFExporterBrowser';
import { ImageExporterBrowser } from './exporters/ImageExporterBrowser';

/**
 * Main function to convert video to various formats (Browser version)
 */
export async function convertVideo(
  input: VideoInput,
  options: Partial<ConversionOptions>
): Promise<ConversionResult> {
  // Merge options with defaults
  const fullOptions: ConversionOptions = {
    extractionMode: options.extractionMode || DEFAULT_CONFIG.extractionMode,
    outputFormat: options.outputFormat || DEFAULT_CONFIG.outputFormat,
    framesCount: options.framesCount,
    frameInterval: options.frameInterval,
    timeInterval: options.timeInterval,
    outputPath: options.outputPath,
    pdfLayout: options.pdfLayout || DEFAULT_CONFIG.pdfLayout,
    framesPerPage: options.framesPerPage || DEFAULT_CONFIG.framesPerPage,
    pageSize: options.pageSize || DEFAULT_CONFIG.pageSize,
    gifFps: options.gifFps || DEFAULT_CONFIG.gifFps,
    gifQuality: options.gifQuality || DEFAULT_CONFIG.gifQuality,
    gifRepeat: options.gifRepeat !== undefined ? options.gifRepeat : DEFAULT_CONFIG.gifRepeat,
    imageFormat: options.imageFormat || DEFAULT_CONFIG.imageFormat,
    imageQuality: options.imageQuality || DEFAULT_CONFIG.imageQuality,
    imagePrefix: options.imagePrefix || DEFAULT_CONFIG.imagePrefix,
    width: options.width,
    height: options.height,
    maintainAspectRatio: options.maintainAspectRatio !== false,
    compression: options.compression || DEFAULT_CONFIG.compression,
    onProgress: options.onProgress,
    onComplete: options.onComplete,
    onError: options.onError
  };

  try {
    const result = await processVideo(input, fullOptions);

    if (fullOptions.onComplete) {
      fullOptions.onComplete(result);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const result: ConversionResult = {
      success: false,
      error: errorMessage,
      metadata: {
        totalFrames: 0,
        extractedFrames: 0,
        duration: 0,
        dimensions: { width: 0, height: 0 }
      }
    };

    if (fullOptions.onError) {
      fullOptions.onError(error instanceof Error ? error : new Error(errorMessage));
    }

    return result;
  }
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

