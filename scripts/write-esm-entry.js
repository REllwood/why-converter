/**
 * Write the ES module entry point for Node.js: a thin wrapper around the
 * CommonJS build, so `import` and `require` share a single copy of the library
 */
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'dist', 'node');

fs.writeFileSync(
  path.join(outDir, 'index.node.mjs'),
  `import cjs from './index.node.js';

export const { convertVideo, DEFAULT_CONFIG } = cjs;
export default cjs.default;
`
);

fs.writeFileSync(
  path.join(outDir, 'index.node.d.mts'),
  `import { convertVideo } from './index.node.js';

export * from './index.node.js';
export default convertVideo;
`
);
