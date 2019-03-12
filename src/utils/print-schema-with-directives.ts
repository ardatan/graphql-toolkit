import { GraphQLSchema, print } from 'graphql';

export function printSchemaWithDirectives(schema: GraphQLSchema): string {
  const allTypes = schema.getTypeMap();
  const allTypesAst = Object.keys(allTypes).map(key => allTypes[key].astNode);

  return allTypesAst.map(ast => print(ast)).join('\n');
}
