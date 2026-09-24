import { VideoInput, VideoMetadata, ConversionOptions } from './types';
import { FrameExtractor } from './FrameExtractor';

/**
 * Abstract base class for video processing
 */
export abstract class VideoProcessor {
  protected options: ConversionOptions;
  protected metadata: VideoMetadata | null = null;

  constructor(options: ConversionOptions) {
    this.options = options;
  }

  /**
   * Load video and get metadata
   */
  abstract loadVideo(input: VideoInput): Promise<VideoMetadata>;

  /**
   * Extract frames from video
   */
  abstract extractFrames(
    timestamps: number[],
    options?: { width?: number; height?: number }
  ): Promise<Array<{ data: Buffer | Blob; width: number; height: number; timestamp: number }>>;

  /**
   * Clean up resources
   */
  abstract cleanup(): Promise<void>;

  /**
   * Calculate dimensions maintaining aspect ratio
   */
  protected calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    targetWidth?: number,
    targetHeight?: number,
    maintainAspectRatio: boolean = true
  ): { width: number; height: number } {
    if (!targetWidth && !targetHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    if (!maintainAspectRatio) {
      return {
        width: targetWidth || originalWidth,
        height: targetHeight || originalHeight
      };
    }

    const aspectRatio = originalWidth / originalHeight;

    if (targetWidth && targetHeight) {
      // Both specified, fit within bounds
      const widthRatio = targetWidth / originalWidth;
      const heightRatio = targetHeight / originalHeight;
      const ratio = Math.min(widthRatio, heightRatio);
      return {
        width: Math.round(originalWidth * ratio),
        height: Math.round(originalHeight * ratio)
      };
    } else if (targetWidth) {
      // Only width specified
      return {
        width: targetWidth,
        height: Math.round(targetWidth / aspectRatio)
      };
    } else {
      // Only height specified
      return {
        width: Math.round(targetHeight! * aspectRatio),
        height: targetHeight!
      };
    }
  }

  /**
   * Process video and extract frames based on options
   */
  public async process(input: VideoInput): Promise<{
    frames: Array<{ data: Buffer | Blob; width: number; height: number; timestamp: number }>;
    metadata: VideoMetadata;
  }> {
    // Load video and get metadata
    this.metadata = await this.loadVideo(input);

    // Create frame extractor
    const extractor = FrameExtractor.create(
      this.options.extractionMode,
      {
        duration: this.metadata.duration,
        fps: this.metadata.fps || 30
      },
      {
        framesCount: this.options.framesCount,
        frameInterval: this.options.frameInterval,
        timeInterval: this.options.timeInterval
      }
    );

    // Get timestamps for frames to extract
    const timestamps = extractor.getFrameTimestamps();

    // Calculate target dimensions
    const dimensions = this.calculateDimensions(
      this.metadata.dimensions.width,
      this.metadata.dimensions.height,
      this.options.width,
      this.options.height,
      this.options.maintainAspectRatio !== false
    );

    // Report progress
    if (this.options.onProgress) {
      this.options.onProgress(0);
    }

    // Extract frames (reports 0-50%; exporting reports 50-100%)
    const frames = await this.extractFrames(timestamps, dimensions);

    // Update metadata
    this.metadata.extractedFrames = frames.length;

    return {
      frames,
      metadata: this.metadata
    };
  }
}

