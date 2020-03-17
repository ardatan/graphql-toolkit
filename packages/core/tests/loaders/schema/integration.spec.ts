import { loadSchema, loadSchemaSync } from '@graphql-toolkit/core';
import { CodeFileLoader } from '@graphql-toolkit/code-file-loader';
import { GraphQLFileLoader } from '@graphql-toolkit/graphql-file-loader';
import { runTests } from '@testing-utils';

describe('loadSchema', () => {
  runTests({
    async: loadSchema,
    sync: loadSchemaSync
  })(load => {
    test('should throw when all files are invalid and unable to load it', async () => {
      const schemaPath = './tests/loaders/schema/test-files/error.ts';
      try {
        await load(schemaPath, {
          loaders: [new CodeFileLoader()]
        });
        expect(true).toBeFalsy(); // should throw
      } catch (e) {
        expect(e.toString()).toContain(`SyntaxError`);
      }
    });

    test('should work with ts files and without globs correctly', async () => {
      const schemaPath = './tests/loaders/schema/test-files/schema-dir/type-defs/graphql-tag.ts';
      const schema = await load(schemaPath, {
        loaders: [new CodeFileLoader()]
      });
      expect(schema.getTypeMap()['User']).toBeDefined();
      expect(schema.getTypeMap()['Query']).toBeDefined();
    });

    test('should work with graphql single file', async () => {
      const schemaPath = './tests/loaders/schema/test-files/schema-dir/user.graphql';
      const schema = await load(schemaPath, {
        loaders: [new GraphQLFileLoader()]
      });

      expect(schema.getTypeMap()['User']).toBeDefined();
    });
})
});
