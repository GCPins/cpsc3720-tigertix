/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: [],
  verbose: true,
  // Increase timeout for slower Windows CI and DB operations
  testTimeout: 20000,
};
