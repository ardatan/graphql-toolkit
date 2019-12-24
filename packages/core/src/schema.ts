import { loadTypedefsUsingLoaders, LoadTypedefsOptions, UnnormalizedTypeDefPointer } from './load-typedefs';
import { GraphQLSchema, BuildSchemaOptions, DocumentNode } from 'graphql';
import { OPERATION_KINDS } from './documents';
import { mergeSchemasAsync } from '@graphql-toolkit/schema-merging';
import { Loader } from '@graphql-toolkit/common';

export type LoadSchemaOptions = BuildSchemaOptions & LoadTypedefsOptions;

export async function loadSchemaUsingLoaders(loaders: Loader[], schemaPointers: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[], options?: LoadSchemaOptions, cwd = process.cwd()): Promise<GraphQLSchema> {
  const sources = await loadTypedefsUsingLoaders(loaders, schemaPointers, options, OPERATION_KINDS, cwd);

  const schemas: GraphQLSchema[] = [];
  const typeDefs: DocumentNode[] = [];

  await Promise.all(
    sources.map(async source => {
      if (source.schema) {
        schemas.push(source.schema);
      } else {
        typeDefs.push(source.document);
      }
    })
  );

  return mergeSchemasAsync({
    schemas,
    typeDefs,
  });
}
