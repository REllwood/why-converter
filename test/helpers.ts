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
