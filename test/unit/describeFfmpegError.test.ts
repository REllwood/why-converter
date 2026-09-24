import { describeFfmpegError } from '../../src/utils/node';

describe('describeFfmpegError', () => {
  it('explains how to fix a missing ffprobe', () => {
    const message = describeFfmpegError(new Error('Cannot find ffprobe'), 'ffprobe');

    expect(message).toContain('ffprobe was not found');
    expect(message).toContain('@ffprobe-installer/ffprobe');
    expect(message).toContain('FFPROBE_PATH');
  });

  it('explains how to fix a missing ffmpeg', () => {
    const message = describeFfmpegError(new Error('spawn /usr/bin/ffmpeg ENOENT'), 'ffmpeg');

    expect(message).toContain('ffmpeg was not found');
    expect(message).toContain('FFMPEG_PATH');
  });

  it('passes other errors through unchanged', () => {
    expect(describeFfmpegError(new Error('Invalid data found'), 'ffprobe')).toBe('Invalid data found');
  });
});
