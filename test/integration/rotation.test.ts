import * as fs from 'fs';
import * as path from 'path';
import { convertVideo } from '../../src/index.node';
import { videoRotation } from '../../src/utils/node';
import { createTestVideo, makeTempDir, removeDir } from '../fixtures';
import { readGif } from '../helpers';

function pngSize(file: string): [number, number] {
  const png = fs.readFileSync(file);
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

describe('videos recorded with a rotation flag', () => {
  let dir: string;
  let portrait: string;

  beforeAll(() => {
    dir = makeTempDir();
    // Stored as 320x240 landscape, displayed as 240x320 portrait
    portrait = createTestVideo(path.join(dir, 'portrait.mp4'), { duration: 1, width: 320, height: 240, rotation: 90 });
  });

  afterAll(() => removeDir(dir));

  it('reports the dimensions as displayed', async () => {
    const outputDir = path.join(dir, 'full-size');
    const result = await convertVideo(portrait, { framesCount: 1, outputFormat: 'images', outputPath: outputDir });

    expect(result.error).toBeUndefined();
    expect(result.metadata.dimensions).toEqual({ width: 240, height: 320 });
    expect(pngSize(result.filePaths![0])).toEqual([240, 320]);
  });

  it('resizes without distorting the picture', async () => {
    const result = await convertVideo(portrait, { framesCount: 2, width: 120, outputFormat: 'gif' });

    expect(result.error).toBeUndefined();
    const gif = readGif(result.buffer!);
    expect([gif.width, gif.height]).toEqual([120, 160]);
  });
});

describe('videoRotation', () => {
  it.each([
    [{ rotation: 90 }, 90],
    [{ rotation: '-90' }, -90],
    [{ tags: { rotate: '270' } }, 270],
    [{ rotation: 'N/A' }, 0],
    [{}, 0]
  ])('reads %j as %i degrees', (stream, expected) => {
    expect(videoRotation(stream)).toBe(expected);
  });
});
