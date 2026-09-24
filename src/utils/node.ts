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
 * Create a uniquely named temporary directory for frame extraction
 */
export function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'why-converter-'));
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
 * Return a value as a number if it is finite and above zero
 */
function positiveNumber(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

/**
 * Parse an ffprobe frame rate such as "30/1" or "30000/1001" ("0/0" means unknown)
 */
export function parseFrameRate(rate: string | undefined): number | undefined {
  if (!rate) {
    return undefined;
  }
  const [numerator, denominator = '1'] = rate.split('/');
  return positiveNumber(Number(numerator) / Number(denominator));
}

/**
 * Rotation of a video stream in degrees. Newer ffmpeg reports it as display
 * matrix side data (which fluent-ffmpeg flattens to `rotation`), older
 * versions as a `rotate` tag.
 */
export function videoRotation(stream: { rotation?: unknown; tags?: { rotate?: unknown } }): number {
  const degrees = Number(stream.rotation ?? stream.tags?.rotate ?? 0);
  return Number.isFinite(degrees) ? degrees : 0;
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

      // avg_frame_rate is the real rate for variable frame rate video, where
      // r_frame_rate is only the timebase; fall back to 30 if neither is usable
      const fps = parseFrameRate(videoStream.avg_frame_rate) ?? parseFrameRate(videoStream.r_frame_rate) ?? 30;

      // Phone videos are often stored sideways with a rotation flag. ffmpeg turns
      // frames upright when decoding, so report the dimensions as displayed.
      const storedWidth = videoStream.width || 0;
      const storedHeight = videoStream.height || 0;
      const quarterTurn = Math.abs(videoRotation(videoStream)) % 180 === 90;

      resolve({
        duration: positiveNumber(metadata.format.duration) ?? positiveNumber(videoStream.duration) ?? 0,
        width: quarterTurn ? storedHeight : storedWidth,
        height: quarterTurn ? storedWidth : storedHeight,
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
 * Run ffmpeg to write a single frame, either at a timestamp or the video's last frame
 */
function writeFrame(
  videoPath: string,
  outputPath: string,
  position: { seek: number } | { lastFrame: true },
  size: { width?: number; height?: number },
  encodingOptions: string[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(videoPath);

    if ('seek' in position) {
      command = command.seekInput(position.seek).frames(1);
    } else {
      // Decode the final second, overwriting the output with each frame, so the last one remains
      command = command.inputOptions(['-sseof', '-1']);
    }

    command = command.outputOptions(['-update', '1', ...encodingOptions]).output(outputPath);

    // Apply size options
    if (size.width && size.height) {
      command = command.size(`${size.width}x${size.height}`);
    } else if (size.width) {
      command = command.size(`${size.width}x?`);
    } else if (size.height) {
      command = command.size(`?x${size.height}`);
    }

    command
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

/**
 * Extract frames from video at specific timestamps
 */
export async function extractFrames(
  videoPath: string,
  timestamps: number[],
  outputDir: string,
  options: {
    width?: number;
    height?: number;
    format?: ImageFormat;
    quality?: number;
    onFrame?: (index: number) => void;
  } = {}
): Promise<string[]> {
  const format = options.format || 'png';
  const encodingOptions = frameEncodingOptions(format, options.quality ?? 90);
  const outputPaths: string[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const timestamp = timestamps[i];
    const outputPath = path.join(outputDir, `frame_${i.toString().padStart(6, '0')}.${format}`);

    try {
      await writeFrame(videoPath, outputPath, { seek: timestamp }, options, encodingOptions);

      // ffmpeg finds nothing to decode when seeking at or past the final frame,
      // which can happen with rounding or variable frame rates; use the last frame
      if (!fs.existsSync(outputPath)) {
        await writeFrame(videoPath, outputPath, { lastFrame: true }, options, encodingOptions);
      }
    } catch (error) {
      throw new Error(`Failed to extract frame at ${timestamp}s: ${describeFfmpegError(error as Error, 'ffmpeg')}`);
    }

    if (!fs.existsSync(outputPath)) {
      throw new Error(`Failed to extract frame at ${timestamp}s: ffmpeg could not decode a frame there`);
    }

    outputPaths.push(outputPath);
    options.onFrame?.(i);
  }

  return outputPaths;
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
 * Work out the file to write for a single-file output and create its directory.
 * An existing directory, or a path ending in a separator, gets defaultName inside it.
 */
export function prepareOutputFile(outputPath: string, defaultName: string): string {
  const isDirectoryPath = isDirectory(outputPath) || /[\\/]$/.test(outputPath);
  const filePath = isDirectoryPath ? path.join(outputPath, defaultName) : outputPath;
  ensureDir(path.dirname(filePath));
  return filePath;
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

