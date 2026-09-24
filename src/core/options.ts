import { DEFAULT_CONFIG, PAGE_SIZES } from '../config';
import { createProgressReporter } from './progress';
import { ConversionOptions } from './types';

const EXTRACTION_MODES = ['frames', 'interval', 'time'];
const OUTPUT_FORMATS = ['pdf', 'gif', 'images'];
const PDF_LAYOUTS = ['portrait', 'landscape'];
const IMAGE_FORMATS = ['png', 'jpeg', 'webp'];

function isPositiveInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isPositiveNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isInRange(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && value >= min && value <= max;
}

function describe(value: unknown): string {
  return typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
}

/**
 * Check every option, collecting all problems into a single error
 */
function validateOptions(options: ConversionOptions): void {
  const problems: string[] = [];
  const check = (valid: boolean, message: string) => {
    if (!valid) problems.push(message);
  };
  const oneOf = (name: string, value: unknown, allowed: string[]) =>
    check(allowed.includes(value as string), `${name} must be one of ${allowed.join(', ')} (got ${describe(value)})`);
  const optional = (name: keyof ConversionOptions, valid: (value: unknown) => boolean, rule: string) => {
    const value = options[name];
    if (value !== undefined) check(valid(value), `${name} must be ${rule} (got ${describe(value)})`);
  };

  oneOf('extractionMode', options.extractionMode, EXTRACTION_MODES);
  oneOf('outputFormat', options.outputFormat, OUTPUT_FORMATS);
  oneOf('pdfLayout', options.pdfLayout, PDF_LAYOUTS);
  oneOf('imageFormat', options.imageFormat, IMAGE_FORMATS);

  optional('framesCount', isPositiveInteger, 'a whole number greater than 0');
  optional('frameInterval', isPositiveInteger, 'a whole number greater than 0');
  optional('timeInterval', isPositiveNumber, 'a number of seconds greater than 0');
  optional('framesPerPage', isPositiveInteger, 'a whole number greater than 0');
  optional('gifFps', value => isInRange(value, 0.01, 100), 'greater than 0 and at most 100');
  optional('gifQuality', value => isInRange(value, 1, 100), 'between 1 and 100');
  optional('gifRepeat', value => Number.isInteger(value) && (value as number) >= -1, 'a whole number of -1 or more');
  optional('imageQuality', value => isInRange(value, 1, 100), 'between 1 and 100');
  optional('compression', value => isInRange(value, 0, 100), 'between 0 and 100');
  optional('width', isPositiveInteger, 'a whole number of pixels greater than 0');
  optional('height', isPositiveInteger, 'a whole number of pixels greater than 0');
  optional('imagePrefix', value => typeof value === 'string' && !/[\\/]/.test(value), 'a string without / or \\');
  optional('outputPath', value => typeof value === 'string' && value.length > 0, 'a non-empty string');

  const pageSize = options.pageSize;
  check(
    typeof pageSize === 'string'
      ? pageSize in PAGE_SIZES
      : Array.isArray(pageSize) && pageSize.length === 2 && pageSize.every(isPositiveNumber),
    `pageSize must be one of ${Object.keys(PAGE_SIZES).join(', ')} or [width, height] in points (got ${describe(pageSize)})`
  );

  for (const name of ['onProgress', 'onComplete', 'onError'] as const) {
    optional(name, value => typeof value === 'function', 'a function');
  }

  if (problems.length > 0) {
    throw new Error(`Invalid options: ${problems.join('; ')}`);
  }
}

/**
 * Fill in defaults for anything not given, then validate the result
 *
 * Uses ?? rather than || so that valid falsy values (such as gifRepeat: 0
 * or compression: 0) are kept rather than replaced by defaults.
 */
export function resolveOptions(options: Partial<ConversionOptions> = {}): ConversionOptions {
  const resolved: ConversionOptions = {
    extractionMode: options.extractionMode ?? DEFAULT_CONFIG.extractionMode,
    outputFormat: options.outputFormat ?? DEFAULT_CONFIG.outputFormat,
    framesCount: options.framesCount,
    frameInterval: options.frameInterval,
    timeInterval: options.timeInterval,
    outputPath: options.outputPath,
    pdfLayout: options.pdfLayout ?? DEFAULT_CONFIG.pdfLayout,
    framesPerPage: options.framesPerPage ?? DEFAULT_CONFIG.framesPerPage,
    pageSize: options.pageSize ?? DEFAULT_CONFIG.pageSize,
    gifFps: options.gifFps ?? DEFAULT_CONFIG.gifFps,
    gifQuality: options.gifQuality ?? DEFAULT_CONFIG.gifQuality,
    gifRepeat: options.gifRepeat ?? DEFAULT_CONFIG.gifRepeat,
    imageFormat: options.imageFormat ?? DEFAULT_CONFIG.imageFormat,
    imageQuality: options.imageQuality ?? DEFAULT_CONFIG.imageQuality,
    imagePrefix: options.imagePrefix ?? DEFAULT_CONFIG.imagePrefix,
    width: options.width,
    height: options.height,
    maintainAspectRatio: options.maintainAspectRatio ?? DEFAULT_CONFIG.maintainAspectRatio,
    compression: options.compression ?? DEFAULT_CONFIG.compression,
    onProgress: options.onProgress,
    onComplete: options.onComplete,
    onError: options.onError
  };

  validateOptions(resolved);

  return { ...resolved, onProgress: createProgressReporter(resolved.onProgress) };
}
