import { GraphQLSchema, BuildSchemaOptions, buildSchema } from 'graphql';
import { Options } from 'graphql/utilities/schemaPrinter';
import { printSchemaWithDirectives } from '.';

function buildFixedSchema(schema: GraphQLSchema, options: BuildSchemaOptions & Options) {
  return buildSchema(printSchemaWithDirectives(schema, options), {
    noLocation: true,
    ...(options || {}),
  });
}

export function fixSchemaAst(schema: GraphQLSchema, options: BuildSchemaOptions & Options) {
  let schemaWithValidAst: GraphQLSchema;
  if (!schema.astNode) {
    Object.defineProperty(schema, 'astNode', {
      get() {
        if (!schemaWithValidAst) {
          schemaWithValidAst = buildFixedSchema(schema, options);
        }
        return schemaWithValidAst.astNode;
      },
    });
  }
  if (!schema.extensionASTNodes) {
    Object.defineProperty(schema, 'extensionASTNodes', {
      get() {
        if (!schemaWithValidAst) {
          schemaWithValidAst = buildFixedSchema(schema, options);
        }
        return schemaWithValidAst.extensionASTNodes;
      },
    });
  }
  return schema;
}
