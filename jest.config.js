module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        addFileAttribute: 'true',
      },
    ],
  ],
  globals: {
    'ts-jest': {
      diagnostics: false,
      tsConfig: {
        module: 'commonjs'
      }
    }
  }
};
