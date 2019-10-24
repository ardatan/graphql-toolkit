import { Source, UniversalLoader, DocumentPointerSingle, SchemaPointerSingle } from '@graphql-toolkit/common';
import { parse, Source as GraphQLSource } from 'graphql';
import { extname, isAbsolute, resolve } from 'path';

export type GraphQLFileLoaderOptions = { skipGraphQLImport: boolean; cwd?: string };

const GQL_EXTENSIONS = ['.gql', '.graphql', '.graphqls'];

export class GraphQLFileLoader implements UniversalLoader<GraphQLFileLoaderOptions> {
  loaderId(): string {
    return 'graphql-file';
  }

  async canLoad(pointer: SchemaPointerSingle | DocumentPointerSingle, options: GraphQLFileLoaderOptions): Promise<boolean> {
    const extension = extname(pointer).toLowerCase();

    return GQL_EXTENSIONS.includes(extension);
  }

  async load(pointer: SchemaPointerSingle | DocumentPointerSingle, options: GraphQLFileLoaderOptions): Promise<Source> {
    const { readFileSync } = eval(`require('fs')`);
    const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || process.cwd(), pointer);
    const content = readFileSync(normalizedFilePath, 'utf-8').trim();

    if (content && content !== '') {
      if (!options.skipGraphQLImport && /^\#.*import /i.test(content.trimLeft())) {
        const { importSchema } = eval(`require('graphql-import')`);
        const importedSchema = importSchema(normalizedFilePath);

        return {
          location: pointer,
          document: parse(importedSchema),
        };
      } else {
        return {
          location: pointer,
          document: parse(new GraphQLSource(content, pointer)),
        };
      }
    }

    return null;
  }
}
