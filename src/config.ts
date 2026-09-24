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

