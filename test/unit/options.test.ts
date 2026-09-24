import { resolveOptions } from '../../src/core/options';
import { DEFAULT_CONFIG } from '../../src/config';
import { convertVideo } from '../../src/index.node';
import { ConversionOptions } from '../../src/core/types';

describe('resolveOptions', () => {
  it('fills in every default', () => {
    const { onProgress, onComplete, onError, ...resolved } = resolveOptions();

    expect(resolved).toMatchObject(DEFAULT_CONFIG);
    expect(onProgress).toBeUndefined();
    expect(onComplete).toBeUndefined();
    expect(onError).toBeUndefined();
  });

  it('keeps valid falsy values instead of replacing them with defaults', () => {
    const resolved = resolveOptions({
      gifRepeat: 0,
      compression: 0,
      imagePrefix: '',
      maintainAspectRatio: false
    });

    expect(resolved.gifRepeat).toBe(0);
    expect(resolved.compression).toBe(0);
    expect(resolved.imagePrefix).toBe('');
    expect(resolved.maintainAspectRatio).toBe(false);
  });

  it('wraps onProgress so it only moves forward', () => {
    const seen: number[] = [];
    const { onProgress } = resolveOptions({ onProgress: value => seen.push(value) });

    [10, 5, 20].forEach(onProgress!);

    expect(seen).toEqual([10, 20]);
  });

  it.each<[Partial<ConversionOptions>, string]>([
    [{ timeInterval: 0 }, 'timeInterval must be a number of seconds greater than 0 (got 0)'],
    [{ framesCount: 2.5 }, 'framesCount must be a whole number greater than 0 (got 2.5)'],
    [{ frameInterval: 0 }, 'frameInterval must be a whole number greater than 0 (got 0)'],
    [{ framesPerPage: 0 }, 'framesPerPage must be a whole number greater than 0 (got 0)'],
    [{ gifQuality: 0 }, 'gifQuality must be between 1 and 100 (got 0)'],
    [{ gifFps: 0 }, 'gifFps must be greater than 0 and at most 100 (got 0)'],
    [{ gifRepeat: -2 }, 'gifRepeat must be a whole number of -1 or more (got -2)'],
    [{ imageQuality: 101 }, 'imageQuality must be between 1 and 100 (got 101)'],
    [{ width: -1 }, 'width must be a whole number of pixels greater than 0 (got -1)'],
    [{ imagePrefix: 'frames/f_' }, 'imagePrefix must be a string without / or \\ (got "frames/f_")'],
    [{ extractionMode: 'every' as never }, 'extractionMode must be one of frames, interval, time (got "every")'],
    [{ outputFormat: 'mp4' as never }, 'outputFormat must be one of pdf, gif, images (got "mp4")'],
    [{ imageFormat: 'bmp' as never }, 'imageFormat must be one of png, jpeg, webp (got "bmp")'],
    [{ pageSize: 'A3' as never }, 'pageSize must be one of A4, Letter, Legal or [width, height] in points (got "A3")'],
    [{ pageSize: [0, 100] }, 'pageSize must be one of A4, Letter, Legal or [width, height] in points (got [0,100])'],
    [{ onProgress: 'yes' as never }, 'onProgress must be a function (got "yes")']
  ])('rejects %j', (options, message) => {
    expect(() => resolveOptions(options)).toThrow(`Invalid options: ${message}`);
  });

  it('reports every problem at once', () => {
    expect(() => resolveOptions({ gifQuality: 0, imageQuality: 0 })).toThrow(
      'Invalid options: gifQuality must be between 1 and 100 (got 0); imageQuality must be between 1 and 100 (got 0)'
    );
  });
});

describe('convertVideo with invalid options', () => {
  it('fails before touching the video and calls onError', async () => {
    const onError = jest.fn();
    const result = await convertVideo('/no/such/video.mp4', { timeInterval: 0, extractionMode: 'time', onError });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid options: timeInterval must be a number of seconds greater than 0 (got 0)');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: result.error }));
  });

  it('works without an options object', async () => {
    const result = await convertVideo('/no/such/video.mp4');

    expect(result.error).toBe('Video file not found: /no/such/video.mp4');
  });
});
