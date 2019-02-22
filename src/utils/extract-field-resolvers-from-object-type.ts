import { GraphQLObjectType, GraphQLInterfaceType, DocumentNode, buildASTSchema } from "graphql";

export interface IFieldResolvers {
    [fieldName: string]: ((...args: any[]) => any) | { subscribe: (...args: any[]) => any };
}

export interface ExtractFieldResolversFromObjectType {
    selectedTypeDefs?: DocumentNode;
}

export function extractFieldResolversFromObjectType(objectType: GraphQLObjectType | GraphQLInterfaceType, options ?: ExtractFieldResolversFromObjectType): IFieldResolvers {
    const fieldResolvers: IFieldResolvers = {};
    const fieldMap = objectType.getFields();
    let selectedFieldNames: string[];
    if (options && options.selectedTypeDefs) {
        const invalidSchema = buildASTSchema(options.selectedTypeDefs);
        const typeMap = invalidSchema.getTypeMap();
        if (! (objectType.name in typeMap)) {
            return {};
        } else {
            const selectedObjectType = typeMap[objectType.name] as GraphQLObjectType | GraphQLInterfaceType;
            selectedFieldNames = Object.keys(selectedObjectType.getFields());
        }
    }
    for ( const fieldName in fieldMap ) {
        if (selectedFieldNames && !selectedFieldNames.includes(fieldName)) {
            continue;
        }
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
