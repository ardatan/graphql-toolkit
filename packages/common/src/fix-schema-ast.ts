import { GraphQLSchema, buildASTSchema, parse, BuildSchemaOptions, buildSchema } from 'graphql';
import { printSchemaWithDirectives } from '.';

export function fixSchemaAst(schema: GraphQLSchema, options: BuildSchemaOptions) {
  if (!schema.astNode || !schema.extensionASTNodes) {
    const schemaWithValidAst = buildSchema(printSchemaWithDirectives(schema), {
      noLocation: true,
      commentDescriptions: true,
      ...(options || {}),
    });
    if (!schema.astNode) {
      schema.astNode = schemaWithValidAst.astNode;
    }
    if (!schema.extensionASTNodes) {
      schema.extensionASTNodes = schemaWithValidAst.extensionASTNodes;
    }
  }
  return schema;
}
