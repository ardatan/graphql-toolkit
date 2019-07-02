import { Source, parse } from 'graphql';

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

export async function extractDocumentStringFromCodeFile(source: Source, options?: ExtractOptions): Promise<string | void> {
  try {
    const parsed = parse(source.body);

    if (parsed) {
      return source.body;
    }
  } catch (e) {
    try {
      const requireFunc = true ? require : require;
      const { gqlPluckFromFile } = requireFunc('graphql-tag-pluck');
      return gqlPluckFromFile(source.name, calculateOptions(options)) || null;
    } catch (e) {
      throw new e.constructor(`${e.message} at ${source.name}`);
    }
  }
}
