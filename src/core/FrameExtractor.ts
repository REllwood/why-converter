import { FrameExtractionConfig, ExtractionMode } from './types';

/**
 * Frame rate to assume when the video doesn't report a usable one
 */
const FALLBACK_FPS = 30;

/**
 * Round a time to the microsecond, the precision ffmpeg seeks with, so
 * floating point noise such as 0.8999999999999999 becomes 0.9
 */
function roundTime(seconds: number): number {
  return Math.round(seconds * 1e6) / 1e6;
}

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
   *
   * Timestamps are in ascending order, never repeat, and never go past the
   * start of the last frame (seeking any later finds nothing to decode).
   */
  public getFrameTimestamps(): number[] {
    const duration = this.config.videoDuration;
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error(`Cannot pick frames because the video's duration is unknown or zero (got ${duration})`);
    }

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
   * The video's frame rate, or a fallback when it isn't usable
   */
  private get fps(): number {
    const fps = this.config.videoFps;
    return Number.isFinite(fps) && fps > 0 ? fps : FALLBACK_FPS;
  }

  /**
   * Number of whole frames in the video (always at least one)
   */
  private get frameTotal(): number {
    return Math.max(1, Math.floor(this.config.videoDuration * this.fps));
  }

  /**
   * Time at which the last frame starts
   */
  private get lastFrameTime(): number {
    // Round down so rounding can never land just past the last frame
    return Math.max(0, Math.floor((this.config.videoDuration - 1 / this.fps) * 1e6) / 1e6);
  }

  /**
   * Extract N frames evenly distributed from the first frame to the last.
   * Asking for more frames than the video has returns every frame once.
   */
  private getTimestampsByFrameCount(): number[] {
    const requested = this.config.framesCount !== undefined ? this.config.framesCount : 10;

    if (requested <= 0) {
      throw new Error('Frame count must be greater than 0');
    }

    const count = Math.min(requested, this.frameTotal);

    if (count === 1) {
      // Single frame from the middle
      return [Math.min(this.config.videoDuration / 2, this.lastFrameTime)];
    }

    const step = this.lastFrameTime / (count - 1);
    return Array.from({ length: count }, (_, i) => Math.min(roundTime(i * step), this.lastFrameTime));
  }

  /**
   * Extract every Nth frame
   */
  private getTimestampsByFrameInterval(): number[] {
    const interval = this.config.frameInterval !== undefined ? this.config.frameInterval : 30;

    if (interval <= 0) {
      throw new Error('Frame interval must be greater than 0');
    }

    const timestamps: number[] = [];
    for (let frameIndex = 0; frameIndex < this.frameTotal; frameIndex += interval) {
      timestamps.push(Math.min(roundTime(frameIndex / this.fps), this.lastFrameTime));
    }

    return timestamps;
  }

  /**
   * Extract one frame every N seconds, starting at 0
   */
  private getTimestampsByTimeInterval(): number[] {
    const interval = this.config.timeInterval ?? 1;

    if (interval <= 0) {
      throw new Error('Time interval must be greater than 0');
    }

    const timestamps: number[] = [];

    // Multiply rather than add, so floating point error doesn't build up
    for (let i = 0; i * interval < this.config.videoDuration; i++) {
      const timestamp = Math.min(roundTime(i * interval), this.lastFrameTime);
      if (timestamps.length === 0 || timestamp > timestamps[timestamps.length - 1]) {
        timestamps.push(timestamp);
      }
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
