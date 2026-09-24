import * as fs from 'fs';
import * as path from 'path';
import { extractFrames, jpegQscale } from '../../src/utils/node';
import { createTestVideo, makeTempDir, removeDir } from '../fixtures';
import { imageType } from '../helpers';

describe('ffmpeg frame extraction', () => {
  let dir: string;
  let video: string;

  beforeAll(() => {
    dir = makeTempDir();
    video = createTestVideo(path.join(dir, 'input.mp4'));
  });

  afterAll(() => removeDir(dir));

  it.each(['png', 'jpeg', 'webp'] as const)('writes %s frames', async format => {
    const outputDir = path.join(dir, format);
    fs.mkdirSync(outputDir);

    const paths = await extractFrames(video, [0, 1], outputDir, { format, quality: 80 });

    expect(paths).toHaveLength(2);
    for (const framePath of paths) {
      expect(imageType(fs.readFileSync(framePath))).toBe(format);
    }
  });

  it('resizes frames', async () => {
    const outputDir = path.join(dir, 'resized');
    fs.mkdirSync(outputDir);

    const [framePath] = await extractFrames(video, [0.5], outputDir, { width: 160, height: 120 });
    const png = fs.readFileSync(framePath);

    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([160, 120]);
  });
});

describe('jpegQscale', () => {
  it('maps 1-100 quality onto qscale 31-2', () => {
    expect(jpegQscale(100)).toBe(2);
    expect(jpegQscale(1)).toBe(31);
    expect(jpegQscale(90)).toBe(5);
  });
});
