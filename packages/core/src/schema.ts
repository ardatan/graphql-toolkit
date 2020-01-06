import { loadTypedefs, LoadTypedefsOptions, UnnormalizedTypeDefPointer } from './load-typedefs';
import { GraphQLSchema, BuildSchemaOptions, DocumentNode } from 'graphql';
import { OPERATION_KINDS } from './documents';
import { mergeSchemasAsync, MergeSchemasConfig } from '@graphql-toolkit/schema-merging';

export type LoadSchemaOptions = BuildSchemaOptions & LoadTypedefsOptions & Omit<MergeSchemasConfig, 'schemas' | 'typeDefs'>;

export async function loadSchema(schemaPointers: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[], options: LoadSchemaOptions): Promise<GraphQLSchema> {
  const sources = await loadTypedefs(schemaPointers, {
    filterKinds: OPERATION_KINDS,
    ...options,
  });

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
    ...options,
  });
}
