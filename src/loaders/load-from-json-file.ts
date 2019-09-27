import { DocumentNode, IntrospectionQuery, buildClientSchema, parse } from 'graphql';
import { printSchemaWithDirectives } from '../utils/print-schema-with-directives';

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

export async function loadFromJsonFile(filePath: string): Promise<DocumentNode> {
  return new Promise<DocumentNode>((resolve, reject) => {
    const { existsSync, readFileSync } = eval(`require('fs')`);
    if (existsSync(filePath)) {
      try {
        const fileContent = readFileSync(filePath, 'utf8');

        if (!fileContent) {
          reject(`Unable to read local introspection file: ${filePath}`);
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

        resolve(parse(printed));
      } catch (e) {
        reject(e);
      }
    } else {
      reject(`Unable to locate local introspection file: ${filePath}`);
    }
  });
}
