import { loadTypedefs, LoadTypedefsOptions, UnnormalizedTypeDefPointer } from './load-typedefs';
import { GraphQLSchema, BuildSchemaOptions, DocumentNode } from 'graphql';
import { OPERATION_KINDS } from './documents';
import { mergeSchemasAsync, MergeSchemasConfig } from '@graphql-toolkit/schema-merging';

export type LoadSchemaOptions = BuildSchemaOptions & LoadTypedefsOptions & Partial<MergeSchemasConfig>;

export async function loadSchema(
  schemaPointers: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[],
  options: LoadSchemaOptions
): Promise<GraphQLSchema> {
  const sources = await loadTypedefs(schemaPointers, {
    filterKinds: OPERATION_KINDS,
    ...options,
  });

  const schemas: GraphQLSchema[] = [];
  const typeDefs: DocumentNode[] = [];

  sources.forEach(source => {
    if (source.schema) {
      schemas.push(source.schema);
    } else {
      typeDefs.push(source.document);
    }
  });

  const mergeSchemasOptions: MergeSchemasConfig = {
    schemas,
    typeDefs,
    ...options,
  };

  return mergeSchemasAsync(mergeSchemasOptions);
}
