import { Source, UniversalLoader, DocumentPointerSingle, SchemaPointerSingle, isValidPath, parseGraphQLSDL, SingleFileOptions } from '@graphql-toolkit/common';
import { ParseOptions } from 'graphql';
import { extname, isAbsolute, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

const GQL_EXTENSIONS = ['.gql', '.graphql', '.graphqls'];

export class GraphQLFileLoader implements UniversalLoader<SingleFileOptions> {
  loaderId(): string {
    return 'graphql-file';
  }

  async canLoad(pointer: SchemaPointerSingle | DocumentPointerSingle, options: SingleFileOptions): Promise<boolean> {
    if (isValidPath(pointer)) {
      const extension = extname(pointer).toLowerCase();
      if (GQL_EXTENSIONS.includes(extension)) {
        const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || process.cwd(), pointer);
        if (existsSync(normalizedFilePath)) {
          return true;
        }
      }
    }

    return false;
  }

  async load(pointer: SchemaPointerSingle | DocumentPointerSingle, options: SingleFileOptions): Promise<Source> {
    const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd, pointer);
    const rawSDL = readFileSync(normalizedFilePath, 'utf-8').trim();

    return parseGraphQLSDL(pointer, rawSDL, options);
  }
}
