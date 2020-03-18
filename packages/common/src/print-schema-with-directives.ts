import {
  GraphQLSchema,
  print,
  printType,
  GraphQLNamedType,
  Kind,
  ObjectTypeExtensionNode,
  isSpecifiedScalarType,
  isIntrospectionType,
  isScalarType,
} from 'graphql';
import { Options } from 'graphql/utilities/schemaPrinter';
import { createSchemaDefinition } from './create-schema-definition';

export function printSchemaWithDirectives(schema: GraphQLSchema, options: Options = {}): string {
  const typesMap = schema.getTypeMap();

  const result: string[] = [
    createSchemaDefinition({
      query: schema.getQueryType(),
      mutation: schema.getMutationType(),
      subscription: schema.getSubscriptionType(),
    }),
  ];

  for (const typeName in typesMap) {
    const type = typesMap[typeName];
    const isPredefinedScalar = isScalarType(type) && isSpecifiedScalarType(type);
    const isIntrospection = isIntrospectionType(type);

    if (isPredefinedScalar || isIntrospection) {
      continue;
    }

    if (type.astNode) {
      result.push(print(type.extensionASTNodes ? extendDefinition(type) : type.astNode));
    } else {
      // KAMIL: we might want to turn on descriptions in future
      result.push(printType(correctType(typeName, typesMap), { commentDescriptions: options.commentDescriptions }));
    }
  }

  const directives = schema.getDirectives();
  for (const directive of directives) {
    if (directive.astNode) {
      result.push(print(directive.astNode));
    }
  }

  return result.join('\n');
}

function extendDefinition(type: GraphQLNamedType): GraphQLNamedType['astNode'] {
  switch (type.astNode.kind) {
    case Kind.OBJECT_TYPE_DEFINITION:
      return {
        ...type.astNode,
        fields: type.astNode.fields.concat(
          (type.extensionASTNodes as ReadonlyArray<ObjectTypeExtensionNode>).reduce(
            (fields, node) => fields.concat(node.fields),
            []
          )
        ),
      };
    case Kind.INPUT_OBJECT_TYPE_DEFINITION:
      return {
        ...type.astNode,
        fields: type.astNode.fields.concat(
          (type.extensionASTNodes as ReadonlyArray<ObjectTypeExtensionNode>).reduce(
            (fields, node) => fields.concat(node.fields),
            []
          )
        ),
      };
    default:
      return type.astNode;
  }
}

function correctType<TMap extends { [key: string]: GraphQLNamedType }, TName extends keyof TMap>(
  typeName: TName,
  typesMap: TMap
): TMap[TName] {
  const type = typesMap[typeName];

  type.name = typeName.toString();

  return type;
}
