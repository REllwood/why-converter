import * as path from 'path';
import { convertVideo } from '../../src/index.node';
import { OutputFormat } from '../../src/core/types';
import { createTestVideo, makeTempDir, removeDir } from '../fixtures';

describe('progress reporting', () => {
  let dir: string;
  let video: string;

  beforeAll(() => {
    dir = makeTempDir();
    video = createTestVideo(path.join(dir, 'input.mp4'), { duration: 1 });
  });

  afterAll(() => removeDir(dir));

  it.each<OutputFormat>(['pdf', 'gif', 'images'])('only moves forward from 0 to 100 for %s', async outputFormat => {
    const progress: number[] = [];
    const result = await convertVideo(video, {
      framesCount: 4,
      outputFormat,
      outputPath: outputFormat === 'images' ? dir : undefined,
      onProgress: value => progress.push(value)
    });

    expect(result.error).toBeUndefined();
    expect(progress[0]).toBe(0);
    expect(progress[progress.length - 1]).toBe(100);
    expect(progress.filter(value => value === 100)).toHaveLength(1);
    for (let i = 1; i < progress.length; i++) {
      expect(progress[i]).toBeGreaterThan(progress[i - 1]);
    }
  });
});
