import * as fs from 'fs';
import * as path from 'path';
import { ImageExporterNode } from '../../src/exporters/ImageExporterNode';
import { makeMetadata, makeOptions } from '../helpers';
import { makeTempDir, removeDir } from '../fixtures';

describe('ImageExporterNode', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
  });

  afterEach(() => removeDir(dir));

  it('writes the already-encoded frames with sequential names', async () => {
    const exporter = new ImageExporterNode(
      makeOptions({ outputFormat: 'images', imageFormat: 'jpeg', imagePrefix: 'shot_', outputPath: dir }),
      makeMetadata()
    );
    const frames = [Buffer.from('first'), Buffer.from('second')].map((data, i) => ({
      data,
      width: 1,
      height: 1,
      timestamp: i
    }));

    const result = await exporter.export(frames);

    expect(result.directory).toBe(dir);
    expect(result.files).toEqual([path.join(dir, 'shot_000000.jpeg'), path.join(dir, 'shot_000001.jpeg')]);
    expect(fs.readFileSync(result.files[1], 'utf8')).toBe('second');
  });
});
