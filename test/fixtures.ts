import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const ffmpegPath: string = require('ffmpeg-static');

export function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'why-converter-test-'));
}

export function removeDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Render ffmpeg's colour-bar test pattern into a video file
 */
export function createTestVideo(
  outputPath: string,
  { duration = 2, fps = 30, width = 320, height = 240 } = {}
): string {
  const extension = path.extname(outputPath);
  const codec = extension === '.webm'
    ? ['-c:v', 'libvpx', '-b:v', '500k']
    : ['-c:v', 'libx264', '-pix_fmt', 'yuv420p'];

  execFileSync(ffmpegPath, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi',
    '-i', `testsrc=duration=${duration}:size=${width}x${height}:rate=${fps}`,
    ...codec,
    outputPath
  ]);

  return outputPath;
}
