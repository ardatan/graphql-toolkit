import { DocumentNode, GraphQLSchema, parse, IntrospectionQuery, buildClientSchema, Source as GraphQLSource } from 'graphql';
import { resolve, isAbsolute, extname } from 'path';
import { extractDocumentStringFromCodeFile, ExtractOptions } from './extract-document-string-from-code-file';
import { SchemaPointerSingle, DocumentPointerSingle, debugLog, printSchemaWithDirectives, Source, UniversalLoader, asArray } from '@graphql-toolkit/common';

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

function resolveExport(fileExport: GraphQLSchema | DocumentNode | string | { data: IntrospectionQuery } | IntrospectionQuery): DocumentNode | null {
  if (isSchemaObject(fileExport)) {
    return parse(printSchemaWithDirectives(fileExport));
  } else if (isSchemaText(fileExport)) {
    return parse(fileExport);
  } else if (isWrappedSchemaJson(fileExport)) {
    const asSchema = buildClientSchema(fileExport.data);
    const printed = printSchemaWithDirectives(asSchema);

    return parse(printed);
  } else if (isSchemaJson(fileExport)) {
    const asSchema = buildClientSchema(fileExport);
    const printed = printSchemaWithDirectives(asSchema);

    return parse(printed);
  } else if (isSchemaAst(fileExport)) {
    return fileExport;
  }

  return null;
}

async function tryToLoadFromExport(rawFilePath: string): Promise<DocumentNode> {
  let filePath = rawFilePath;

  try {
    if (require && require.cache) {
      filePath = eval(`require.resolve('${filePath}')`);

      if (require.cache[filePath]) {
        delete require.cache[filePath];
      }
    }

    const rawExports = await eval(`require('${filePath}');`);

    if (rawExports) {
      let rawExport = rawExports.default || rawExports.schema || rawExports;

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

async function tryToLoadFromCodeAst(filePath: string, options?: ExtractOptions): Promise<DocumentNode> {
  const { readFileSync } = eval(`require('fs')`);
  const content = readFileSync(filePath, 'utf-8');
  const foundDoc = await extractDocumentStringFromCodeFile(new GraphQLSource(content, filePath), options || {});

  if (foundDoc) {
    return parse(foundDoc);
  } else {
    return null;
  }
}

export type CodeFileLoaderOptions = ExtractOptions & { noRequire?: boolean; cwd?: string; require?: string | string[] };

const CODE_FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

export class CodeFileLoader implements UniversalLoader<CodeFileLoaderOptions> {
  loaderId(): string {
    return 'code-file';
  }

  async canLoad(pointer: SchemaPointerSingle | DocumentPointerSingle, options: CodeFileLoaderOptions): Promise<boolean> {
    const extension = extname(pointer).toLowerCase();

    return CODE_FILE_EXTENSIONS.includes(extension);
  }

  async load(pointer: SchemaPointerSingle | DocumentPointerSingle, options: CodeFileLoaderOptions): Promise<Source> {
    let loaded: DocumentNode | null = null;
    const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || process.cwd(), pointer);

    try {
      const result = await tryToLoadFromCodeAst(normalizedFilePath, options);

      if (result) {
        loaded = result;
      }
    } catch (e) {
      debugLog(`Failed to load schema from code file "${normalizedFilePath}" using AST: ${e.message}`);

      throw e;
    }

    if (!loaded && !options.noRequire) {
      if (options && options.require) {
        await Promise.all(asArray(options.require).map(m => import(m)));
      }
      loaded = await tryToLoadFromExport(normalizedFilePath);
    }

    return {
      document: loaded,
      location: normalizedFilePath,
    };
  }
}
