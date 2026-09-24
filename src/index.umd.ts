import convertVideo, { DEFAULT_CONFIG } from './index.browser';

/**
 * Entry point for the browser bundle. The bundle exports convertVideo itself,
 * so script tags can call WhyConverter(file, options), with the named exports
 * attached so `import { convertVideo } from 'why-converter'` works in bundlers.
 */
export default Object.assign(convertVideo, {
  convertVideo,
  DEFAULT_CONFIG,
  default: convertVideo
});
