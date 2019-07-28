import { loadTypedefs, LoadTypedefsOptions } from './load-typedefs';
import { buildASTSchema, GraphQLSchema } from 'graphql';
import { LoadFromUrlOptions } from './load-from-url';
import { OPERATION_KINDS } from './documents';
import { mergeTypeDefs } from '../epoxy';

export async function loadSchema(pointToSchema: string | string[], options?: LoadTypedefsOptions, cwd = process.cwd()): Promise<GraphQLSchema> {
  const types = await loadTypedefs<LoadFromUrlOptions>(pointToSchema, options, OPERATION_KINDS, cwd);

  return buildASTSchema(mergeTypeDefs(types.map(m => m.content)));
}
