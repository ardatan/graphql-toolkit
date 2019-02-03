module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/test-assets'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    }
  }
};
