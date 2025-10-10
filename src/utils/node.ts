import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import ffmpeg from 'fluent-ffmpeg';

let ffmpegPath: string | undefined;

// Try to use ffmpeg-static if available
try {
  const ffmpegStatic = require('ffmpeg-static');
  if (ffmpegStatic && typeof ffmpegStatic === 'string') {
    ffmpegPath = ffmpegStatic;
    ffmpeg.setFfmpegPath(ffmpegPath);
  }
} catch (e) {
  // ffmpeg-static not available, will try to use system ffmpeg
  console.warn('ffmpeg-static not found, using system ffmpeg');
}

/**
 * Create a temporary directory for frame extraction
 */
export function createTempDir(): string {
  const tempDir = path.join(os.tmpdir(), `video-converter-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

/**
 * Clean up temporary directory
 */
export function cleanupTempDir(tempDir: string): void {
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error('Failed to cleanup temp directory:', error);
  }
}

/**
 * Get video metadata using ffmpeg
 */
export function getVideoMetadata(videoPath: string): Promise<{
  duration: number;
  width: number;
  height: number;
  fps: number;
  format: string;
}> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to get video metadata: ${err.message}`));
        return;
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      if (!videoStream) {
        reject(new Error('No video stream found'));
        return;
      }

      // Parse FPS from r_frame_rate (e.g., "30/1" or "30000/1001")
      let fps = 30; // default
      if (videoStream.r_frame_rate) {
        const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
        fps = num / den;
      }

      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        fps,
        format: metadata.format.format_name || 'unknown'
      });
    });
  });
}

/**
 * Extract frames from video at specific timestamps
 */
export function extractFrames(
  videoPath: string,
  timestamps: number[],
  outputDir: string,
  options: { width?: number; height?: number; quality?: number } = {}
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const outputPaths: string[] = [];
    let currentIndex = 0;

    const processNext = () => {
      if (currentIndex >= timestamps.length) {
        resolve(outputPaths);
        return;
      }

      const timestamp = timestamps[currentIndex];
      const outputPath = path.join(outputDir, `frame_${currentIndex.toString().padStart(6, '0')}.png`);
      outputPaths.push(outputPath);

      let command = ffmpeg(videoPath)
        .seekInput(timestamp)
        .frames(1)
        .output(outputPath);

      // Apply size options
      if (options.width && options.height) {
        command = command.size(`${options.width}x${options.height}`);
      } else if (options.width) {
        command = command.size(`${options.width}x?`);
      } else if (options.height) {
        command = command.size(`?x${options.height}`);
      }

      command
        .on('end', () => {
          currentIndex++;
          processNext();
        })
        .on('error', (err) => {
          reject(new Error(`Failed to extract frame at ${timestamp}s: ${err.message}`));
        })
        .run();
    };

    processNext();
  });
}

/**
 * Read file as buffer
 */
export function readFileAsBuffer(filePath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * Write buffer to file
 */
export function writeBufferToFile(filePath: string, buffer: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, buffer, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Ensure directory exists
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Check if path is a file
 */
export function isFile(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/**
 * Check if path is a directory
 */
export function isDirectory(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

