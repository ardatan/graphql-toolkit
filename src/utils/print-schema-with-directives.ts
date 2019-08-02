import { GraphQLSchema, print, printSchema } from 'graphql';

export function printSchemaWithDirectives(schema: GraphQLSchema): string {
  const allTypes = schema.getTypeMap();
  const allTypesAst = Object.keys(allTypes)
    .map(key => allTypes[key].astNode)
    .filter(a => a);
  const directivesAst = schema.getDirectives().map(def => def.astNode).filter(a => a);

  return allTypesAst.length === 0 && directivesAst.length === 0 ? printSchema(schema) : [...allTypesAst, ...directivesAst].map(ast => print(ast)).join('\n');
}
