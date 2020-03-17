const { resolve } = require('path');
const { pathsToModuleNameMapper } = require('ts-jest/utils');

const ROOT_DIR = __dirname;
const tsconfig = require(resolve(ROOT_DIR, 'tsconfig.json'));

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: process.cwd(),
  globals: {
    'ts-jest': {
      tsConfig: 'tsconfig.test.json',
    },
  },
  reporters: ['default'],
  modulePathIgnorePatterns: ['<rootDir>/dist'],
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths, { prefix: `${ROOT_DIR}/` }),
};
