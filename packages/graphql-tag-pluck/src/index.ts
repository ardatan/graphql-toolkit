import generateConfig from './config';
import { parse } from '@babel/parser';
import { getExtNameFromFilePath } from './libs/extname';
import createVisitor from './visitor';
import traverse from '@babel/traverse';
import { freeText } from './utils';

export interface GraphQLTagPluckOptions {
  modules?: Array<{ name: string; identifier?: string }>;
  gqlMagicComment?: string;
  globalGqlIdentifierName?: string | string[];
}

const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.flow', '.flow.js', '.flow.jsx', '.vue'];

async function pluckVueFileScript(fileData: string) {
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

export const gqlPluckFromCodeString = async (filePath: string, code: string, options: GraphQLTagPluckOptions = {}): Promise<string> => {
  if (typeof code != 'string') {
    throw TypeError('Provided code must be a string');
  }

  if (!(options instanceof Object)) {
    throw TypeError(`Options arg must be an object`);
  }

  const fileExt = getExtNameFromFilePath(filePath);
  if (fileExt) {
    if (!supportedExtensions.includes(fileExt)) {
      throw TypeError(`Provided file type must be one of ${supportedExtensions.join(', ')}`);
    }

    if (fileExt === '.vue') {
      code = await pluckVueFileScript(code);
    }
  }

  const out = { returnValue: null };
  const ast = parse(code, generateConfig(filePath, code, options));
  const visitor = createVisitor(code, out, options);

  traverse(ast, visitor);

  return out.returnValue;
};
