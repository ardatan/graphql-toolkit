import { extname, isAbsolute, resolve as resolvePath } from 'path';
import { IntrospectionQuery, buildClientSchema, parse } from 'graphql';
import { Source, printSchemaWithDirectives, SchemaPointerSingle, DocumentLoader, isValidPath } from '@graphql-toolkit/common';
import { existsSync, readFileSync } from 'fs';

function stripBOM(content: string): string {
  content = content.toString();
  // Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
  // because the buffer-to-string conversion in `fs.readFileSync()`
  // translates it to FEFF, the UTF-16 BOM.
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  return content;
}

function parseBOM(content: string): IntrospectionQuery {
  return JSON.parse(stripBOM(content));
}

export interface JsonFileLoaderOptions {
  cwd?: string;
}

export class JsonFileLoader implements DocumentLoader {
  loaderId(): string {
    return 'json-file';
  }

  async canLoad(pointer: SchemaPointerSingle, options: JsonFileLoaderOptions): Promise<boolean> {
    if (isValidPath(pointer)) {
      const extension = extname(pointer).toLowerCase();
      if (extension === '.json') {
        const normalizedFilePath = isAbsolute(pointer) ? pointer : resolvePath(options.cwd || process.cwd(), pointer);
        if (existsSync(normalizedFilePath)) {
          return true;
        }
      }
    }

    return false;
  }

  async load(pointer: SchemaPointerSingle, options: JsonFileLoaderOptions): Promise<Source> {
    return new Promise<Source>((resolve, reject) => {
      const normalizedFilepath = isAbsolute(pointer) ? pointer : resolvePath(options.cwd || process.cwd(), pointer);

      if (existsSync(normalizedFilepath)) {
        try {
          const fileContent = readFileSync(normalizedFilepath, 'utf8');

          if (!fileContent) {
            reject(`Unable to read local introspection file: ${normalizedFilepath}`);
          }

          let introspection = parseBOM(fileContent);

          if (introspection['data']) {
            introspection = introspection['data'] as IntrospectionQuery;
          }

          if (!introspection.__schema) {
            throw new Error('Invalid schema provided!');
          }

          const schema = buildClientSchema(introspection, options as any);

          resolve({
            location: pointer,
            get document() {
              return parse(printSchemaWithDirectives(schema));
            },
            schema,
          });
        } catch (e) {
          reject(e);
        }
      } else {
        reject(`Unable to locate local introspection file: ${normalizedFilepath}`);
      }
    });
  }
}
