import { GIFExporter } from '../../src/exporters/GIFExporter';
import { ImageExporter } from '../../src/exporters/ImageExporter';
import { ConversionOptions, ImageFormat } from '../../src/core/types';
import { makeMetadata, makeOptions } from '../helpers';

class TestGIFExporter extends GIFExporter {
  async export(): Promise<Buffer> {
    return Buffer.alloc(0);
  }

  public delay() {
    return this.getFrameDelay();
  }

  public repeat() {
    return this.getRepeat();
  }

  public maxColors() {
    return this.getMaxColors();
  }
}

class TestImageExporter extends ImageExporter {
  async export(): Promise<{ files: string[] }> {
    return { files: [] };
  }

  public filename(index: number, format: ImageFormat) {
    return this.generateFilename(index, format);
  }

  public mimeType(format: ImageFormat) {
    return this.getMimeType(format);
  }
}

function gifExporter(options: Partial<ConversionOptions> = {}): TestGIFExporter {
  return new TestGIFExporter(makeOptions(options), makeMetadata());
}

describe('GIFExporter helpers', () => {
  it('converts fps to a frame delay in hundredths of a second', () => {
    expect(gifExporter({ gifFps: 10 }).delay()).toBe(10);
    expect(gifExporter({ gifFps: 25 }).delay()).toBe(4);
  });

  it('loops forever by default and passes through other repeat counts', () => {
    expect(gifExporter().repeat()).toBe(0);
    expect(gifExporter({ gifRepeat: -1 }).repeat()).toBe(-1);
    expect(gifExporter({ gifRepeat: 3 }).repeat()).toBe(3);
  });

  it('maps 1-100 quality onto a palette of 2-256 colours', () => {
    expect(gifExporter({ gifQuality: 100 }).maxColors()).toBe(256);
    expect(gifExporter({ gifQuality: 50 }).maxColors()).toBe(128);
    expect(gifExporter({ gifQuality: 1 }).maxColors()).toBe(3);
  });
});

describe('ImageExporter helpers', () => {
  const exporter = new TestImageExporter(makeOptions({ imagePrefix: 'scene_' }), makeMetadata());

  it('builds zero-padded filenames with the prefix', () => {
    expect(exporter.filename(7, 'jpeg')).toBe('scene_000007.jpeg');
  });

  it.each([
    ['png', 'image/png'],
    ['jpeg', 'image/jpeg'],
    ['webp', 'image/webp']
  ] as const)('maps %s to %s', (format, mimeType) => {
    expect(exporter.mimeType(format)).toBe(mimeType);
  });
});
