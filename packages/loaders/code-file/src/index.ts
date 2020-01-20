import { DocumentNode, GraphQLSchema, parse, IntrospectionQuery, buildClientSchema, Kind } from 'graphql';
import { SchemaPointerSingle, DocumentPointerSingle, debugLog, SingleFileOptions, Source, UniversalLoader, asArray, isValidPath, parseGraphQLSDL, parseGraphQLJSON } from '@graphql-toolkit/common';
import { GraphQLTagPluckOptions, gqlPluckFromCodeString } from '@graphql-toolkit/graphql-tag-pluck';

function isSchemaText(obj: any): obj is string {
  return typeof obj === 'string';
}

function isWrappedSchemaJson(obj: any): obj is { data: IntrospectionQuery } {
  const json = obj as { data: IntrospectionQuery };

  return json.data !== undefined && json.data.__schema !== undefined;
}

function isSchemaJson(obj: any): obj is IntrospectionQuery {
  const json = obj as IntrospectionQuery;

  return json !== undefined && json.__schema !== undefined;
}

function isSchemaObject(obj: any): obj is GraphQLSchema {
  return obj instanceof GraphQLSchema;
}

function isSchemaAst(obj: any): obj is DocumentNode {
  return (obj as DocumentNode).kind !== undefined;
}

function resolveExport(fileExport: GraphQLSchema | DocumentNode | string | { data: IntrospectionQuery } | IntrospectionQuery): GraphQLSchema | DocumentNode | null {
  if (isSchemaObject(fileExport)) {
    return fileExport;
  } else if (isSchemaText(fileExport)) {
    return parse(fileExport);
  } else if (isWrappedSchemaJson(fileExport)) {
    return buildClientSchema(fileExport.data);
  } else if (isSchemaJson(fileExport)) {
    return buildClientSchema(fileExport);
  } else if (isSchemaAst(fileExport)) {
    return fileExport;
  }

  return null;
}

async function tryToLoadFromExport(rawFilePath: string): Promise<GraphQLSchema | DocumentNode> {
  let filePath = rawFilePath;

  try {
    if (typeof require !== 'undefined' && require.cache) {
      filePath = require.resolve(filePath);

      if (require.cache[filePath]) {
        delete require.cache[filePath];
      }
    }

    const rawExports = await import(filePath);

    if (rawExports) {
      let rawExport = rawExports.default || rawExports.schema || rawExports.typeDefs || rawExports.data || rawExports;

      if (rawExport) {
        let exportValue = await rawExport;
        exportValue = await (exportValue.default || exportValue.schema || exportValue.typeDefs || exportValue.data || exportValue);
        try {
          return resolveExport(exportValue);
        } catch (e) {
          throw new Error('Exported schema must be of type GraphQLSchema, text, AST, or introspection JSON.');
        }
      } else {
        throw new Error(`Invalid export from export file ${filePath}: missing default export or 'schema' export!`);
      }
    } else {
      throw new Error(`Invalid export from export file ${filePath}: empty export!`);
    }
  } catch (e) {
    throw new Error(`Unable to load from file "${filePath}": ${e.message}`);
  }
}

export type CodeFileLoaderOptions = {
  require?: string | string[];
  pluckConfig?: GraphQLTagPluckOptions;
  fs?: typeof import('fs');
  path?: typeof import('path');
} & SingleFileOptions;

const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.vue'];

export class CodeFileLoader implements UniversalLoader<CodeFileLoaderOptions> {
  loaderId(): string {
    return 'code-file';
  }

  async canLoad(pointer: SchemaPointerSingle | DocumentPointerSingle, options: CodeFileLoaderOptions): Promise<boolean> {
    if (isValidPath(pointer) && options.path && options.fs) {
      const { resolve, isAbsolute } = options.path;
      if (FILE_EXTENSIONS.find(extension => pointer.endsWith(extension))) {
        const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || process.cwd(), pointer);
        const { exists } = options.fs;
        if (await new Promise(resolve => exists(normalizedFilePath, resolve))) {
          return true;
        }
      }
    }

    return false;
  }

  async load(pointer: SchemaPointerSingle | DocumentPointerSingle, options: CodeFileLoaderOptions): Promise<Source> {
    const { resolve, isAbsolute } = options.path;
    const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || process.cwd(), pointer);

    try {
      const { readFile } = options.fs;
      const content: string = await new Promise((resolve, reject) => readFile(normalizedFilePath, { encoding: 'utf-8' }, (err, data) => (err ? reject(err) : resolve(data))));

      const rawSDL = await gqlPluckFromCodeString(normalizedFilePath, content, options.pluckConfig);
      if (rawSDL) {
        return parseGraphQLSDL(pointer, rawSDL, options);
      }
    } catch (e) {
      debugLog(`Failed to load schema from code file "${normalizedFilePath}": ${e.message}`);

      throw e;
    }

    if (!options.noRequire) {
      if (options && options.require) {
        await Promise.all(asArray(options.require).map(m => import(m)));
      }
      let loaded = await tryToLoadFromExport(normalizedFilePath);
      if (loaded instanceof GraphQLSchema) {
        return {
          location: pointer,
          schema: loaded,
        };
      } else if (loaded && loaded.kind === Kind.DOCUMENT) {
        return {
          location: pointer,
          document: loaded,
        };
      }
    }

    return null;
  }
}
