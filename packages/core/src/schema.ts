import { loadTypedefs, LoadTypedefsOptions, UnnormalizedTypeDefPointer } from './load-typedefs';
import { GraphQLSchema, BuildSchemaOptions, DocumentNode } from 'graphql';
import { OPERATION_KINDS } from './documents';
import { mergeSchemasAsync, MergeSchemasConfig, mergeResolvers } from '@graphql-toolkit/schema-merging';
import { loadFilesAsync } from '@graphql-toolkit/file-loading';

export type LoadSchemaOptions = BuildSchemaOptions &
  LoadTypedefsOptions &
  Omit<MergeSchemasConfig, 'schemas' | 'typeDefs' | 'resolvers'> & {
    resolvers?: any;
  };

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

  let resolvers: any = {};

  if (options.resolvers) {
    if (typeof options.resolvers === 'string') {
      resolvers = await loadFilesAsync(options.resolvers);
    } else if (options.resolvers instanceof Array) {
      resolvers = mergeResolvers(
        await Promise.all(
          options.resolvers.map<any>(async r => (typeof options.resolvers === 'string' ? loadFilesAsync(r) : r))
        )
      );
    }
  }

  const mergeSchemasOptions: MergeSchemasConfig = {
    schemas,
    typeDefs,
    resolvers,
    ...options,
  };

  return mergeSchemasAsync(mergeSchemasOptions);
}
