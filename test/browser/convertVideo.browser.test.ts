import * as path from 'path';
import { createTestVideo, makeTempDir, removeDir } from '../fixtures';
import { imageType, readGif } from '../helpers';
import { BrowserHarness, convertInBrowser, startBrowser } from './harness';

function pdfPageCount(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type \/Page[^s]/g) || []).length;
}

describe('convertVideo (browser)', () => {
  let dir: string;
  let harness: BrowserHarness;

  beforeAll(async () => {
    dir = makeTempDir();
    const video = createTestVideo(path.join(dir, 'input.webm'), { duration: 2, fps: 30, width: 320, height: 240 });
    harness = await startBrowser({ '/input.webm': video });
  });

  afterAll(async () => {
    await harness?.close();
    removeDir(dir);
  });

  it('converts to a PDF', async () => {
    const result = await convertInBrowser(harness.page, '/input.webm', {
      framesCount: 4,
      framesPerPage: 2,
      outputFormat: 'pdf'
    });

    expect(result.error).toBeUndefined();
    expect(result.metadata.dimensions).toEqual({ width: 320, height: 240 });
    expect(result.metadata.extractedFrames).toBe(4);

    const pdf = Buffer.from(result.blob!.base64, 'base64');
    expect(pdf.toString('latin1', 0, 5)).toBe('%PDF-');
    expect(pdfPageCount(pdf)).toBe(2);
  });

  it('compresses the frames in a PDF', async () => {
    const result = await convertInBrowser(harness.page, '/input.webm', { framesCount: 4, outputFormat: 'pdf' });
    const pdf = Buffer.from(result.blob!.base64, 'base64');

    // Four uncompressed 320x240 RGB frames alone would be 921,600 bytes
    expect(pdf.length).toBeLessThan(250_000);
  });

  it('converts to an animated GIF without loading anything from another site', async () => {
    const result = await convertInBrowser(harness.page, '/input.webm', {
      framesCount: 5,
      width: 160,
      gifFps: 20,
      outputFormat: 'gif'
    });

    expect(result.error).toBeUndefined();
    expect(result.blob!.type).toBe('image/gif');

    const gif = readGif(Buffer.from(result.blob!.base64, 'base64'));
    expect(gif.frames).toBe(5);
    expect([gif.width, gif.height]).toEqual([160, 120]);
    expect(gif.delays).toEqual([5, 5, 5, 5, 5]);
    expect(gif.loopCount).toBe(0);

    // blob: URLs are the page's own in-memory data; only network requests matter here
    const otherSites = harness.requests.filter(url => /^https?:/.test(url) && !url.startsWith(harness.baseUrl));
    expect(otherSites).toEqual([]);
  });

  it('converts to JPEG images', async () => {
    const result = await convertInBrowser(harness.page, '/input.webm', {
      framesCount: 3,
      outputFormat: 'images',
      imageFormat: 'jpeg'
    });

    expect(result.error).toBeUndefined();
    expect(result.files!.map(file => file.name)).toEqual([
      'frame_000000.jpeg',
      'frame_000001.jpeg',
      'frame_000002.jpeg'
    ]);
    for (const file of result.files!) {
      expect(file.type).toBe('image/jpeg');
      expect(imageType(Buffer.from(file.base64, 'base64'))).toBe('jpeg');
    }
  });

  it('reports progress from 0 to 100 without going backwards', async () => {
    const result = await convertInBrowser(harness.page, '/input.webm', { framesCount: 3, outputFormat: 'gif' });

    expect(result.error).toBeUndefined();
    expect(result.progress[0]).toBe(0);
    expect(result.progress[result.progress.length - 1]).toBe(100);
    for (let i = 1; i < result.progress.length; i++) {
      expect(result.progress[i]).toBeGreaterThan(result.progress[i - 1]);
    }
  });

  it('can be called as WhyConverter.convertVideo', async () => {
    const result = await convertInBrowser(harness.page, '/input.webm', { framesCount: 2 }, 'named');

    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
  });
});
