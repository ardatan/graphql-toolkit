import { loadSchema } from '@graphql-toolkit/core';
import { JsonFileLoader } from '@graphql-toolkit/json-file-loader';
import { isSchema } from 'graphql';

describe('Schema From Export', () => {
    it('should load the schema correctly from an introspection file', async () => {
      const result = await loadSchema('./tests/loaders/schema/test-files/githunt.json', {
        loaders: [new JsonFileLoader()]
      });
      expect(isSchema(result)).toBeTruthy();
    });
});
