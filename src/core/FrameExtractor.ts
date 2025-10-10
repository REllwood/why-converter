import { FrameExtractionConfig, ExtractionMode } from './types';

/**
 * FrameExtractor handles the logic for determining which frames to extract
 * based on the extraction mode and parameters
 */
export class FrameExtractor {
  private config: FrameExtractionConfig;

  constructor(config: FrameExtractionConfig) {
    this.config = config;
  }

  /**
   * Calculate timestamps for frames to extract
   */
  public getFrameTimestamps(): number[] {
    switch (this.config.mode) {
      case 'frames':
        return this.getTimestampsByFrameCount();
      case 'interval':
        return this.getTimestampsByFrameInterval();
      case 'time':
        return this.getTimestampsByTimeInterval();
      default:
        throw new Error(`Unknown extraction mode: ${this.config.mode}`);
    }
  }

  /**
   * Extract N frames evenly distributed across video duration
   */
  private getTimestampsByFrameCount(): number[] {
    const count = this.config.framesCount !== undefined ? this.config.framesCount : 10;
    const duration = this.config.videoDuration;

    if (count <= 0) {
      throw new Error('Frame count must be greater than 0');
    }

    if (count === 1) {
      // Single frame from the middle
      return [duration / 2];
    }

    const timestamps: number[] = [];
    const interval = duration / (count - 1);

    for (let i = 0; i < count; i++) {
      const timestamp = Math.min(i * interval, duration - 0.1); // -0.1 to avoid edge cases
      timestamps.push(timestamp);
    }

    return timestamps;
  }

  /**
   * Extract every Nth frame
   */
  private getTimestampsByFrameInterval(): number[] {
    const interval = this.config.frameInterval !== undefined ? this.config.frameInterval : 30;
    const fps = this.config.videoFps;
    const duration = this.config.videoDuration;

    if (interval <= 0) {
      throw new Error('Frame interval must be greater than 0');
    }

    const timestamps: number[] = [];
    const totalFrames = Math.floor(duration * fps);

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += interval) {
      const timestamp = frameIndex / fps;
      if (timestamp < duration) {
        timestamps.push(timestamp);
      }
    }

    return timestamps;
  }

  /**
   * Extract one frame every N seconds
   */
  private getTimestampsByTimeInterval(): number[] {
    const interval = this.config.timeInterval || 1;
    const duration = this.config.videoDuration;

    if (interval <= 0) {
      throw new Error('Time interval must be greater than 0');
    }

    const timestamps: number[] = [];
    let currentTime = 0;

    while (currentTime < duration) {
      timestamps.push(currentTime);
      currentTime += interval;
    }

    // Add last frame if not already included
    if (timestamps[timestamps.length - 1] < duration - 0.1) {
      timestamps.push(duration - 0.1);
    }

    return timestamps;
  }

  /**
   * Get total number of frames that will be extracted
   */
  public getFrameCount(): number {
    return this.getFrameTimestamps().length;
  }

  /**
   * Create a FrameExtractor from user options
   */
  public static create(
    mode: ExtractionMode,
    videoMetadata: { duration: number; fps: number },
    options: {
      framesCount?: number;
      frameInterval?: number;
      timeInterval?: number;
    }
  ): FrameExtractor {
    const config: FrameExtractionConfig = {
      mode,
      totalFrames: Math.floor(videoMetadata.duration * videoMetadata.fps),
      videoDuration: videoMetadata.duration,
      videoFps: videoMetadata.fps,
      framesCount: options.framesCount,
      frameInterval: options.frameInterval,
      timeInterval: options.timeInterval
    };

    return new FrameExtractor(config);
  }
}

