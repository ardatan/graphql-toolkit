import { parse as babelParse, ParserOptions } from '@babel/parser';
import { freeText } from '../utils';

export const parseCode = (code: string, config: ParserOptions) => {
  // The 'typescript' plug-in has few bugs... It's just better to use the native one
  // even though it affects performance
  if (config.plugins.includes('typescript')) {
    let ts;
    try {
      ts = require('typescript');
    } catch (e) {
      throw Error(
        freeText(`
        GraphQL template literals cannot be plucked from a TypeScript code without having the "typescript" package installed.
        Please install it and try again.

        Via NPM:

            $ npm install typescript

        Via Yarn:

            $ yarn add typescript
      `)
      );
    }

    code = ts.transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2018,
        // "preserve" mode would be more correct, but it will keep not transpile generic
        // React.Components which are provided with null or undefined e.g. <Foo<undefined />>
        jsx: config.plugins.includes('jsx') && 'react',
      },
    }).outputText;

    const plugins = config.plugins.slice();
    const tsIndex = plugins.indexOf('typescript');
    plugins.splice(tsIndex, 1);

    config = { ...config, plugins };
  }

  const ast = babelParse(code, config);
  // Necessary to get the original code in case it was transformed by TypeScript
  ast['code'] = code;

  return ast;
};
