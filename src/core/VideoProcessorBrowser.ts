import { VideoProcessor } from './VideoProcessor';
import { VideoInput, VideoMetadata, ConversionOptions } from './types';
import * as browserUtils from '../utils/browser';

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

    // Get video metadata
    const metadata = browserUtils.getVideoMetadata(this.video);

    // Calculate total frames (approximate)
    const totalFrames = Math.floor(metadata.duration * metadata.fps);

    this.metadata = {
      totalFrames,
      extractedFrames: 0,
      duration: metadata.duration,
      dimensions: {
        width: metadata.width,
        height: metadata.height
      },
      fps: metadata.fps,
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
      this.video.pause();
      this.video.src = '';
      this.video.load();
      this.video = null;
    }

    if (this.shouldRevokeUrl && this.videoUrl) {
      URL.revokeObjectURL(this.videoUrl);
      this.videoUrl = null;
    }
  }
}

