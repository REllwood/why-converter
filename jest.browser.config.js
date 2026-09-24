// Browser tests drive the built bundle (dist/browser) in Chromium with Playwright.
// Run with `npm run test:browser`, which builds the bundle first.
const base = require('./jest.config');

module.exports = {
  ...base,
  roots: ['<rootDir>/test/browser'],
  testPathIgnorePatterns: ['/node_modules/'],
  testTimeout: 60000
};
