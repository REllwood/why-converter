import { FrameExtractor } from '../../src/core/FrameExtractor';

function timestamps(
  mode: 'frames' | 'interval' | 'time',
  video: { duration: number; fps: number },
  options: { framesCount?: number; frameInterval?: number; timeInterval?: number } = {}
): number[] {
  return FrameExtractor.create(mode, video, options).getFrameTimestamps();
}

function expectAscendingWithin(values: number[], duration: number): void {
  for (let i = 0; i < values.length; i++) {
    expect(values[i]).toBeGreaterThanOrEqual(0);
    expect(values[i]).toBeLessThan(duration);
    if (i > 0) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  }
}

describe('FrameExtractor', () => {
  describe("'frames' mode", () => {
    it('extracts the requested number of frames spread across the video', () => {
      const result = timestamps('frames', { duration: 10, fps: 30 }, { framesCount: 5 });

      expect(result).toHaveLength(5);
      expect(result[0]).toBe(0);
      expect(result[2]).toBeCloseTo(5);
      expectAscendingWithin(result, 10);
    });

    it('defaults to 10 frames', () => {
      expect(timestamps('frames', { duration: 10, fps: 30 })).toHaveLength(10);
    });

    it('takes a single frame from the middle', () => {
      expect(timestamps('frames', { duration: 10, fps: 30 }, { framesCount: 1 })).toEqual([5]);
    });

    it('rejects a frame count of zero or less', () => {
      expect(() => timestamps('frames', { duration: 10, fps: 30 }, { framesCount: 0 })).toThrow(
        'Frame count must be greater than 0'
      );
    });
  });

  describe("'interval' mode", () => {
    it('takes every Nth frame', () => {
      const result = timestamps('interval', { duration: 10, fps: 30 }, { frameInterval: 30 });

      expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('rejects an interval of zero or less', () => {
      expect(() => timestamps('interval', { duration: 10, fps: 30 }, { frameInterval: -1 })).toThrow(
        'Frame interval must be greater than 0'
      );
    });
  });

  describe("'time' mode", () => {
    it('takes a frame every N seconds', () => {
      const result = timestamps('time', { duration: 10, fps: 30 }, { timeInterval: 2 });

      expect(result.slice(0, 5)).toEqual([0, 2, 4, 6, 8]);
      expectAscendingWithin(result, 10);
    });

    it('rejects a negative interval', () => {
      expect(() => timestamps('time', { duration: 10, fps: 30 }, { timeInterval: -1 })).toThrow(
        'Time interval must be greater than 0'
      );
    });
  });

  it('counts the frames it will extract', () => {
    const extractor = FrameExtractor.create('frames', { duration: 10, fps: 30 }, { framesCount: 4 });
    expect(extractor.getFrameCount()).toBe(4);
  });
});
