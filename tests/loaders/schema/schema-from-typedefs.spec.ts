import { buildASTSchema } from 'graphql';
import { SchemaFromTypedefs } from '../../../src';

describe('schema from typedefs', () => {
  it('should work with glob correctly', () => {
    const glob = './tests/loaders/schema/test-files/schema-dir/*.graphql';
    const handler = new SchemaFromTypedefs();
    const canHandle = handler.canHandle(glob);

    expect(canHandle).toBeTruthy();

    const built = handler.handle(glob);
    const schema = buildASTSchema(built);

    expect(schema.getTypeMap()['User']).toBeDefined();
    expect(schema.getTypeMap()['Query']).toBeDefined();
  });

  it('should ignore empty files when using glob expressions', () => {
    const glob = './tests/loaders/schema/test-files/schema-dir/*.empty.graphql';
    const handler = new SchemaFromTypedefs();
    const canHandle = handler.canHandle(glob);
    expect(canHandle).toBeTruthy();
    expect(() => {
      handler.handle(glob);
    }).toThrow(`All found files for glob expression "./tests/loaders/schema/test-files/schema-dir/*.empty.graphql" are not valid or empty, please check it and try again!`);
  });

  it('should work with graphql-tag', () => {
    const schemaPath = './tests/loaders/schema/test-files/schema-dir/*.ts';
    const handler = new SchemaFromTypedefs();
    const canHandle = handler.canHandle(schemaPath);

    expect(canHandle).toBeTruthy();

    const built = handler.handle(schemaPath);
    const schema = buildASTSchema(built);

    expect(schema.getTypeMap()['User']).toBeDefined();
    expect(schema.getTypeMap()['Query']).toBeDefined();
  });

  it('should work with import notations', () => {
    const schemaPath = './tests/loaders/schema/test-files/schema-dir/query.graphql';
    const handler = new SchemaFromTypedefs();
    const canHandle = handler.canHandle(schemaPath);

    expect(canHandle).toBeTruthy();

    const built = handler.handle(schemaPath);
    const schema = buildASTSchema(built);

    expect(schema.getTypeMap()['User']).toBeDefined();
    expect(schema.getTypeMap()['Query']).toBeDefined();
  });
});
