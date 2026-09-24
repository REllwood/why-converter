import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import { convertVideo } from '../../src/index.node';
import { extractFrames, parseFrameRate } from '../../src/utils/node';
import { createTestVideo, makeTempDir, removeDir } from '../fixtures';

const ffmpegPath: string = require('ffmpeg-static');

function pixels(file: string): Buffer {
  return PNG.sync.read(fs.readFileSync(file)).data;
}

describe('frames near the end of a video', () => {
  let dir: string;
  let video: string;
  let lastFrame: string;

  beforeAll(() => {
    dir = makeTempDir();
    video = createTestVideo(path.join(dir, 'input.mp4'), { duration: 2, fps: 30, width: 160, height: 120 });

    // Decode the whole video, keeping only the final frame, as a reference
    lastFrame = path.join(dir, 'reference-last.png');
    execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-i', video, '-update', '1', lastFrame]);
  });

  afterAll(() => removeDir(dir));

  it('includes the real last frame in frames mode', async () => {
    const outputDir = path.join(dir, 'frames-mode');
    fs.mkdirSync(outputDir);

    const result = await convertVideo(video, { framesCount: 3, outputFormat: 'images', outputPath: outputDir });

    expect(result.error).toBeUndefined();
    expect(pixels(result.filePaths![2]).equals(pixels(lastFrame))).toBe(true);
  });

  it('falls back to the last frame when asked for a frame past the end', async () => {
    const outputDir = path.join(dir, 'past-end');
    fs.mkdirSync(outputDir);

    const [framePath] = await extractFrames(video, [5], outputDir);

    expect(pixels(framePath).equals(pixels(lastFrame))).toBe(true);
  });

  it('converts a clip shorter than the requested frame count', async () => {
    const clip = createTestVideo(path.join(dir, 'short.mp4'), { duration: 0.1, fps: 30 });
    const result = await convertVideo(clip, { framesCount: 10, outputFormat: 'gif' });

    expect(result.error).toBeUndefined();
    expect(result.metadata.extractedFrames).toBe(3);
  });
});

describe('parseFrameRate', () => {
  it.each([
    ['30/1', 30],
    ['30000/1001', 30000 / 1001],
    ['25', 25],
    ['0/0', undefined],
    ['', undefined],
    [undefined, undefined]
  ])('parses %p as %p', (rate, expected) => {
    expect(parseFrameRate(rate)).toBe(expected);
  });
});
