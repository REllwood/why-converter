module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  // Browser tests need the built bundle and Chromium: see jest.browser.config.js
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/test/browser/'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }]
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/core/types.ts'
  ],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  verbose: true
};
