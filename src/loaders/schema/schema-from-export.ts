import AggregateError from 'aggregate-error';
import { existsSync } from 'fs';
import { extname, isAbsolute, resolve as resolvePath } from 'path';
import * as isValidPath from 'is-valid-path';
import { buildASTSchema, buildClientSchema, DocumentNode, GraphQLSchema, IntrospectionQuery, parse } from 'graphql';
import { SchemaLoader } from './schema-loader';
import { isGraphQLFile } from './schema-from-typedefs';
import * as isGlob from 'is-glob';
import { sync as globSync } from 'glob';
import { mergeTypeDefs } from '../../epoxy';
import { filter } from 'asyncro';

export class SchemaFromExport implements SchemaLoader {
  static getFiles(globOrValidPath: string): string[] {
    return (isGlob(globOrValidPath)
      ? globSync(globOrValidPath, {
          absolute: true,
          cwd: process.cwd(),
        })
      : [globOrValidPath]
    ).filter(file => !file.includes('node_modules') && !file.endsWith('.d.ts') && !file.endsWith('.spec.ts'));
  }

  async canHandle(globOrValidPath: string): Promise<boolean> {
    const files = SchemaFromExport.getFiles(globOrValidPath);

    for (let file of files) {
      const fullPath = isAbsolute(file) ? file : resolvePath(process.cwd(), file);

      if (isValidPath(file) && existsSync(fullPath) && extname(file) !== '.json' && !isGraphQLFile(fullPath)) {
        try {
          const exports = await import(fullPath);
          const schema = await (exports.default || exports.schema || exports);

          if (this.isSchemaObject(schema) || this.isSchemaAst(schema) || this.isSchemaText(schema) || this.isWrappedSchemaJson(schema) || this.isSchemaJson(schema)) {
            return true;
          }

          console.warn(`Invalid export from export file ${fullPath}: missing default export or 'schema' export!`);
        } catch (e) {
          throw new AggregateError([new Error(`Unable to load schem from file "${file}" due to import error: ${e}`), e]);
        }
      }
    }
    return false;
  }

  async handle(globOrValidPath: string, _options?: any): Promise<GraphQLSchema> {
    const files = SchemaFromExport.getFiles(globOrValidPath);

    const filtered = await filter(files, async file => await this.canHandle(file));

    const schemas = await Promise.all(
      filtered.map(async file => {
        const fullPath = isAbsolute(file) ? file : resolvePath(process.cwd(), file);

        if (existsSync(fullPath)) {
          const exports = await import(fullPath);

          if (exports) {
            let rawExport = exports.default || exports.schema || exports;

            if (rawExport) {
              let schema = await rawExport;
              schema = await (schema.default || schema.schema || schema);
              try {
                return await this.resolveSchema(schema);
              } catch (e) {
                throw new Error('Exported schema must be of type GraphQLSchema, text, AST, or introspection JSON.');
              }
            } else {
              throw new Error(`Invalid export from export file ${fullPath}: missing default export or 'schema' export!`);
            }
          } else {
            throw new Error(`Invalid export from export file ${fullPath}: empty export!`);
          }
        } else {
          throw new Error(`Unable to locate introspection from export file: ${fullPath}`);
        }
      })
    );

    if (schemas.length === 1) {
      return schemas[0];
    }

    const node = mergeTypeDefs(schemas);

    return buildASTSchema(node);
  }

  isSchemaText(obj: any): obj is string {
    return typeof obj === 'string';
  }

  isWrappedSchemaJson(obj: any): obj is { data: IntrospectionQuery } {
    const json = obj as { data: IntrospectionQuery };

    return json.data !== undefined && json.data.__schema !== undefined;
  }

  isSchemaJson(obj: any): obj is IntrospectionQuery {
    const json = obj as IntrospectionQuery;

    return json !== undefined && json.__schema !== undefined;
  }

  isSchemaObject(obj: any): obj is GraphQLSchema {
    return obj instanceof GraphQLSchema;
  }

  isSchemaAst(obj: any): obj is DocumentNode {
    return (obj as DocumentNode).kind !== undefined;
  }

  isPromise(obj: any): obj is Promise<any> {
    return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
  }

  async resolveSchema(schema: GraphQLSchema | DocumentNode | string | { data: IntrospectionQuery } | IntrospectionQuery) {
    if (this.isSchemaObject(schema)) {
      return schema;
    } else if (this.isSchemaText(schema)) {
      const ast = parse(schema);
      return buildASTSchema(ast);
    } else if (this.isWrappedSchemaJson(schema)) {
      return buildClientSchema(schema.data);
    } else if (this.isSchemaJson(schema)) {
      return buildClientSchema(schema);
    } else if (this.isSchemaAst(schema)) {
      return buildASTSchema(schema);
    } else {
      throw new Error('Unexpected schema type provided!');
    }
  }
}
