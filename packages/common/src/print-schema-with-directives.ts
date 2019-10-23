import { GraphQLSchema, print, printSchema, printType, GraphQLBoolean, GraphQLInt, GraphQLString, GraphQLFloat, GraphQLID } from 'graphql';

const IGNORED_SCALARS = [GraphQLBoolean.name, GraphQLInt.name, GraphQLString.name, GraphQLFloat.name, GraphQLID.name];

export function printSchemaWithDirectives(schema: GraphQLSchema): string {
  const allTypes = schema.getTypeMap();
  const allTypesAst = Object.keys(allTypes)
    .map(key => allTypes[key].astNode)
    .filter(a => a);
  const noAstTypes = Object.keys(allTypes)
    .map(key => (IGNORED_SCALARS.includes(key) || key.startsWith('__') || allTypes[key].astNode ? null : allTypes[key]))
    .filter(a => a);
  const directivesAst = schema
    .getDirectives()
    .map(def => def.astNode)
    .filter(a => a);

  if (allTypesAst.length === 0 && directivesAst.length === 0) {
    return printSchema(schema);
  } else {
    const astTypesPrinted = [...allTypesAst, ...directivesAst].map(ast => print(ast));
    const nonAstPrinted = noAstTypes.map(p => printType(p));

    return [...astTypesPrinted, ...nonAstPrinted].join('\n');
  }
}
