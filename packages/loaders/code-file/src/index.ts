import { DocumentNode, GraphQLSchema, parse, IntrospectionQuery, buildClientSchema } from 'graphql';
import { resolve, isAbsolute, extname } from 'path';
import { SchemaPointerSingle, DocumentPointerSingle, debugLog, SingleFileOptions, Source, UniversalLoader, asArray, fixWindowsPath, isValidPath, fixSchemaAst } from '@graphql-toolkit/common';
import { existsSync } from 'fs';
import { gqlPluckFromFile, GraphQLTagPluckOptions } from '@graphql-toolkit/graphql-tag-pluck';

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

async function tryToLoadFromExport(rawFilePath: string): Promise<GraphQLSchema | DocumentNode | Object | string> {
  let filePath = rawFilePath;

  try {
    filePath = fixWindowsPath(filePath);
    if (require && require.cache) {
      filePath = require.resolve(filePath);

      if (require.cache[filePath]) {
        delete require.cache[filePath];
      }
    }

    const rawExports = await import(filePath);

    if (rawExports) {
      let rawExport = rawExports.default || rawExports.schema || rawExports.typeDefs || rawExports;

      if (rawExport) {
        let exportValue = await rawExport;
        exportValue = await (exportValue.default || exportValue.schema || exportValue.typeDefs || exportValue);
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

async function tryToLoadFromCodeAst(filePath: string, options?: CodeFileLoaderOptions): Promise<string> {
  const foundDoc = await gqlPluckFromFile(filePath, options && options.pluckConfig);
  if (foundDoc) {
    return foundDoc;
  } else {
    return null;
  }
}

export type CodeFileLoaderOptions = { require?: string | string[]; pluckConfig?: GraphQLTagPluckOptions } & SingleFileOptions;

const CODE_FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.vue'];

export class CodeFileLoader implements UniversalLoader<CodeFileLoaderOptions> {
  loaderId(): string {
    return 'code-file';
  }

  async canLoad(pointer: SchemaPointerSingle | DocumentPointerSingle, options: CodeFileLoaderOptions): Promise<boolean> {
    if (isValidPath(pointer)) {
      const extension = extname(pointer).toLowerCase();
      if (CODE_FILE_EXTENSIONS.includes(extension)) {
        const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || process.cwd(), pointer);
        if (existsSync(normalizedFilePath)) {
          return true;
        }
      }
    }

    return false;
  }

  async load(pointer: SchemaPointerSingle | DocumentPointerSingle, options: CodeFileLoaderOptions): Promise<Source> {
    const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || process.cwd(), pointer);

    try {
      const rawSDL = await tryToLoadFromCodeAst(normalizedFilePath, options);
      if (rawSDL) {
        return {
          location: normalizedFilePath,
          rawSDL,
        };
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
      loaded = loaded['data'] || loaded;
      if (loaded instanceof GraphQLSchema) {
        const schema = fixSchemaAst(loaded, options);
        return {
          location: normalizedFilePath,
          schema,
        };
      } else if (typeof loaded === 'string') {
        return {
          location: normalizedFilePath,
          rawSDL: loaded,
        };
      } else if ('kind' in loaded && loaded.kind === 'Document') {
        return {
          location: normalizedFilePath,
          document: loaded,
        };
      } else if ('__schema' in loaded) {
        return {
          schema: buildClientSchema(loaded, options),
          location: normalizedFilePath,
        };
      }
    }

    return null;
  }
}
