import { PNG } from 'pngjs';
import { DEFAULT_CONFIG } from '../src/config';
import { ConversionOptions, VideoMetadata } from '../src/core/types';

export function makeOptions(overrides: Partial<ConversionOptions> = {}): ConversionOptions {
  return { ...DEFAULT_CONFIG, ...overrides };
}

export function makeMetadata(overrides: Partial<VideoMetadata> = {}): VideoMetadata {
  return {
    totalFrames: 300,
    extractedFrames: 0,
    duration: 10,
    dimensions: { width: 1920, height: 1080 },
    fps: 30,
    ...overrides
  };
}

/**
 * Encode a single-colour PNG
 */
export function solidPng(width: number, height: number, [r, g, b]: [number, number, number]): Buffer {
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height; i++) {
    png.data[i * 4] = r;
    png.data[i * 4 + 1] = g;
    png.data[i * 4 + 2] = b;
    png.data[i * 4 + 3] = 255;
  }
  return PNG.sync.write(png);
}

export interface GifInfo {
  header: string;
  width: number;
  height: number;
  frames: number;
  /** Per-frame delays in hundredths of a second */
  delays: number[];
  /** NETSCAPE loop count, or undefined when the GIF plays once */
  loopCount?: number;
}

/**
 * Walk the blocks of a GIF file and summarise it
 */
export function readGif(buffer: Buffer): GifInfo {
  const info: GifInfo = {
    header: buffer.toString('ascii', 0, 6),
    width: buffer.readUInt16LE(6),
    height: buffer.readUInt16LE(8),
    frames: 0,
    delays: []
  };

  const skipColourTable = (pos: number, packed: number) =>
    packed & 0x80 ? pos + 3 * (1 << ((packed & 0x07) + 1)) : pos;
  const skipSubBlocks = (pos: number) => {
    while (buffer[pos] !== 0) pos += buffer[pos] + 1;
    return pos + 1;
  };

  let pos = skipColourTable(13, buffer[10]);

  while (pos < buffer.length) {
    const block = buffer[pos++];

    if (block === 0x3b) {
      break;
    } else if (block === 0x21) {
      const label = buffer[pos++];
      if (label === 0xf9) {
        info.delays.push(buffer.readUInt16LE(pos + 2));
      } else if (label === 0xff && buffer.toString('ascii', pos + 1, pos + 12) === 'NETSCAPE2.0') {
        info.loopCount = buffer.readUInt16LE(pos + 14);
      }
      pos = skipSubBlocks(pos);
    } else if (block === 0x2c) {
      info.frames++;
      pos = skipColourTable(pos + 9, buffer[pos + 8]);
      pos = skipSubBlocks(pos + 1);
    } else {
      throw new Error(`Unexpected GIF block 0x${block.toString(16)} at byte ${pos - 1}`);
    }
  }

  return info;
}

/**
 * Identify an image from its leading bytes
 */
export function imageType(buffer: Buffer): 'png' | 'jpeg' | 'webp' | 'unknown' {
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png';
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'webp';
  }
  return 'unknown';
}
