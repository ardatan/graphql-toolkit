import { Source, parse } from 'graphql';
import gqlPluck from 'graphql-tag-pluck';

export interface ExtractOptions {
  tagPluck?: {
    modules?: Array<{ name: string; identifier?: string }>;
    magicComment?: string;
    globalIdentifier?: string;
  };
}

interface GraphQLTagPluckOptions {
  modules?: Array<{ name: string; identifier?: string }>;
  gqlMagicComment?: string;
  globalGqlIdentifierName?: string;
}

function calculateOptions(options?: ExtractOptions) {
  if (!options || !options.tagPluck) {
    return {};
  }

  // toolkit option's key -> option in graphql-tag-pluck
  const keyMap = {
    modules: 'modules',
    magicComment: 'gqlMagicComment',
    globalIdentifier: 'globalGqlIdentifierName',
  };

  return Object.keys(keyMap).reduce<GraphQLTagPluckOptions>((prev, curr) => {
    const value = options.tagPluck[curr];

    if (value) {
      return {
        ...prev,
        [keyMap[curr]]: value,
      };
    }

    return prev;
  }, {});
}

export function extractDocumentStringFromCodeFile(source: Source, options?: ExtractOptions): string | void {
  try {
    const parsed = parse(source.body);

    if (parsed) {
      return source.body;
    }
  } catch (e) {
    try {
      return gqlPluck.fromFile.sync(source.name, calculateOptions(options)) || null;
    } catch (e) {
      throw new e.constructor(`${e.message} at ${source.name}`);
    }
  }
}
