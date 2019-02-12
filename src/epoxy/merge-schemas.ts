import { GraphQLSchema, DocumentNode } from "graphql";
import { IResolvers, SchemaDirectiveVisitor, makeExecutableSchema, IResolverValidationOptions } from "graphql-tools";
import { mergeTypeDefs } from "./typedefs-mergers/merge-typedefs";
import { asArray } from "../utils/helpers";
import { mergeResolvers } from "./resolvers-mergers/merge-resolvers";
import { extractResolversFromSchema } from "../utils";

export interface MergeSchemasConfig {
    schemas: GraphQLSchema[];
    typeDefs?: (DocumentNode | string)[] | DocumentNode | string;
    resolvers?: IResolvers | IResolvers[];
    schemaDirectives ?: { [directiveName: string] : typeof SchemaDirectiveVisitor };
    resolverValidationOptions ?: IResolverValidationOptions;
}

export function mergeSchemas(config: MergeSchemasConfig) {
    const typeDefs = mergeTypeDefs([
        ...config.schemas,
        ...config.typeDefs ? asArray(config.typeDefs) : []
    ]);
    const resolvers = mergeResolvers([
        ...config.schemas.map(schema => extractResolversFromSchema(schema)),
        ...config.resolvers ? asArray<IResolvers>(config.resolvers) : []
    ]);
    
    return makeExecutableSchema({
        typeDefs,
        resolvers,
        schemaDirectives: config.schemaDirectives,
        resolverValidationOptions: config.resolverValidationOptions
    })
}