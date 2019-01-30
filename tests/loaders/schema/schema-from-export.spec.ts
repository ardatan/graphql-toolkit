import { GraphQLSchema } from 'graphql';
import { SchemaFromExport } from '../../../src/loaders/schema/schema-from-export';

describe('Schema From Export', () => {
  const instance = new SchemaFromExport();

  it('should load the schema correctly from module.exports', async () => {
    const result: any = await instance.handle('./tests/loaders/schema/test-files/loaders/module-exports.js');
    expect(result instanceof GraphQLSchema).toBeTruthy();
  });

  it('should load the schema correctly from variable export', async () => {
    const result: any = await instance.handle('./tests/loaders/schema/test-files/loaders/schema-export.js');
    expect(result instanceof GraphQLSchema).toBeTruthy();
  });

  it('should load the schema correctly from default export', async () => {
    const result: any = await instance.handle('./tests/loaders/schema/test-files/loaders/default-export.js');
    expect(result instanceof GraphQLSchema).toBeTruthy();
  });

  it('should load the schema correctly from promise export', async () => {
    const result: any = await instance.handle('./tests/loaders/schema/test-files/loaders/promise-export.js');
    expect(result instanceof GraphQLSchema).toBeTruthy();
  });
});
