module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: process.cwd(),
  globals: {
    'ts-jest': {
      diagnostics: false,
      tsConfig: {
        module: 'commonjs',
      },
    },
  },
  reporters: ['default'],
  modulePathIgnorePatterns: ['<rootDir>/dist'],
};
