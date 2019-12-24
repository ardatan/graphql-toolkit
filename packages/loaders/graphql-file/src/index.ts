import { Source, UniversalLoader, DocumentPointerSingle, SchemaPointerSingle, isValidPath } from '@graphql-toolkit/common';
import { parse, Source as GraphQLSource, Kind } from 'graphql';
import { extname, isAbsolute, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

export type GraphQLFileLoaderOptions = { skipGraphQLImport?: boolean; cwd?: string };

const GQL_EXTENSIONS = ['.gql', '.graphql', '.graphqls'];

export class GraphQLFileLoader implements UniversalLoader<GraphQLFileLoaderOptions> {
  loaderId(): string {
    return 'graphql-file';
  }

  async canLoad(pointer: SchemaPointerSingle | DocumentPointerSingle, options: GraphQLFileLoaderOptions): Promise<boolean> {
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

  async load(pointer: SchemaPointerSingle | DocumentPointerSingle, options: GraphQLFileLoaderOptions): Promise<Source> {
    const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || process.cwd(), pointer);
    const content = readFileSync(normalizedFilePath, 'utf-8').trim();

    if (content && content !== '') {
      if (!options.skipGraphQLImport && /^\#.*import /i.test(content.trimLeft())) {
        return {
          location: pointer,
          get document() {
            try {
              return parse(new GraphQLSource(content, pointer));
            } catch (e) {
              return {
                kind: Kind.DOCUMENT,
                definitions: [],
              };
            }
          },
          rawSDL: content,
        };
      } else {
        return {
          location: pointer,
          document: parse(new GraphQLSource(content, pointer)),
          rawSDL: content,
        };
      }
    }

    return null;
  }
}
