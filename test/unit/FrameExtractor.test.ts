import { FrameExtractor } from '../../src/core/FrameExtractor';

function timestamps(
  mode: 'frames' | 'interval' | 'time',
  video: { duration: number; fps: number },
  options: { framesCount?: number; frameInterval?: number; timeInterval?: number } = {}
): number[] {
  return FrameExtractor.create(mode, video, options).getFrameTimestamps();
}

/**
 * Every timestamp must be a real, seekable frame: ascending, unique, and
 * between 0 and the start of the last frame
 */
function expectSeekable(values: number[], video: { duration: number; fps: number }): void {
  const lastFrameTime = video.duration - 1 / video.fps;
  for (let i = 0; i < values.length; i++) {
    expect(values[i]).toBeGreaterThanOrEqual(0);
    expect(values[i]).toBeLessThanOrEqual(lastFrameTime + 1e-9);
    if (i > 0) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  }
}

describe('FrameExtractor', () => {
  const tenSeconds = { duration: 10, fps: 30 };

  describe("'frames' mode", () => {
    it('spreads the frames from the first frame to the last', () => {
      const result = timestamps('frames', tenSeconds, { framesCount: 5 });

      expect(result).toHaveLength(5);
      expect(result[0]).toBe(0);
      expect(result[4]).toBeCloseTo(10 - 1 / 30);
      expectSeekable(result, tenSeconds);
    });

    it('defaults to 10 frames', () => {
      expect(timestamps('frames', tenSeconds)).toHaveLength(10);
    });

    it('takes a single frame from the middle', () => {
      expect(timestamps('frames', tenSeconds, { framesCount: 1 })).toEqual([5]);
    });

    it('never seeks before the start of a very short clip', () => {
      const clip = { duration: 0.1, fps: 30 };
      const result = timestamps('frames', clip, { framesCount: 5 });

      expect(result).toHaveLength(3);
      expectSeekable(result, clip);
    });

    it('returns each frame once when asked for more frames than the video has', () => {
      expect(timestamps('frames', { duration: 1, fps: 10 }, { framesCount: 100 })).toHaveLength(10);
    });

    it('rejects a frame count of zero or less', () => {
      expect(() => timestamps('frames', tenSeconds, { framesCount: 0 })).toThrow('Frame count must be greater than 0');
    });
  });

  describe("'interval' mode", () => {
    it('takes every Nth frame', () => {
      expect(timestamps('interval', tenSeconds, { frameInterval: 30 })).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('falls back to 30 fps when the frame rate is unusable', () => {
      expect(timestamps('interval', { duration: 2, fps: NaN }, { frameInterval: 30 })).toEqual([0, 1]);
    });

    it('rejects an interval of zero or less', () => {
      expect(() => timestamps('interval', tenSeconds, { frameInterval: -1 })).toThrow(
        'Frame interval must be greater than 0'
      );
    });
  });

  describe("'time' mode", () => {
    it('takes a frame every N seconds without adding an extra frame at the end', () => {
      expect(timestamps('time', tenSeconds, { timeInterval: 3 })).toEqual([0, 3, 6, 9]);
      expect(timestamps('time', tenSeconds, { timeInterval: 2 })).toEqual([0, 2, 4, 6, 8]);
    });

    it('does not build up floating point error', () => {
      const result = timestamps('time', { duration: 1, fps: 30 }, { timeInterval: 0.1 });

      expect(result).toHaveLength(10);
      expect(result[9]).toBe(0.9);
    });

    it('clamps to the last frame and drops the duplicates that would cause', () => {
      const clip = { duration: 1, fps: 10 };
      const result = timestamps('time', clip, { timeInterval: 0.3 });

      expect(result).toEqual([0, 0.3, 0.6, 0.9]);
      expectSeekable(timestamps('time', clip, { timeInterval: 0.05 }), clip);
    });

    it('rejects an interval of zero or less', () => {
      expect(() => timestamps('time', tenSeconds, { timeInterval: 0 })).toThrow('Time interval must be greater than 0');
    });
  });

  it.each([0, -1, NaN, Infinity])('rejects a video duration of %p', duration => {
    expect(() => timestamps('frames', { duration, fps: 30 })).toThrow(
      `Cannot pick frames because the video's duration is unknown or zero (got ${duration})`
    );
  });

  it('counts the frames it will extract', () => {
    expect(FrameExtractor.create('frames', tenSeconds, { framesCount: 4 }).getFrameCount()).toBe(4);
  });
});
