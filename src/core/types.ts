/**
 * Mode for frame extraction from video
 */
export type ExtractionMode = 'frames' | 'interval' | 'time';

/**
 * Output format for the conversion
 */
export type OutputFormat = 'pdf' | 'gif' | 'images';

/**
 * Image format for image sequence export
 */
export type ImageFormat = 'png' | 'jpeg' | 'webp';

/**
 * PDF page layout orientation
 */
export type PDFLayout = 'portrait' | 'landscape';

/**
 * PDF page size presets
 */
export type PageSize = 'A4' | 'Letter' | 'Legal' | [number, number];

/**
 * Main options interface for video conversion
 */
export interface ConversionOptions {
  // Frame extraction options
  extractionMode: ExtractionMode;
  framesCount?: number;           // Extract N frames total
  frameInterval?: number;         // Extract every N frames
  timeInterval?: number;          // Extract frame every N seconds
  
  // Output options
  outputFormat: OutputFormat;
  outputPath?: string;            // Node.js only - output file path or directory
  
  // PDF specific options
  pdfLayout?: PDFLayout;
  framesPerPage?: number;         // 1, 2, 4, 6, 9, etc.
  pageSize?: PageSize;
  
  // GIF specific options
  gifFps?: number;                // Frames per second for GIF
  gifQuality?: number;            // 1-100, quality of GIF
  gifRepeat?: number;             // 0 = infinite loop, -1 = no loop, n = loop n times
  
  // Image sequence specific options
  imageFormat?: ImageFormat;
  imageQuality?: number;          // 1-100 for jpeg/webp
  imagePrefix?: string;           // Prefix for image filenames, e.g., 'frame_'
  
  // Quality options
  width?: number;                 // Output width in pixels
  height?: number;                // Output height in pixels
  maintainAspectRatio?: boolean;  // Maintain aspect ratio when resizing
  compression?: number;           // 0-100, compression level
  
  // Callbacks
  onProgress?: (progress: number) => void;
  onComplete?: (result: ConversionResult) => void;
  onError?: (error: Error) => void;
}

/**
 * Metadata about the video and conversion process
 */
export interface VideoMetadata {
  totalFrames: number;
  extractedFrames: number;
  duration: number;               // Duration in seconds
  dimensions: {
    width: number;
    height: number;
  };
  fps?: number;                   // Frames per second of original video
  format?: string;                // Video format/codec
}

/**
 * Result of the conversion operation
 */
export interface ConversionResult {
  success: boolean;
  outputPath?: string;            // Node.js - file path (PDF/GIF) or directory (images)
  buffer?: Buffer;                // Node.js - PDF/GIF file contents
  filePaths?: string[];           // Node.js - paths of the written images (image sequence)
  blob?: Blob;                    // Browser - single file output
  files?: File[];                 // Browser - multiple files (image sequence)
  metadata: VideoMetadata;
  error?: string;                 // Error message if success is false
}

/**
 * Extracted frame data
 */
export interface ExtractedFrame {
  index: number;                  // Frame index
  timestamp: number;              // Timestamp in seconds
  data: Buffer | Uint8Array;      // Frame image data
  width: number;
  height: number;
}

/**
 * Internal frame extraction configuration
 */
export interface FrameExtractionConfig {
  mode: ExtractionMode;
  totalFrames: number;
  videoDuration: number;
  videoFps: number;
  framesCount?: number;
  frameInterval?: number;
  timeInterval?: number;
}

/**
 * Environment type detection
 */
export type Environment = 'node' | 'browser';

/**
 * Video input type
 */
export type VideoInput = string | File | Blob | Buffer;

/**
 * Default configuration values
 */
export interface DefaultConfig {
  extractionMode: ExtractionMode;
  outputFormat: OutputFormat;
  pdfLayout: PDFLayout;
  framesPerPage: number;
  pageSize: PageSize;
  gifFps: number;
  gifQuality: number;
  gifRepeat: number;
  imageFormat: ImageFormat;
  imageQuality: number;
  imagePrefix: string;
  maintainAspectRatio: boolean;
  compression: number;
}

