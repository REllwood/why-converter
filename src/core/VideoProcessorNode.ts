import { VideoProcessor } from './VideoProcessor';
import { VideoInput, VideoMetadata, ConversionOptions } from './types';
import * as nodeUtils from '../utils/node';
import * as path from 'path';

/**
 * Node.js implementation of VideoProcessor using ffmpeg
 */
export class VideoProcessorNode extends VideoProcessor {
  private videoPath: string | null = null;
  private tempDir: string | null = null;
  private isTemporaryFile: boolean = false;

  constructor(options: ConversionOptions) {
    super(options);
  }

  /**
   * Load video and get metadata
   */
  async loadVideo(input: VideoInput): Promise<VideoMetadata> {
    // Handle different input types
    if (typeof input === 'string') {
      this.videoPath = input;
      this.isTemporaryFile = false;
    } else if (Buffer.isBuffer(input)) {
      // Save buffer to temporary file
      this.tempDir = nodeUtils.createTempDir();
      this.videoPath = path.join(this.tempDir, 'input_video.mp4');
      await nodeUtils.writeBufferToFile(this.videoPath, input);
      this.isTemporaryFile = true;
    } else {
      throw new Error('Unsupported input type for Node.js environment');
    }

    // Get video metadata using ffmpeg
    const metadata = await nodeUtils.getVideoMetadata(this.videoPath);

    // Calculate total frames
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
      format: metadata.format
    };

    return this.metadata;
  }

  /**
   * Extract frames from video using ffmpeg
   */
  async extractFrames(
    timestamps: number[],
    options?: { width?: number; height?: number }
  ): Promise<Array<{ data: Buffer; width: number; height: number; timestamp: number }>> {
    if (!this.videoPath) {
      throw new Error('Video not loaded');
    }

    // Create temp directory for frames if not exists
    if (!this.tempDir) {
      this.tempDir = nodeUtils.createTempDir();
    }

    const framesDir = path.join(this.tempDir, 'frames');
    nodeUtils.ensureDir(framesDir);

    // Extract frames using ffmpeg
    const framePaths = await nodeUtils.extractFrames(
      this.videoPath,
      timestamps,
      framesDir,
      options
    );

    // Read frames into memory
    const frames: Array<{ data: Buffer; width: number; height: number; timestamp: number }> = [];

    for (let i = 0; i < framePaths.length; i++) {
      const framePath = framePaths[i];
      const data = await nodeUtils.readFileAsBuffer(framePath);
      
      frames.push({
        data,
        width: options?.width || this.metadata!.dimensions.width,
        height: options?.height || this.metadata!.dimensions.height,
        timestamp: timestamps[i]
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
   * Clean up temporary files and directories
   */
  async cleanup(): Promise<void> {
    if (this.tempDir) {
      nodeUtils.cleanupTempDir(this.tempDir);
      this.tempDir = null;
    }
    
    if (this.isTemporaryFile && this.videoPath) {
      this.videoPath = null;
    }
  }
}

