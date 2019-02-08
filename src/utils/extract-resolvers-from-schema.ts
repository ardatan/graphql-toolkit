import { GraphQLSchema, GraphQLScalarType, GraphQLObjectType, GraphQLInterfaceType } from "graphql";
import { IResolvers } from "graphql-tools";
import { extractFieldResolversFromObjectType } from "./extract-field-resolvers-from-object-type";

export function extractResolversFromSchema(schema: GraphQLSchema): IResolvers {
    const resolvers: IResolvers = {};
    const typeMap = schema.getTypeMap();
    for (const typeName in typeMap) {
        const typeDef = typeMap[typeName];
        if (typeDef instanceof GraphQLScalarType) {
            resolvers[typeName] = typeDef as GraphQLScalarType;
        } else if (typeDef instanceof GraphQLObjectType || typeDef instanceof GraphQLInterfaceType) {
            resolvers[typeName] = extractFieldResolversFromObjectType(typeDef);
        }
    }
    return resolvers;
}