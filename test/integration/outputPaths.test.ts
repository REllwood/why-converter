import * as fs from 'fs';
import * as path from 'path';
import { convertVideo } from '../../src/index.node';
import { createTestVideo, makeTempDir, removeDir } from '../fixtures';

describe('outputPath handling', () => {
  let dir: string;
  let video: string;

  beforeAll(() => {
    dir = makeTempDir();
    video = createTestVideo(path.join(dir, 'input.mp4'), { duration: 1 });
  });

  afterAll(() => removeDir(dir));

  it('creates a missing directory for an image sequence and writes into it', async () => {
    const outputDir = path.join(dir, 'new', 'frames');
    const result = await convertVideo(video, { framesCount: 2, outputFormat: 'images', outputPath: outputDir });

    expect(result.error).toBeUndefined();
    expect(result.outputPath).toBe(outputDir);
    expect(fs.readdirSync(outputDir).sort()).toEqual(['frame_000000.png', 'frame_000001.png']);
  });

  it('refuses to use an existing file as the image directory', async () => {
    const file = path.join(dir, 'not-a-directory.txt');
    fs.writeFileSync(file, 'keep me');

    const result = await convertVideo(video, { framesCount: 2, outputFormat: 'images', outputPath: file });

    expect(result.success).toBe(false);
    expect(result.error).toBe(`outputPath must be a directory for image sequences, but ${file} is a file`);
    expect(fs.readFileSync(file, 'utf8')).toBe('keep me');
  });

  it('creates missing parent directories for a PDF', async () => {
    const outputPath = path.join(dir, 'reports', '2026', 'video.pdf');
    const result = await convertVideo(video, { framesCount: 2, outputFormat: 'pdf', outputPath });

    expect(result.error).toBeUndefined();
    expect(result.outputPath).toBe(outputPath);
    expect(fs.existsSync(outputPath)).toBe(true);
  });

  it('writes output.gif into a directory given with a trailing slash', async () => {
    const outputDir = path.join(dir, 'gifs') + path.sep;
    const result = await convertVideo(video, { framesCount: 2, outputFormat: 'gif', outputPath: outputDir });

    expect(result.error).toBeUndefined();
    expect(result.outputPath).toBe(path.join(outputDir, 'output.gif'));
    expect(fs.existsSync(result.outputPath!)).toBe(true);
  });

  it('writes output.pdf into an existing directory', async () => {
    const outputDir = path.join(dir, 'existing');
    fs.mkdirSync(outputDir);

    const result = await convertVideo(video, { framesCount: 2, outputFormat: 'pdf', outputPath: outputDir });

    expect(result.outputPath).toBe(path.join(outputDir, 'output.pdf'));
  });
});
