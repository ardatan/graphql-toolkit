import { loadSchema } from '@graphql-toolkit/core';
import { JsonFileLoader } from '@graphql-toolkit/json-file-loader';
import { GraphQLSchema, introspectionFromSchema, printSchema } from 'graphql';
import { join } from 'path';

describe('Schema From Export', () => {
    it('should load the schema correctly from an introspection file', async () => {
      const result = await loadSchema('./tests/loaders/schema/test-files/githunt.json', {
        loaders: [new JsonFileLoader()]
      });
      expect(result instanceof GraphQLSchema).toBeTruthy();
    });
});
