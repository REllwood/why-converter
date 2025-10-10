import { ConversionOptions, VideoMetadata, ImageFormat } from '../core/types';

/**
 * Abstract base class for image sequence export
 */
export abstract class ImageExporter {
  protected options: ConversionOptions;
  protected metadata: VideoMetadata;

  constructor(options: ConversionOptions, metadata: VideoMetadata) {
    this.options = options;
    this.metadata = metadata;
  }

  /**
   * Export frames as image sequence
   */
  abstract export(
    frames: Array<{ data: Buffer | Blob; width: number; height: number; timestamp: number }>
  ): Promise<{ files: string[] | File[]; directory?: string }>;

  /**
   * Get image format
   */
  protected getImageFormat(): ImageFormat {
    return this.options.imageFormat || 'png';
  }

  /**
   * Get image quality (for jpeg/webp)
   */
  protected getImageQuality(): number {
    return this.options.imageQuality || 90;
  }

  /**
   * Get file prefix
   */
  protected getFilePrefix(): string {
    return this.options.imagePrefix || 'frame_';
  }

  /**
   * Generate filename for frame
   */
  protected generateFilename(index: number, format: ImageFormat): string {
    const prefix = this.getFilePrefix();
    const paddedIndex = index.toString().padStart(6, '0');
    return `${prefix}${paddedIndex}.${format}`;
  }

  /**
   * Get MIME type for image format
   */
  protected getMimeType(format: ImageFormat): string {
    switch (format) {
      case 'png':
        return 'image/png';
      case 'jpeg':
        return 'image/jpeg';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/png';
    }
  }
}

