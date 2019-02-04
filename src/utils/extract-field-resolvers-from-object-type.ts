import { GraphQLObjectType, GraphQLInterfaceType } from "graphql";

export interface IFieldResolvers {
    [fieldName: string]: ((...args: any[]) => any) | { subscribe: (...args: any[]) => any };
}

export function extractFieldResolversFromObjectType(objectType: GraphQLObjectType | GraphQLInterfaceType): IFieldResolvers {
    const fieldResolvers: IFieldResolvers = {};
    const fieldMap = objectType.getFields();
    for ( const fieldName in fieldMap ) {
        const fieldDefinition = fieldMap[fieldName];
        if ('subscribe' in fieldDefinition) {
            fieldResolvers[fieldName] = {
                subscribe: fieldDefinition.subscribe,
            }
        } else if ('resolve' in fieldDefinition) {
            fieldResolvers[fieldName] = fieldDefinition.resolve;
        }
    }
    return fieldResolvers;
}
