/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/firestore-tests/**/*.test.ts'],
  testTimeout: 30000,
};
