import { GraphQLSchema, buildASTSchema, parse, BuildSchemaOptions, ParseOptions } from 'graphql';
import { printSchemaWithDirectives } from '.';

export function fixSchemaAst(schema: GraphQLSchema, options: BuildSchemaOptions) {
  if (!schema.astNode || !schema.extensionASTNodes) {
    const schemaWithValidAst = buildASTSchema(
      parse(printSchemaWithDirectives(schema), {
        noLocation: true,
        ...(options || {}),
      }),
      {
        commentDescriptions: true,
        ...(options || {}),
      }
    );
    if (!schema.astNode) {
      schema.astNode = schemaWithValidAst.astNode;
    }
    if (!schema.extensionASTNodes) {
      schema.extensionASTNodes = schemaWithValidAst.extensionASTNodes;
    }
  }
  return schema;
}
