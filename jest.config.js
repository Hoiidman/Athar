/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  // The first render in a screen test builds the whole React Native tree and
  // can pass 5s once suites run in parallel and contend for CPU.
  testTimeout: 15000,
};
