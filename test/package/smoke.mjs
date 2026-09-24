// Checks the built package the way consumers load it, using Node's
// self-referencing so "why-converter" resolves through package.json exports.
// Run with `npm run test:package` (which builds first).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'why-converter';
import esmDefault from 'why-converter';

const require = createRequire(import.meta.url);
const cjs = require('why-converter');

// ESM: default and named exports are the same function
assert.equal(typeof esmDefault, 'function', 'ESM default export is a function');
assert.equal(esm.convertVideo, esmDefault, 'ESM named convertVideo is the default export');

// The ESM wrapper lists its exports by hand, so it must match the CommonJS build
assert.deepEqual(
  Object.keys(esm).sort(),
  Object.keys(cjs).filter(key => key !== '__esModule').sort(),
  'ESM entry exposes the same exports as the CommonJS entry'
);

// CommonJS
assert.equal(typeof cjs.convertVideo, 'function', 'CJS convertVideo is a function');
assert.equal(cjs.default, cjs.convertVideo, 'CJS default is convertVideo');
assert.equal(esm.DEFAULT_CONFIG, cjs.DEFAULT_CONFIG, 'ESM and CJS share one copy of the library');

console.log('Package entry points OK');
