import { loadSchema } from '../../../src';

describe('loadSchema', () => {
  it('should throw when all files are invalid and unable to load it', async () => {
    const schemaPath = './tests/loaders/schema/test-files/error.ts';
    try {
      await loadSchema(schemaPath);
      expect(true).toBeFalsy(); // should throw
    } catch (e) {
      expect(e.toString()).toContain(`SyntaxError`);
    }
  });

  it('should work with ts files and without globs correctly', async () => {
    const schemaPath = './tests/loaders/schema/test-files/schema-dir/type-defs/graphql-tag.ts';
    const schema = await loadSchema(schemaPath);
    expect(schema.getTypeMap()['User']).toBeDefined();
    expect(schema.getTypeMap()['Query']).toBeDefined();
  });

  it('should work with graphql single file', async () => {
    const schemaPath = './tests/loaders/schema/test-files/schema-dir/user.graphql';
    const schema = await loadSchema(schemaPath);

    expect(schema.getTypeMap()['User']).toBeDefined();
  });
});
