import { GraphQLSchema, buildASTSchema, parse, BuildSchemaOptions } from 'graphql';
import { printSchemaWithDirectives } from '.';

export function fixSchemaAst(schema: GraphQLSchema, options?: BuildSchemaOptions) {
  if (!schema.astNode) {
    Object.defineProperty(schema, 'astNode', {
      get: () => {
        return buildASTSchema(parse(printSchemaWithDirectives(schema)), {
          commentDescriptions: true,
          ...(options || {}),
        }).astNode;
      },
    });
    Object.defineProperty(schema, 'extensionASTNodes', {
      get: () => {
        return buildASTSchema(parse(printSchemaWithDirectives(schema)), {
          commentDescriptions: true,
          ...(options || {}),
        }).extensionASTNodes;
      },
    });
  }
  return schema;
}
