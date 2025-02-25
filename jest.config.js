module.exports = {
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
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'js/**/*.js',
    '!**/node_modules/**',
  ],
}; 