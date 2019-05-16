import { GraphQLSchema, DocumentNode } from 'graphql';
import { IntrospectionFromUrlLoader } from './introspection-from-url';
import { IntrospectionFromFileLoader } from './introspection-from-file';
import { SchemaFromString } from './schema-from-string';
import { SchemaFromTypedefs } from './schema-from-typedefs';
import { SchemaFromExport } from './schema-from-export';
import { debugLog } from '../../utils/debugLog';

export { IntrospectionFromUrlLoader } from './introspection-from-url';
export { IntrospectionFromFileLoader } from './introspection-from-file';
export { SchemaFromString } from './schema-from-string';
export { SchemaFromTypedefs } from './schema-from-typedefs';
export { SchemaFromExport } from './schema-from-export';

export const loadSchema = async <T = any>(
  pointToSchema: string,
  options?: T,
  schemaHandlers = [new IntrospectionFromUrlLoader(), new IntrospectionFromFileLoader(), new SchemaFromString(), new SchemaFromExport(), new SchemaFromTypedefs()]
): Promise<GraphQLSchema | DocumentNode> => {
  for (const handler of schemaHandlers) {
    debugLog(`Trying to use schema handler ${handler.constructor.name}...`);
    const canHandle = await handler.canHandle(pointToSchema);
    debugLog(`Schema loader ${handler.constructor.name} returned "${canHandle}" for "${pointToSchema}"...`);

    if (canHandle) {
      return handler.handle(pointToSchema, options);
    }
  }

  throw new Error('Failed to load schema');
};
