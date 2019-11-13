import { loadTypedefsUsingLoaders, LoadTypedefsOptions, UnnormalizedTypeDefPointer } from './load-typedefs';
import { buildASTSchema, GraphQLSchema } from 'graphql';
import { OPERATION_KINDS } from './documents';
import { mergeTypeDefs } from '@graphql-toolkit/schema-merging';
import { Loader } from '@graphql-toolkit/common';

export async function loadSchemaUsingLoaders(loaders: Loader[], schemaPointers: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[], options?: LoadTypedefsOptions, cwd = process.cwd()): Promise<GraphQLSchema> {
  const types = await loadTypedefsUsingLoaders(loaders, schemaPointers, options, OPERATION_KINDS, cwd);

  return buildASTSchema(mergeTypeDefs(types.map(m => m.document)));
}
