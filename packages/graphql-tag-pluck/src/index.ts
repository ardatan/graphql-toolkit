import generateConfig from './config';
import { parse } from '@babel/parser';
import { getExtNameFromFilePath } from './libs/extname';
import createVisitor from './visitor';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import traverse from '@babel/traverse';
import { freeText } from './utils';

export interface GraphQLTagPluckOptions {
  modules?: Array<{ name: string; identifier?: string }>;
  gqlMagicComment?: string;
  globalGqlIdentifierName?: string;
  fileExt?: string;
}

const gqlExtensions = ['.graphqls', '.graphql', '.gqls', '.gql'];

const jsExtensions = ['.js', '.jsx', '.ts', '.tsx', '.flow', '.flow.js', '.flow.jsx', '.vue'];

const supportedExtensions = [...gqlExtensions, ...jsExtensions];

supportedExtensions.toString = function toString() {
  return this.join(', ');
};

async function pluckVueFileScript(fileData) {
  let vueTemplateCompiler: typeof import('vue-template-compiler');
  try {
    vueTemplateCompiler = await import('vue-template-compiler');
  } catch (e) {
    throw Error(
      freeText(`
      GraphQL template literals cannot be plucked from a Vue template code without having the "vue-template-compiler" package installed.
      Please install it and try again.

      Via NPM:

          $ npm install vue-template-compiler

      Via Yarn:

          $ yarn add vue-template-compiler
    `)
    );
  }
  const parsed = vueTemplateCompiler.parseComponent(fileData);
  return parsed.script ? parsed.script.content : '';
}

export const gqlPluckFromFile = async (filePath: string, options: GraphQLTagPluckOptions = {}) => {
  if (typeof filePath != 'string') {
    throw TypeError('Provided file path must be a string');
  }

  const fileExt = getExtNameFromFilePath(filePath);

  if (!supportedExtensions.includes(fileExt)) {
    throw TypeError(`Provided file type must be one of ${supportedExtensions}`);
  }

  if (gqlExtensions.includes(fileExt)) {
    return readFileSync(filePath, { encoding: 'utf8' });
  }

  if (!(options instanceof Object)) {
    throw TypeError(`Options arg must be an object`);
  }

  filePath = resolve(process.cwd(), filePath);
  options = { ...options, fileExt };

  let code = readFileSync(filePath, { encoding: 'utf8' });

  if (fileExt === '.vue') {
    code = await pluckVueFileScript(code);
  }

  return gqlPluckFromCodeString(code, options);
};

export const gqlPluckFromCodeString = async (code: string, options: GraphQLTagPluckOptions = {}): Promise<string> => {
  if (typeof code != 'string') {
    throw TypeError('Provided code must be a string');
  }

  if (!(options instanceof Object)) {
    throw TypeError(`Options arg must be an object`);
  }

  if (options.fileExt) {
    if (gqlExtensions.includes(options.fileExt)) {
      return code;
    }

    if (!jsExtensions.includes(options.fileExt)) {
      throw TypeError(`options.fileExt must be one of ${supportedExtensions}`);
    }
  }

  const out = { returnValue: null };
  const ast = parse(code, generateConfig(code, options));
  const visitor = createVisitor(code, out, options);

  traverse(ast, visitor);

  return out.returnValue;
};

export default {
  fromFile: gqlPluckFromFile,
  fromCodeString: gqlPluckFromCodeString,
};
