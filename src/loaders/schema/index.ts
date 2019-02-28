import { GraphQLSchema, DocumentNode } from 'graphql';
import { IntrospectionFromUrlLoader } from './introspection-from-url';
import { IntrospectionFromFileLoader } from './introspection-from-file';
import { SchemaFromString } from './schema-from-string';
import { SchemaFromTypedefs } from './schema-from-typedefs';
import { SchemaFromExport } from './schema-from-export';

export { IntrospectionFromUrlLoader } from './introspection-from-url';
export { IntrospectionFromFileLoader } from './introspection-from-file';
export { SchemaFromString } from './schema-from-string';
export { SchemaFromTypedefs } from './schema-from-typedefs';
export { SchemaFromExport } from './schema-from-export';

export const loadSchema = async <T = any>(
  pointToSchema: string,
  options?: T,
  schemaHandlers = [new IntrospectionFromUrlLoader(), new IntrospectionFromFileLoader(), new SchemaFromString(), new SchemaFromTypedefs(), new SchemaFromExport()]
): Promise<GraphQLSchema | DocumentNode> => {
  for (const handler of schemaHandlers) {
    if (await handler.canHandle(pointToSchema)) {
      return handler.handle(pointToSchema, options);
    }
  }

  throw new Error('Failed to load schema');
};
