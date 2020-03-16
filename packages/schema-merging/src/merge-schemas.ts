import { GraphQLSchema, DocumentNode, buildASTSchema, BuildSchemaOptions, buildSchema } from 'graphql';
import {
  IResolvers,
  SchemaDirectiveVisitor,
  IResolverValidationOptions,
  ILogger,
  addResolveFunctionsToSchema,
  addErrorLoggingToSchema,
} from 'graphql-tools-fork';
import { mergeTypeDefs, Config } from './typedefs-mergers/merge-typedefs';
import { mergeResolvers } from './merge-resolvers';
import {
  extractResolversFromSchema,
  ResolversComposerMapping,
  composeResolvers,
  asArray,
} from '@graphql-toolkit/common';
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

const defaultResolverValidationOptions: Partial<IResolverValidationOptions> = {
  requireResolversForArgs: false,
  requireResolversForNonScalar: false,
  requireResolversForAllFields: false,
  requireResolversForResolveType: false,
  allowResolversNotInSchema: true,
};

export function mergeSchemas(config: MergeSchemasConfig) {
  const typeDefs = mergeTypes(config);
  const resolvers = composeResolvers(
    mergeResolvers(
      [...config.schemas.map(schema => extractResolversFromSchema(schema)), ...ensureResolvers(config)],
      config
    ),
    config.resolversComposition || {}
  );

  return makeSchema({ resolvers, typeDefs }, config);
}

export async function mergeSchemasAsync(config: MergeSchemasConfig) {
  const [typeDefs, resolvers] = await Promise.all([
    mergeTypes(config),
    Promise.all(config.schemas.map(async schema => extractResolversFromSchema(schema))).then(extractedResolvers =>
      composeResolvers(
        mergeResolvers([...extractedResolvers, ...ensureResolvers(config)], config),
        config.resolversComposition || {}
      )
    ),
  ]);

  return makeSchema({ resolvers, typeDefs }, config);
}

function mergeTypes({ schemas, typeDefs, ...config }: MergeSchemasConfig) {
  return mergeTypeDefs([...schemas, ...(typeDefs ? asArray(typeDefs) : [])], config);
}

function ensureResolvers(config: MergeSchemasConfig) {
  return config.resolvers ? asArray<IResolvers>(config.resolvers) : [];
}

function makeSchema(
  { resolvers, typeDefs }: { resolvers: IResolvers; typeDefs: string | DocumentNode },
  config: MergeSchemasConfig
) {
  const extensions = mergeExtensions(config.schemas.map(s => extractExtensionsFromSchema(s)));

  let schema = typeof typeDefs === 'string' ? buildSchema(typeDefs, config) : buildASTSchema(typeDefs, config);

  // add resolvers
  if (resolvers) {
    schema = addResolveFunctionsToSchema({
      schema,
      resolvers,
      resolverValidationOptions: {
        ...defaultResolverValidationOptions,
        ...(config.resolverValidationOptions || {}),
      },
    });
  }

  // use logger
  if (config.logger) {
    addErrorLoggingToSchema(schema, config.logger);
  }

  // use schema directives
  if (config.schemaDirectives) {
    SchemaDirectiveVisitor.visitSchemaDirectives(schema, config.schemaDirectives);
  }

  // extensions
  applyExtensions(schema, extensions);

  return schema;
}
