import { GIFExporterNode } from '../../src/exporters/GIFExporterNode';
import { ConversionOptions } from '../../src/core/types';
import { makeMetadata, makeOptions, readGif, solidPng } from '../helpers';

function frames(count: number, width = 64, height = 48) {
  const colours: Array<[number, number, number]> = [[255, 0, 0], [0, 255, 0], [0, 0, 255]];
  return Array.from({ length: count }, (_, i) => ({
    data: solidPng(width, height, colours[i % colours.length]),
    width,
    height,
    timestamp: i
  }));
}

function exporter(options: Partial<ConversionOptions> = {}) {
  return new GIFExporterNode(makeOptions({ outputFormat: 'gif', ...options }), makeMetadata());
}

describe('GIFExporterNode', () => {
  it('encodes every frame into an animated GIF', async () => {
    const gif = readGif(await exporter().export(frames(3)));

    expect(gif.header).toBe('GIF89a');
    expect(gif.frames).toBe(3);
    expect(gif.width).toBe(64);
    expect(gif.height).toBe(48);
  });

  it('uses the configured frame rate and loops forever by default', async () => {
    const gif = readGif(await exporter({ gifFps: 20 }).export(frames(2)));

    expect(gif.delays).toEqual([5, 5]);
    expect(gif.loopCount).toBe(0);
  });

  it('plays once when gifRepeat is -1', async () => {
    const gif = readGif(await exporter({ gifRepeat: -1 }).export(frames(2)));

    expect(gif.loopCount).toBeUndefined();
  });

  it('sizes the GIF from the decoded pixels', async () => {
    const mislabelled = frames(2, 40, 30).map(frame => ({ ...frame, width: 999, height: 999 }));
    const gif = readGif(await exporter().export(mislabelled));

    expect([gif.width, gif.height]).toEqual([40, 30]);
  });

  it('rejects an empty frame list', async () => {
    await expect(exporter().export([])).rejects.toThrow('No frames to export');
  });
});
