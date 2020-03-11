import { GraphQLSchema, DocumentNode, buildASTSchema, BuildSchemaOptions, buildSchema } from 'graphql';
import { IResolvers, SchemaDirectiveVisitor, IResolverValidationOptions, ILogger, addResolveFunctionsToSchema, addErrorLoggingToSchema } from 'graphql-tools-fork';
import { mergeTypeDefs, Config } from './typedefs-mergers/merge-typedefs';
import { mergeResolvers } from './merge-resolvers';
import { extractResolversFromSchema, ResolversComposerMapping, composeResolvers, asArray } from '@graphql-toolkit/common';
import { mergeExtensions, extractExtensionsFromSchema, applyExtensions } from './extensions';

export interface MergeSchemasConfig<Resolvers extends IResolvers = IResolvers> extends Config, BuildSchemaOptions {
  schemas: GraphQLSchema[];
  typeDefs?: (DocumentNode | string)[] | DocumentNode | string;
  resolvers?: Resolvers | Resolvers[];
  resolversComposition?: ResolversComposerMapping<Resolvers>;
  schemaDirectives?: { [directiveName: string]: typeof SchemaDirectiveVisitor };
  resolverValidationOptions?: IResolverValidationOptions;
  logger?: ILogger;
}

export function mergeSchemas({ schemas, typeDefs, resolvers, resolversComposition, schemaDirectives, resolverValidationOptions, logger, ...config }: MergeSchemasConfig) {
  const typeDefsOutput = mergeTypeDefs([...schemas, ...(typeDefs ? asArray(typeDefs) : [])], config);
  const resolversOutput = composeResolvers(mergeResolvers([...schemas.map(schema => extractResolversFromSchema(schema)), ...(resolvers ? asArray<IResolvers>(resolvers) : [])], config), resolversComposition || {});
  const extensionsOutput = mergeExtensions(schemas.map(s => extractExtensionsFromSchema(s)));
  let schema = typeof typeDefsOutput === 'string' ? buildSchema(typeDefsOutput, config) : buildASTSchema(typeDefsOutput, config);
  applyExtensions(schema, extensionsOutput);

  if (resolversOutput) {
    schema = addResolveFunctionsToSchema({
      schema,
      resolvers: resolversOutput,
      resolverValidationOptions: {
        requireResolversForArgs: false,
        requireResolversForNonScalar: false,
        requireResolversForAllFields: false,
        requireResolversForResolveType: false,
        allowResolversNotInSchema: true,
        ...(resolverValidationOptions || {}),
      },
    });
  }

  if (logger) {
    addErrorLoggingToSchema(schema, logger);
  }

  if (schemaDirectives) {
    SchemaDirectiveVisitor.visitSchemaDirectives(schema, schemaDirectives);
  }

  return schema;
}

export async function mergeSchemasAsync({ schemas, typeDefs, resolvers, resolversComposition, schemaDirectives, resolverValidationOptions, logger, ...config }: MergeSchemasConfig) {
  const [typeDefsOutput, resolversOutput] = await Promise.all([
    mergeTypeDefs([...schemas, ...(typeDefs ? asArray(typeDefs) : [])], config),
    Promise.all(schemas.map(async schema => extractResolversFromSchema(schema))).then(extractedResolvers =>
      composeResolvers(mergeResolvers([...extractedResolvers, ...(resolvers ? asArray<IResolvers>(resolvers) : [])], config), resolversComposition || {})
    ),
  ]);

  let schema = typeof typeDefsOutput === 'string' ? buildSchema(typeDefsOutput, config) : buildASTSchema(typeDefsOutput, config);

  if (resolversOutput) {
    schema = addResolveFunctionsToSchema({
      schema,
      resolvers: resolversOutput,
      resolverValidationOptions: {
        requireResolversForArgs: false,
        requireResolversForNonScalar: false,
        requireResolversForAllFields: false,
        requireResolversForResolveType: false,
        allowResolversNotInSchema: true,
        ...(resolverValidationOptions || {}),
      },
    });
  }

  if (logger) {
    addErrorLoggingToSchema(schema, logger);
  }

  if (schemaDirectives) {
    SchemaDirectiveVisitor.visitSchemaDirectives(schema, schemaDirectives);
  }

  return schema;
}
