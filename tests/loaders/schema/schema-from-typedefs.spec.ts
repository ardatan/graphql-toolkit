import { buildASTSchema } from 'graphql';
import { SchemaFromTypedefs } from '../../../src';

describe('schema from typedefs', () => {
  it('should work with glob correctly', async () => {
    const glob = './tests/loaders/schema/test-files/schema-dir/*.graphql';
    const handler = new SchemaFromTypedefs();
    const canHandle = await handler.canHandle(glob);

    expect(canHandle).toBeTruthy();

    const built = await handler.handle(glob);
    const schema = buildASTSchema(built);

    expect(schema.getTypeMap()['User']).toBeDefined();
    expect(schema.getTypeMap()['Query']).toBeDefined();
  });

  it('should ignore empty files when using glob expressions', async () => {
    const glob = './tests/loaders/schema/test-files/schema-dir/*.empty.graphql';
    const handler = new SchemaFromTypedefs();
    const canHandle = await handler.canHandle(glob);
    expect(canHandle).toBeTruthy();
    
    try {
      await handler.handle(glob);
      expect(true).toBeFalsy();
    } catch(e) {
      expect(e.message).toBe(`All found files for glob expression "./tests/loaders/schema/test-files/schema-dir/*.empty.graphql" are not valid or empty, please check it and try again!`);
    }
  });

  it('should ignore graphql documents when loading a scehma', async () => {
    const glob = './tests/loaders/schema/test-files/schema-dir/*.non-schema.graphql';
    const handler = new SchemaFromTypedefs();
    const canHandle = await handler.canHandle(glob);
    expect(canHandle).toBeTruthy();

    try {
      await handler.handle(glob);
      expect(true).toBeFalsy();
    } catch(e) {
      expect(e.message).toBe(`All found files for glob expression "./tests/loaders/schema/test-files/schema-dir/*.non-schema.graphql" are not valid or empty, please check it and try again!`);
    }
  });

  it('should work with graphql-tag', async () => {
    const schemaPath = './tests/loaders/schema/test-files/schema-dir/*.ts';
    const handler = new SchemaFromTypedefs();
    const canHandle = await handler.canHandle(schemaPath);

    expect(canHandle).toBeTruthy();

    const built = await handler.handle(schemaPath);
    const schema = buildASTSchema(built);

    expect(schema.getTypeMap()['User']).toBeDefined();
    expect(schema.getTypeMap()['Query']).toBeDefined();
  });

  it('should work without globs correctly', async () => {
    const schemaPath = './tests/loaders/schema/test-files/schema-dir/type-defs/graphql-tag.ts';
    const handler = new SchemaFromTypedefs();
    const canHandle = await handler.canHandle(schemaPath);

    expect(canHandle).toBeTruthy();

    const built = await handler.handle(schemaPath);
    const schema = buildASTSchema(built);

    expect(schema.getTypeMap()['User']).toBeDefined();
    expect(schema.getTypeMap()['Query']).toBeDefined();
  });

  it('should work with import notations', async () => {
    const schemaPath = './tests/loaders/schema/test-files/schema-dir/query.graphql';
    const handler = new SchemaFromTypedefs();
    const canHandle = await handler.canHandle(schemaPath);

    expect(canHandle).toBeTruthy();

    const built = await handler.handle(schemaPath);
    const schema = buildASTSchema(built);

    expect(schema.getTypeMap()['User']).toBeDefined();
    expect(schema.getTypeMap()['Query']).toBeDefined();
  });
});
