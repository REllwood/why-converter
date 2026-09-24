import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import { ImageFormat } from '../core/types';

/**
 * Load an optional package, returning undefined when it isn't installed
 */
function optionalRequire<T>(name: string): T | undefined {
  try {
    return require(name);
  } catch {
    return undefined;
  }
}

/**
 * Check a binary exists and can be run. The optional packages download or
 * chmod their binaries in install scripts, which some package managers skip.
 */
function isExecutable(filePath: string | null | undefined): filePath is string {
  if (!filePath) {
    return false;
  }
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Point fluent-ffmpeg at the binaries from the optional ffmpeg-static and
 * @ffprobe-installer/ffprobe packages when they are installed. FFMPEG_PATH and
 * FFPROBE_PATH take precedence, and otherwise fluent-ffmpeg searches the PATH.
 */
function configureBinaries(): void {
  if (!process.env.FFMPEG_PATH) {
    const ffmpegStatic = optionalRequire<string | null>('ffmpeg-static');
    if (isExecutable(ffmpegStatic)) {
      ffmpeg.setFfmpegPath(ffmpegStatic);
    }
  }

  if (!process.env.FFPROBE_PATH) {
    const ffprobeInstaller = optionalRequire<{ path?: string }>('@ffprobe-installer/ffprobe');
    if (isExecutable(ffprobeInstaller?.path)) {
      ffmpeg.setFfprobePath(ffprobeInstaller.path);
    }
  }
}

configureBinaries();

const MISSING_BINARY_HELP: Record<'ffmpeg' | 'ffprobe', string> = {
  ffmpeg:
    'ffmpeg was not found. Install ffmpeg on your system, install the optional ' +
    '"ffmpeg-static" package, or set the FFMPEG_PATH environment variable.',
  ffprobe:
    'ffprobe was not found. Install ffmpeg on your system (it includes ffprobe), install the ' +
    'optional "@ffprobe-installer/ffprobe" package, or set the FFPROBE_PATH environment variable.'
};

/**
 * Replace fluent-ffmpeg's "binary not found" errors with instructions for fixing them
 */
export function describeFfmpegError(error: Error, binary: 'ffmpeg' | 'ffprobe'): string {
  if (/Cannot find (ffmpeg|ffprobe)|spawn \S+ ENOENT/.test(error.message)) {
    return MISSING_BINARY_HELP[binary];
  }
  return error.message;
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
        reject(new Error(`Failed to get video metadata: ${describeFfmpegError(err, 'ffprobe')}`));
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
 * Map 1-100 quality onto ffmpeg's JPEG qscale, which runs from 2 (best) to 31 (worst)
 */
export function jpegQscale(quality: number): number {
  return Math.round(2 + ((100 - quality) * 29) / 99);
}

/**
 * ffmpeg output options for encoding a single frame in the given format
 */
function frameEncodingOptions(format: ImageFormat, quality: number): string[] {
  switch (format) {
    case 'jpeg':
      return ['-q:v', String(jpegQscale(quality))];
    case 'webp':
      return ['-c:v', 'libwebp', '-quality', String(quality)];
    default:
      return [];
  }
}

/**
 * Extract frames from video at specific timestamps
 */
export function extractFrames(
  videoPath: string,
  timestamps: number[],
  outputDir: string,
  options: { width?: number; height?: number; format?: ImageFormat; quality?: number } = {}
): Promise<string[]> {
  const format = options.format || 'png';
  const encodingOptions = frameEncodingOptions(format, options.quality ?? 90);

  return new Promise((resolve, reject) => {
    const outputPaths: string[] = [];
    let currentIndex = 0;

    const processNext = () => {
      if (currentIndex >= timestamps.length) {
        resolve(outputPaths);
        return;
      }

      const timestamp = timestamps[currentIndex];
      const outputPath = path.join(outputDir, `frame_${currentIndex.toString().padStart(6, '0')}.${format}`);
      outputPaths.push(outputPath);

      let command = ffmpeg(videoPath)
        .seekInput(timestamp)
        .frames(1)
        .outputOptions(['-update', '1', ...encodingOptions])
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
          reject(new Error(`Failed to extract frame at ${timestamp}s: ${describeFfmpegError(err, 'ffmpeg')}`));
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

