module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      tsConfig: {
        esModuleInterop: true,
        module: 'commonjs',
        allowJs: true
      }
    }
  }
};
