import { DocumentNode, GraphQLSchema, Source, parse, IntrospectionQuery, buildClientSchema } from 'graphql';
import { readFileSync } from 'fs';
import { extractDocumentStringFromCodeFile, ExtractOptions } from '../utils/extract-document-string-from-code-file';
import { printSchemaWithDirectives } from '../utils';
import { debugLog } from '../utils/debugLog';

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
async function tryToLoadFromExport(filePath: string): Promise<DocumentNode> {
  try {
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
    throw new Error(`Unable to load schema from file "${filePath}" due to import error: ${e.message}`);
  }
}

async function tryToLoadFromCodeAst(filePath: string, options?: ExtractOptions): Promise<DocumentNode> {
  const content = readFileSync(filePath, 'utf-8');
  const foundDoc = await extractDocumentStringFromCodeFile(new Source(content, filePath), options || {});

  if (foundDoc) {
    return parse(foundDoc);
  } else {
    return null;
  }
}

export async function loadFromCodeFile(filePath: string, options: ExtractOptions & { noRequire?: boolean }): Promise<DocumentNode> {
  let loaded: DocumentNode | null = null;

  try {
    const result = await tryToLoadFromCodeAst(filePath, options);

    if (result) {
      loaded = result;
    }
  } catch (e) {
    debugLog(`Failed to load schema from code file "${filePath}" using AST: ${e.message}`);
  }

  if (!loaded && !options.noRequire) {
    loaded = await tryToLoadFromExport(filePath);
  }

  return loaded;
}
