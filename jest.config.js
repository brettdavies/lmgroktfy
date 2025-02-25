export default {
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    // Handle ES modules
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    // Use babel to transform ES modules for Jest
    '^.+\\.js$': 'babel-jest',
  },
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/i18n/**/*.test.js',
    '**/tests/integration/**/*.test.js'
  ],
  testPathIgnorePatterns: ['/node_modules/'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'js/**/*.js',
    '!**/node_modules/**',
  ],
  coverageReporters: ['text', 'lcov'],
  // Add this to make Jest global variables available in ES modules
  injectGlobals: true,
  // Setup files to run before tests
  setupFilesAfterEnv: ['./jest.setup.js'],
}; 