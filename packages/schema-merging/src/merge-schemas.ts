import { GraphQLSchema, DocumentNode } from 'graphql';
import { IResolvers, SchemaDirectiveVisitor, makeExecutableSchema, IResolverValidationOptions, ILogger } from '@kamilkisiela/graphql-tools';
import { mergeTypeDefs, Config } from './typedefs-mergers/merge-typedefs';
import { mergeResolvers } from './merge-resolvers';
import { extractResolversFromSchema, ResolversComposerMapping, composeResolvers, asArray } from '@graphql-toolkit/common';

export interface MergeSchemasConfig<Resolvers extends IResolvers = IResolvers> extends Config {
  schemas: GraphQLSchema[];
  typeDefs?: (DocumentNode | string)[] | DocumentNode | string;
  resolvers?: Resolvers | Resolvers[];
  resolversComposition?: ResolversComposerMapping<Resolvers>;
  schemaDirectives?: { [directiveName: string]: typeof SchemaDirectiveVisitor };
  resolverValidationOptions?: IResolverValidationOptions;
  logger?: ILogger;
}

export function mergeSchemas({ schemas, typeDefs, resolvers, resolversComposition, schemaDirectives, resolverValidationOptions, logger, ...config }: MergeSchemasConfig) {
  return makeExecutableSchema({
    typeDefs: mergeTypeDefs([...schemas, ...(typeDefs ? asArray(typeDefs) : [])], config),
    resolvers: composeResolvers(mergeResolvers([...schemas.map(schema => extractResolversFromSchema(schema)), ...(resolvers ? asArray<IResolvers>(resolvers) : [])], config), resolversComposition || {}),
    schemaDirectives,
    resolverValidationOptions,
    logger,
  });
}

export async function mergeSchemasAsync({ schemas, typeDefs, resolvers, resolversComposition, schemaDirectives, resolverValidationOptions, logger, ...config }: MergeSchemasConfig) {
  const [typeDefsOutput, resolversOutput] = await Promise.all([
    mergeTypeDefs([...schemas, ...(typeDefs ? asArray(typeDefs) : [])], config),
    Promise.all(schemas.map(async schema => extractResolversFromSchema(schema))).then(extractedResolvers =>
      composeResolvers(mergeResolvers([...extractedResolvers, ...(resolvers ? asArray<IResolvers>(resolvers) : [])], config), resolversComposition || {})
    ),
  ]);
  return makeExecutableSchema({
    typeDefs: typeDefsOutput,
    resolvers: resolversOutput,
    schemaDirectives,
    resolverValidationOptions,
    logger,
  });
}
