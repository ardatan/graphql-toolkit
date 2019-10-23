import { extname } from 'path';
import { IntrospectionQuery, buildClientSchema, parse } from 'graphql';
import { Source, printSchemaWithDirectives, SchemaPointerSingle, DocumentLoader } from '@graphql-toolkit/common';

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

export class JsonFileLoader implements DocumentLoader {
  loaderId(): string {
    return 'json-file';
  }

  async canLoad(pointer: SchemaPointerSingle, options: any): Promise<boolean> {
    const extension = extname(pointer).toLowerCase();

    return extension === '.json';
  }

  async load(pointer: SchemaPointerSingle, options: any): Promise<Source> {
    return new Promise<Source>((resolve, reject) => {
      const { existsSync, readFileSync } = eval(`require('fs')`);

      if (existsSync(pointer)) {
        try {
          const fileContent = readFileSync(pointer, 'utf8');

          if (!fileContent) {
            reject(`Unable to read local introspection file: ${pointer}`);
          }

          let introspection = parseBOM(fileContent);

          if (introspection['data']) {
            introspection = introspection['data'] as IntrospectionQuery;
          }

          if (!introspection.__schema) {
            throw new Error('Invalid schema provided!');
          }

          const asSchema = buildClientSchema(introspection);
          const printed = printSchemaWithDirectives(asSchema);

          resolve({
            location: pointer,
            document: parse(printed),
          });
        } catch (e) {
          reject(e);
        }
      } else {
        reject(`Unable to locate local introspection file: ${pointer}`);
      }
    });
  }
}
