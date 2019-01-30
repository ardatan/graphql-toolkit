import { GraphQLSchema, DocumentNode } from 'graphql';

export interface SchemaLoader<T = any> {
  canHandle(pointerToSchema: string): Promise<boolean> | boolean;
  handle(pointerToSchema: string, options: T): Promise<DocumentNode | GraphQLSchema> | DocumentNode | GraphQLSchema;
}
