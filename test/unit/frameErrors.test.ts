import * as fs from 'fs';
import * as path from 'path';
import { PDFExporterNode } from '../../src/exporters/PDFExporterNode';
import { GIFExporterNode } from '../../src/exporters/GIFExporterNode';
import { ImageExporterNode } from '../../src/exporters/ImageExporterNode';
import { makeMetadata, makeOptions, solidPng } from '../helpers';
import { makeTempDir, removeDir } from '../fixtures';

function framesWithBadSecond() {
  return [solidPng(32, 24, [255, 0, 0]), Buffer.from('not an image'), solidPng(32, 24, [0, 0, 255])].map(
    (data, i) => ({ data, width: 32, height: 24, timestamp: i })
  );
}

describe('a frame that cannot be exported', () => {
  it('fails the PDF export instead of leaving a blank slot', async () => {
    const exporter = new PDFExporterNode(makeOptions({ framesPerPage: 4 }), makeMetadata());

    await expect(exporter.export(framesWithBadSecond())).rejects.toThrow(/^Failed to add frame 1 to PDF: /);
  });

  it('fails the GIF export instead of dropping the frame', async () => {
    const exporter = new GIFExporterNode(makeOptions({ outputFormat: 'gif' }), makeMetadata());

    await expect(exporter.export(framesWithBadSecond())).rejects.toThrow(/^Failed to add frame 1 to GIF: /);
  });

  it('fails the image export instead of skipping the file', async () => {
    const dir = makeTempDir();
    try {
      // A directory where the second image should go makes that write fail
      fs.mkdirSync(path.join(dir, 'frame_000001.png'));
      const exporter = new ImageExporterNode(makeOptions({ outputFormat: 'images', outputPath: dir }), makeMetadata());

      await expect(exporter.export(framesWithBadSecond())).rejects.toThrow(/^Failed to export frame 1: /);
    } finally {
      removeDir(dir);
    }
  });
});
