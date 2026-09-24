import { VideoProcessor } from './VideoProcessor';
import { VideoInput, VideoMetadata, ConversionOptions } from './types';
import * as browserUtils from '../utils/browser';

/**
 * Frame rate to assume when it hasn't been measured
 */
const ASSUMED_FPS = 30;

/**
 * Browser implementation of VideoProcessor using HTML5 Video API
 */
export class VideoProcessorBrowser extends VideoProcessor {
  private video: HTMLVideoElement | null = null;
  private videoUrl: string | null = null;
  private shouldRevokeUrl: boolean = false;

  constructor(options: ConversionOptions) {
    super(options);
  }

  /**
   * Load video and get metadata
   */
  async loadVideo(input: VideoInput): Promise<VideoMetadata> {
    // Check browser support
    const support = browserUtils.checkBrowserSupport();
    if (!support.supported) {
      throw new Error(`Browser missing required features: ${support.missing.join(', ')}`);
    }

    // Load video based on input type
    if (typeof input === 'string') {
      this.video = await browserUtils.loadVideo(input);
      this.videoUrl = input;
      this.shouldRevokeUrl = false;
    } else if (input instanceof File || input instanceof Blob) {
      this.video = await browserUtils.loadVideo(input);
      this.videoUrl = this.video.src;
      this.shouldRevokeUrl = true;
    } else {
      throw new Error('Unsupported input type for browser environment');
    }

    // Recordings without a stored duration report Infinity until reaching the end
    await browserUtils.ensureDuration(this.video);

    // Get video metadata
    const metadata = browserUtils.getVideoMetadata(this.video);

    // Browsers don't expose the frame rate. Measuring it means briefly playing
    // the video, so only do it when it matters: picking every Nth frame.
    const measuredFps = this.options.extractionMode === 'interval'
      ? await browserUtils.estimateFrameRate(this.video)
      : undefined;
    const fps = measuredFps ?? ASSUMED_FPS;

    // Calculate total frames (approximate unless the frame rate was measured)
    const totalFrames = Math.floor(metadata.duration * fps);

    this.metadata = {
      totalFrames,
      extractedFrames: 0,
      duration: metadata.duration,
      dimensions: {
        width: metadata.width,
        height: metadata.height
      },
      fps,
      format: 'unknown' // Browser can't easily detect format
    };

    return this.metadata;
  }

  /**
   * Extract frames from video using Canvas API
   */
  async extractFrames(
    timestamps: number[],
    options?: { width?: number; height?: number }
  ): Promise<Array<{ data: Blob; width: number; height: number; timestamp: number }>> {
    if (!this.video) {
      throw new Error('Video not loaded');
    }

    const frames: Array<{ data: Blob; width: number; height: number; timestamp: number }> = [];

    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i];
      const frame = await browserUtils.extractFrame(this.video, timestamp, options);
      
      frames.push({
        data: frame.data,
        width: frame.width,
        height: frame.height,
        timestamp
      });

      // Report progress
      if (this.options.onProgress) {
        const progress = ((i + 1) / timestamps.length) * 50; // 0-50% for extraction
        this.options.onProgress(progress);
      }
    }

    return frames;
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.video) {
      // Removing the source (rather than setting it to '') releases the media
      // without the element reporting an error
      this.video.pause();
      this.video.removeAttribute('src');
      this.video.load();
      this.video = null;
    }

    if (this.shouldRevokeUrl && this.videoUrl) {
      URL.revokeObjectURL(this.videoUrl);
      this.videoUrl = null;
    }
  }
}

