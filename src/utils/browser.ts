/**
 * Browser-specific utilities for video processing
 */

/**
 * Load video from various input types
 */
export function loadVideo(input: string | File | Blob): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';

    let url: string;
    let shouldRevokeUrl = false;

    if (typeof input === 'string') {
      url = input;
    } else {
      url = URL.createObjectURL(input);
      shouldRevokeUrl = true;
    }

    video.onloadedmetadata = () => {
      resolve(video);
    };

    video.onerror = () => {
      if (shouldRevokeUrl) {
        URL.revokeObjectURL(url);
      }
      reject(new Error('Failed to load video'));
    };

    video.src = url;
    video.load();
  });
}

/**
 * Get video metadata from HTMLVideoElement
 */
export function getVideoMetadata(video: HTMLVideoElement): {
  duration: number;
  width: number;
  height: number;
  fps: number;
} {
  // FPS is hard to get in browser, we'll use a default
  // Could be improved by analyzing frame timestamps
  return {
    duration: video.duration,
    width: video.videoWidth,
    height: video.videoHeight,
    fps: 30 // Default assumption for browser
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
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    // Set canvas dimensions
    const targetWidth = options.width || video.videoWidth;
    const targetHeight = options.height || video.videoHeight;
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Seek to timestamp
    video.currentTime = timestamp;

    const onSeeked = () => {
      try {
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

      // Convert to blob
      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          resolve({
            data: blob,
            width: targetWidth,
            height: targetHeight
          });
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/png');
      } catch (error) {
        reject(error);
      } finally {
        video.removeEventListener('seeked', onSeeked);
      }
    };

    video.addEventListener('seeked', onSeeked);
  });
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

