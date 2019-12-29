import { extname, isAbsolute, resolve as resolvePath } from 'path';
import { Source, parseGraphQLJSON, SchemaPointerSingle, DocumentLoader, isValidPath, SingleFileOptions } from '@graphql-toolkit/common';
import { existsSync, readFileSync } from 'fs';

export class JsonFileLoader implements DocumentLoader {
  loaderId(): string {
    return 'json-file';
  }

  async canLoad(pointer: SchemaPointerSingle, options: SingleFileOptions): Promise<boolean> {
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

  async load(pointer: SchemaPointerSingle, options: SingleFileOptions): Promise<Source> {
    const normalizedFilepath = isAbsolute(pointer) ? pointer : resolvePath(options.cwd || process.cwd(), pointer);

    try {
      const jsonContent = readFileSync(normalizedFilepath, 'utf8');
      return parseGraphQLJSON(pointer, jsonContent, options);
    } catch (e) {
      throw new Error(`Unable to read JSON file: ${normalizedFilepath}`);
    }
  }
}
