import { DefaultConfig } from './core/types';

/**
 * Default configuration for video conversion
 */
export const DEFAULT_CONFIG: DefaultConfig = {
  extractionMode: 'frames',
  outputFormat: 'pdf',
  pdfLayout: 'landscape',
  framesPerPage: 1,
  pageSize: 'A4',
  gifFps: 10,
  gifQuality: 80,
  gifRepeat: 0, // Infinite loop
  imageFormat: 'png',
  imageQuality: 90,
  imagePrefix: 'frame_',
  maintainAspectRatio: true,
  compression: 80
};

/**
 * Page size dimensions in points (1 point = 1/72 inch)
 */
export const PAGE_SIZES: Record<string, [number, number]> = {
  A4: [595.28, 841.89],
  Letter: [612, 792],
  Legal: [612, 1008]
};

/**
 * Maximum dimensions for different output formats
 */
export const MAX_DIMENSIONS = {
  pdf: { width: 4096, height: 4096 },
  gif: { width: 2048, height: 2048 },
  image: { width: 8192, height: 8192 }
};

/**
 * Supported video formats
 */
export const SUPPORTED_VIDEO_FORMATS = {
  node: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'mpeg', 'mpg'],
  browser: ['mp4', 'webm', 'ogg', 'ogv']
};

