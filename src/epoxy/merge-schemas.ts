import { GraphQLSchema, DocumentNode } from "graphql";
import { IResolvers, SchemaDirectiveVisitor, makeExecutableSchema, IResolverValidationOptions, ILogger } from "graphql-tools";
import { mergeTypeDefs } from "./typedefs-mergers/merge-typedefs";
import { asArray } from "../utils/helpers";
import { mergeResolvers } from "./resolvers-mergers/merge-resolvers";
import { extractResolversFromSchema, ResolversComposerMapping, composeResolvers } from "../utils";

export interface MergeSchemasConfig<Resolvers = IResolvers> {
    schemas: GraphQLSchema[];
    typeDefs?: (DocumentNode | string)[] | DocumentNode | string;
    resolvers?: Resolvers | Resolvers[];
    resolversComposition?: ResolversComposerMapping<Resolvers>;
    schemaDirectives ?: { [directiveName: string] : typeof SchemaDirectiveVisitor };
    resolverValidationOptions ?: IResolverValidationOptions;
    logger?: ILogger;
}

export function mergeSchemas({
    schemas,
    typeDefs,
    resolvers,
    resolversComposition,
    schemaDirectives,
    resolverValidationOptions,
    logger
}: MergeSchemasConfig) {
    return makeExecutableSchema({
        typeDefs: mergeTypeDefs([
            ...schemas,
            ...typeDefs ? asArray(typeDefs) : []
        ]),
        resolvers: composeResolvers(
                mergeResolvers([
                ...schemas.map(schema => extractResolversFromSchema(schema)),
                ...resolvers ? asArray<IResolvers>(resolvers) : []
            ]),
            resolversComposition || {}
        ),
        schemaDirectives,
        resolverValidationOptions,
        logger
    })
}