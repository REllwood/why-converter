import { PNG } from 'pngjs';
import { GIFExporter, GIFFrameEncoder } from './GIFExporter';
import { ConversionOptions, VideoMetadata } from '../core/types';
import { withContext } from '../core/errors';

/**
 * Node.js implementation of GIF exporter
 *
 * Frames are PNGs from ffmpeg, decoded to raw RGBA pixels with pngjs,
 * so no native modules are needed.
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

    // Size the GIF from the first frame's decoded pixels rather than the reported frame size
    let encoder: GIFFrameEncoder | undefined;
    let width = 0;
    let height = 0;

    // Process each frame
    for (let i = 0; i < frames.length; i++) {
      try {
        const image = PNG.sync.read(frames[i].data);

        if (!encoder) {
          ({ width, height } = image);
          encoder = this.createEncoder(width, height);
        } else if (image.width !== width || image.height !== height) {
          throw new Error(
            `Frame is ${image.width}x${image.height} but the GIF is ${width}x${height}`
          );
        }

        encoder.addFrame(image.data);
      } catch (error) {
        throw withContext(`Failed to add frame ${i} to GIF`, error);
      }

      // Report progress
      if (this.options.onProgress) {
        const progress = 50 + ((i + 1) / frames.length) * 50; // 50-100%
        this.options.onProgress(progress);
      }
    }

    return Buffer.from(encoder!.finish());
  }
}
