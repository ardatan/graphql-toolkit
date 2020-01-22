declare module 'relay-compiler/lib/core/Schema' {
  export function create(schema: string): import('graphql').GraphQLSchema;
}

declare module 'relay-compiler/lib/core/GraphQLIRPrinter' {
  export function print(schema: import('graphql').GraphQLSchema, document: any): string;
}

declare module 'relay-compiler/lib/core/GraphQLCompilerContext' {
  let GraphQLCompilerContext: typeof import('relay-compiler').GraphQLCompilerContext;
  export = GraphQLCompilerContext;
}
