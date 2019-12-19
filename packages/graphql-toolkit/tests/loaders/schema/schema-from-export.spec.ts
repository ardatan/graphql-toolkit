import { GraphQLSchema } from 'graphql';
import { loadSchema } from '../../../src';

describe('Schema From Export', () => {
  it('should load the schema correctly from module.exports', async () => {
    const result: any = await loadSchema('./tests/loaders/schema/test-files/loaders/module-exports.js');
    expect(result instanceof GraphQLSchema).toBeTruthy();
  });

  it('should load the schema (with extend) correctly from module.exports', async () => {
    const result: GraphQLSchema = await loadSchema('./tests/loaders/schema/test-files/schema-dir/with-extend.js');
    expect(result instanceof GraphQLSchema).toBeTruthy();
    expect(result.getQueryType().getFields()['hello']).toBeDefined();
  });

  it('should load the schema correctly from variable export', async () => {
    const result: any = await loadSchema('./tests/loaders/schema/test-files/loaders/schema-export.js');
    expect(result instanceof GraphQLSchema).toBeTruthy();
  });

  it('should load the schema correctly from default export', async () => {
    const result: any = await loadSchema('./tests/loaders/schema/test-files/loaders/default-export.js');
    expect(result instanceof GraphQLSchema).toBeTruthy();
  });

  it('should load the schema correctly from promise export', async () => {
    const result: any = await loadSchema('./tests/loaders/schema/test-files/loaders/promise-export.js');
    expect(result instanceof GraphQLSchema).toBeTruthy();
  });

  it('should load the schema correctly from promise export', async () => {
    const result: any = await loadSchema('./tests/loaders/schema/test-files/loaders/promise-export.js');
    expect(result instanceof GraphQLSchema).toBeTruthy();
  });

  it.only('should work with extensions (without schema definition)', async () => {
    const schemaPath = './tests/loaders/schema/test-files/schema-dir/extensions/export-schema.js';
    const schema = await loadSchema(schemaPath);
    const queryFields = Object.keys(schema.getQueryType().getFields());

    expect(queryFields).toContain('foo');
    expect(queryFields).toContain('bar');
  });

  it.only('should work with extensions (with schema definition)', async () => {
    const schemaPath = './tests/loaders/schema/test-files/schema-dir/extensions/export-schema-with-def.js';
    const schema = await loadSchema(schemaPath);
    const queryFields = Object.keys(schema.getQueryType().getFields());

    expect(queryFields).toContain('foo');
    expect(queryFields).toContain('bar');
  });
});
