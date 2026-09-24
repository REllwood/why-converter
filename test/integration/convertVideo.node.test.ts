import * as fs from 'fs';
import * as path from 'path';
import { convertVideo } from '../../src/index.node';
import { createTestVideo, makeTempDir, removeDir } from '../fixtures';
import { imageType, readGif } from '../helpers';

function pdfPageCount(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type \/Page[^s]/g) || []).length;
}

describe('convertVideo (Node)', () => {
  let dir: string;
  let video: string;

  beforeAll(() => {
    dir = makeTempDir();
    video = createTestVideo(path.join(dir, 'input.mp4'), { duration: 2, fps: 30, width: 320, height: 240 });
  });

  afterAll(() => removeDir(dir));

  it('reads the video metadata with ffprobe', async () => {
    const result = await convertVideo(video, {
      framesCount: 2,
      outputFormat: 'pdf',
      outputPath: path.join(dir, 'metadata.pdf')
    });

    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
    expect(result.metadata.dimensions).toEqual({ width: 320, height: 240 });
    expect(result.metadata.duration).toBeCloseTo(2, 1);
    expect(result.metadata.fps).toBe(30);
  });

  it('writes a PDF with the requested frames per page', async () => {
    const outputPath = path.join(dir, 'frames.pdf');
    const result = await convertVideo(video, {
      framesCount: 4,
      framesPerPage: 2,
      outputFormat: 'pdf',
      outputPath
    });

    expect(result.success).toBe(true);
    expect(result.outputPath).toBe(outputPath);
    expect(result.metadata.extractedFrames).toBe(4);

    const pdf = fs.readFileSync(outputPath);
    expect(pdf.toString('latin1', 0, 5)).toBe('%PDF-');
    expect(pdfPageCount(pdf)).toBe(2);
  });

  it('writes an animated GIF at the requested size', async () => {
    const outputPath = path.join(dir, 'clip.gif');
    const result = await convertVideo(video, {
      framesCount: 5,
      width: 160,
      outputFormat: 'gif',
      outputPath
    });

    expect(result.success).toBe(true);

    const gif = readGif(fs.readFileSync(outputPath));
    expect(gif.frames).toBe(5);
    expect([gif.width, gif.height]).toEqual([160, 120]);
  });

  it('writes an image sequence in the requested format', async () => {
    const outputDir = path.join(dir, 'images');
    fs.mkdirSync(outputDir);

    const result = await convertVideo(video, {
      extractionMode: 'time',
      timeInterval: 1,
      outputFormat: 'images',
      imageFormat: 'jpeg',
      outputPath: outputDir
    });

    expect(result.success).toBe(true);
    expect(result.outputPath).toBe(outputDir);

    const files = fs.readdirSync(outputDir).sort();
    expect(files[0]).toBe('frame_000000.jpeg');
    expect(files.length).toBeGreaterThanOrEqual(2);
    for (const file of files) {
      expect(imageType(fs.readFileSync(path.join(outputDir, file)))).toBe('jpeg');
    }
  });

  it('returns the PDF data when no outputPath is given', async () => {
    const result = await convertVideo(video, { framesCount: 2, outputFormat: 'pdf' });

    expect(result.success).toBe(true);
    expect(result.outputPath).toBeUndefined();
    expect(result.buffer?.toString('latin1', 0, 5)).toBe('%PDF-');
  });

  it('returns the GIF data, and the same bytes it writes to disk', async () => {
    const outputPath = path.join(dir, 'returned.gif');
    const result = await convertVideo(video, { framesCount: 3, outputFormat: 'gif', outputPath });

    expect(result.success).toBe(true);
    expect(readGif(result.buffer!).frames).toBe(3);
    expect(fs.readFileSync(outputPath).equals(result.buffer!)).toBe(true);
  });

  it('lists the images it writes', async () => {
    const result = await convertVideo(video, { framesCount: 3, outputFormat: 'images' });

    try {
      expect(result.success).toBe(true);
      expect(result.filePaths).toHaveLength(3);
      expect(result.filePaths!.map(file => path.dirname(file))).toEqual(Array(3).fill(result.outputPath));
      for (const file of result.filePaths!) {
        expect(imageType(fs.readFileSync(file))).toBe('png');
      }
    } finally {
      if (result.outputPath) removeDir(result.outputPath);
    }
  });

  it('accepts a Buffer as input', async () => {
    const outputPath = path.join(dir, 'from-buffer.pdf');
    const result = await convertVideo(fs.readFileSync(video), {
      framesCount: 2,
      outputFormat: 'pdf',
      outputPath
    });

    expect(result.success).toBe(true);
    expect(fs.existsSync(outputPath)).toBe(true);
  });

  it('reports a missing input file clearly', async () => {
    const onError = jest.fn();
    const result = await convertVideo(path.join(dir, 'missing.mp4'), { outputFormat: 'pdf', onError });

    expect(result.success).toBe(false);
    expect(result.error).toBe(`Video file not found: ${path.join(dir, 'missing.mp4')}`);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
