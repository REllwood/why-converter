/**
 * Browser-specific utilities for video processing
 */

/**
 * How long to wait for a seek before giving up
 */
const SEEK_TIMEOUT_MS = 10000;

/**
 * How long to wait for a video's metadata to load before giving up
 */
const LOAD_TIMEOUT_MS = 30000;

/**
 * Frame rates to snap measurements to when they are within 1%
 */
const COMMON_FRAME_RATES = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 90, 100, 119.88, 120];

const MEDIA_ERROR_REASONS: Record<number, string> = {
  1: 'loading was aborted',
  2: 'a network error occurred',
  3: 'the video could not be decoded',
  4: 'the format or codec is not supported'
};

/**
 * Describe a media element's error, e.g. " (the format or codec is not supported)"
 */
function describeMediaError(error: MediaError | null): string {
  if (!error) {
    return '';
  }
  const reason = MEDIA_ERROR_REASONS[error.code] || `media error ${error.code}`;
  return ` (${reason}${error.message ? `: ${error.message}` : ''})`;
}

/**
 * Load video from various input types
 */
export function loadVideo(input: string | File | Blob): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const url = typeof input === 'string' ? input : URL.createObjectURL(input);

    const finish = (error?: Error) => {
      clearTimeout(timer);
      video.onloadedmetadata = null;
      video.onerror = null;
      if (error) {
        if (typeof input !== 'string') {
          URL.revokeObjectURL(url);
        }
        reject(error);
      } else {
        resolve(video);
      }
    };

    const timer = setTimeout(
      () => finish(new Error(`Timed out loading the video after ${LOAD_TIMEOUT_MS / 1000}s`)),
      LOAD_TIMEOUT_MS
    );

    video.onloadedmetadata = () => finish();
    video.onerror = () =>
      finish(
        new Error(
          `The browser could not load this video${describeMediaError(video.error)}. ` +
            'MP4 (H.264) and WebM are the most widely supported formats.'
        )
      );

    video.src = url;
    video.load();
  });
}

/**
 * Seek a video and wait until the frame at that time is ready to draw
 */
export function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };
    const onSeeked = () => finish();
    const onError = () => finish(new Error(`Failed seeking to ${time}s${describeMediaError(video.error)}`));
    const timer = setTimeout(
      () => finish(new Error(`Timed out seeking to ${time}s after ${SEEK_TIMEOUT_MS / 1000}s`)),
      SEEK_TIMEOUT_MS
    );

    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.currentTime = time;
  });
}

/**
 * Make sure the video's duration is known. Recordings that don't store it
 * (from MediaRecorder or live streams, for example) report Infinity until
 * the browser has reached the end, so seek past the end once.
 */
export async function ensureDuration(video: HTMLVideoElement): Promise<void> {
  if (Number.isFinite(video.duration)) {
    return;
  }

  await seekTo(video, Number.MAX_SAFE_INTEGER);

  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    throw new Error("Could not determine the video's duration");
  }
}

/**
 * Measure a video's frame rate by briefly playing it (muted) and timing the
 * frames it presents. Returns undefined if the browser can't report frames.
 */
export async function estimateFrameRate(video: HTMLVideoElement): Promise<number | undefined> {
  if (typeof video.requestVideoFrameCallback !== 'function') {
    return undefined;
  }

  const mediaTimes: number[] = [];

  try {
    await new Promise<void>(resolve => {
      const timer = setTimeout(resolve, 2000);
      const onFrame = (_now: number, metadata: VideoFrameCallbackMetadata) => {
        mediaTimes.push(metadata.mediaTime);
        if (mediaTimes.length >= 12) {
          clearTimeout(timer);
          resolve();
        } else {
          video.requestVideoFrameCallback(onFrame);
        }
      };
      video.requestVideoFrameCallback(onFrame);
      video.play().catch(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  } finally {
    video.pause();
  }

  // Playback can skip frames but never shows one twice, so the smallest gaps
  // between presented frames are single frames. Average those to smooth out
  // timestamps rounded to the millisecond.
  const gaps = mediaTimes.slice(1).map((time, i) => time - mediaTimes[i]).filter(gap => gap > 0);
  if (gaps.length < 3) {
    return undefined;
  }
  const shortest = Math.min(...gaps);
  const singleFrameGaps = gaps.filter(gap => gap < shortest * 1.5);
  const fps = singleFrameGaps.length / singleFrameGaps.reduce((sum, gap) => sum + gap, 0);

  const common = COMMON_FRAME_RATES.find(rate => Math.abs(rate - fps) / rate < 0.01);
  return common ?? Math.round(fps * 1000) / 1000;
}

/**
 * Get video metadata from HTMLVideoElement
 */
export function getVideoMetadata(video: HTMLVideoElement): {
  duration: number;
  width: number;
  height: number;
} {
  return {
    duration: video.duration,
    width: video.videoWidth,
    height: video.videoHeight
  };
}

/**
 * Extract a frame from video at specific timestamp
 */
export async function extractFrame(
  video: HTMLVideoElement,
  timestamp: number,
  options: { width?: number; height?: number } = {}
): Promise<{ data: Blob; width: number; height: number }> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Set canvas dimensions
  const targetWidth = options.width || video.videoWidth;
  const targetHeight = options.height || video.videoHeight;

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  await seekTo(video, timestamp);

  // Draw video frame to canvas
  ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('Failed to create blob from canvas');
  }

  return { data: blob, width: targetWidth, height: targetHeight };
}

/**
 * Extract multiple frames from video
 */
export async function extractFrames(
  video: HTMLVideoElement,
  timestamps: number[],
  options: { width?: number; height?: number } = {}
): Promise<Array<{ data: Blob; width: number; height: number; timestamp: number }>> {
  const frames: Array<{ data: Blob; width: number; height: number; timestamp: number }> = [];

  for (const timestamp of timestamps) {
    const frame = await extractFrame(video, timestamp, options);
    frames.push({ ...frame, timestamp });
  }

  return frames;
}

/**
 * Decode an image Blob so it can be drawn onto a canvas
 */
export function blobToImage(blob: Blob): Promise<CanvasImageSource> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(blob);
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load frame image'));
    };
    image.src = url;
  });
}

/**
 * Convert blob to base64 data URL
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert blob to array buffer
 */
export function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to array buffer'));
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Download file in browser
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Create a canvas from image data
 */
export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Check if browser supports required features
 */
export function checkBrowserSupport(): { supported: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!window.document) {
    missing.push('document');
  }

  if (!window.HTMLVideoElement) {
    missing.push('HTMLVideoElement');
  }

  if (!window.HTMLCanvasElement) {
    missing.push('HTMLCanvasElement');
  }

  if (!window.Blob) {
    missing.push('Blob');
  }

  if (!window.FileReader) {
    missing.push('FileReader');
  }

  return {
    supported: missing.length === 0,
    missing
  };
}

