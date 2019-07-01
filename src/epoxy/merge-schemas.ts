import { GraphQLSchema, DocumentNode } from "graphql";
import { IResolvers, SchemaDirectiveVisitor, makeExecutableSchema, IResolverValidationOptions, ILogger } from "@kamilkisiela/graphql-tools";
import { mergeTypeDefs } from "./typedefs-mergers/merge-typedefs";
import { asArray } from "../utils/helpers";
import { mergeResolvers } from "./resolvers-mergers/merge-resolvers";
import { extractResolversFromSchema, ResolversComposerMapping, composeResolvers } from "../utils";

export interface MergeSchemasConfig<Resolvers extends IResolvers = IResolvers> {
    schemas: GraphQLSchema[];
    typeDefs?: (DocumentNode | string)[] | DocumentNode | string;
    resolvers?: Resolvers | Resolvers[];
    resolversComposition?: ResolversComposerMapping<Resolvers>;
    schemaDirectives?: { [directiveName: string]: typeof SchemaDirectiveVisitor };
    resolverValidationOptions?: IResolverValidationOptions;
    logger?: ILogger;
    exclusions?: string[];
}

export function mergeSchemas({
    schemas,
    typeDefs,
    resolvers,
    resolversComposition,
    schemaDirectives,
    resolverValidationOptions,
    logger,
    exclusions,
}: MergeSchemasConfig) {
    return makeExecutableSchema({
        typeDefs: mergeTypeDefs([
            ...schemas,
            ...typeDefs ? asArray(typeDefs) : []
        ], { exclusions }),
        resolvers: composeResolvers(
            mergeResolvers([
                ...schemas.map(schema => extractResolversFromSchema(schema)),
                ...resolvers ? asArray<IResolvers>(resolvers) : []
            ], { exclusions }),
            resolversComposition || {}
        ),
        schemaDirectives,
        resolverValidationOptions,
        logger
    })
}

export async function mergeSchemasAsync({
    schemas,
    typeDefs,
    resolvers,
    resolversComposition,
    schemaDirectives,
    resolverValidationOptions,
    logger,
    exclusions,
}: MergeSchemasConfig) {
    const [
        typeDefsOutput,
        resolversOutput,
    ] = await Promise.all([
        mergeTypeDefs([
            ...schemas,
            ...typeDefs ? asArray(typeDefs) : []
        ], { exclusions }),
        Promise
            .all(schemas.map(async schema => extractResolversFromSchema(schema)))
            .then(extractedResolvers => composeResolvers(
                mergeResolvers([
                    ...extractedResolvers,
                    ...resolvers ? asArray<IResolvers>(resolvers) : []
                ], { exclusions }),
                resolversComposition || {}
            )),
    ])
    return makeExecutableSchema({
        typeDefs: typeDefsOutput,
        resolvers: resolversOutput,
        schemaDirectives,
        resolverValidationOptions,
        logger
    })
}