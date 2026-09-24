import * as fs from 'fs';
import * as path from 'path';
import { convertVideo } from '../../src/index.node';
import { createTempDir, cleanupTempDir } from '../../src/utils/node';
import { createTestVideo, makeTempDir, removeDir } from '../fixtures';
import { readGif } from '../helpers';

describe('temporary directories', () => {
  it('are unique even when created in the same millisecond', () => {
    const dirs = [createTempDir(), createTempDir(), createTempDir()];

    try {
      expect(new Set(dirs).size).toBe(3);
      for (const dir of dirs) {
        expect(fs.statSync(dir).isDirectory()).toBe(true);
      }
    } finally {
      dirs.forEach(cleanupTempDir);
    }
  });

  it('keep parallel conversions apart', async () => {
    const dir = makeTempDir();

    try {
      const sizes = [
        { width: 320, height: 240 },
        { width: 160, height: 120 },
        { width: 240, height: 160 }
      ];
      const inputs = sizes.map((size, i) =>
        fs.readFileSync(createTestVideo(path.join(dir, `input-${i}.mp4`), { duration: 1, ...size }))
      );

      // Buffer inputs make every conversion create its temp directory straight away
      const results = await Promise.all(
        inputs.map(input => convertVideo(input, { framesCount: 4, outputFormat: 'gif' }))
      );

      results.forEach((result, i) => {
        expect(result.error).toBeUndefined();
        const gif = readGif(result.buffer!);
        expect(gif.frames).toBe(4);
        expect([gif.width, gif.height]).toEqual([sizes[i].width, sizes[i].height]);
      });
    } finally {
      removeDir(dir);
    }
  });
});
