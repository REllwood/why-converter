import { resolveOptions } from './options';
import { ConversionOptions, ConversionResult, VideoInput } from './types';

/**
 * Run a conversion with the shared option handling, callbacks and error
 * reporting used by both the Node.js and browser entry points
 */
export async function runConversion(
  input: VideoInput,
  options: Partial<ConversionOptions>,
  processVideo: (input: VideoInput, options: ConversionOptions) => Promise<ConversionResult>
): Promise<ConversionResult> {
  try {
    const fullOptions = resolveOptions(options);
    const result = await processVideo(input, fullOptions);

    fullOptions.onProgress?.(100);
    fullOptions.onComplete?.(result);

    return result;
  } catch (caught) {
    const error = caught instanceof Error ? caught : new Error(String(caught));

    if (typeof options.onError === 'function') {
      options.onError(error);
    }

    return {
      success: false,
      error: error.message,
      metadata: {
        totalFrames: 0,
        extractedFrames: 0,
        duration: 0,
        dimensions: { width: 0, height: 0 }
      }
    };
  }
}
