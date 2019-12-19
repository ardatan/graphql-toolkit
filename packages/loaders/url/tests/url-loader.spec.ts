jest.mock('cross-fetch');
import { makeExecutableSchema } from '@kamilkisiela/graphql-tools';
import { introspectionFromSchema } from 'graphql';
import { UrlLoader } from '../src';
import { printSchemaWithDirectives } from '@graphql-toolkit/common';

const SHOULD_NOT_GET_HERE_ERROR = 'SHOULD_NOT_GET_HERE';

describe('Schema URL Loader', () => {
  const loader = new UrlLoader();
  const resetMocks = () => require('cross-fetch').__resetMocks();
  const mockRequest = (url: string, content: string) => require('cross-fetch').__registerUrlRequestMock(url, content);
  const getMockedCalls = (url: string) => require('cross-fetch').__getCalls(url);

  beforeEach(() => {
    resetMocks();
  });

  const testSchema = makeExecutableSchema({ typeDefs: 'type Query { a: String }' });

  const VALID_INTROSPECTION = introspectionFromSchema(testSchema);

  describe('handle', () => {
    it('Should throw an error when introspection is not valid', async () => {
      const testUrl = 'http://localhost:3000/graphql';
      mockRequest(testUrl, JSON.stringify({ data: {} }));

      try {
        await loader.load(testUrl, {});
        throw new Error(SHOULD_NOT_GET_HERE_ERROR);
      } catch (e) {
        expect(e.message).not.toBe(SHOULD_NOT_GET_HERE_ERROR);
        expect(e.message).toBe('Invalid schema provided!');
      }

      const calls = getMockedCalls(testUrl);
      expect(calls.length).toBe(1);
    });

    it('Should return a valid schema when request is valid', async () => {
      const testUrl = 'http://localhost:3000/graphql';
      mockRequest(testUrl, JSON.stringify({ data: VALID_INTROSPECTION }));

      const schema = await loader.load(testUrl, {});
      expect(schema.schema).toBeDefined();
      expect(printSchemaWithDirectives(schema.schema)).toBe(printSchemaWithDirectives(testSchema));

      const calls = getMockedCalls(testUrl);
      expect(calls.length).toBe(1);
    });

    it('Should pass default headers', async () => {
      const testUrl = 'http://localhost:3000/graphql';
      mockRequest(testUrl, JSON.stringify({ data: VALID_INTROSPECTION }));
      const schema = await loader.load(testUrl, {});
      expect(schema).toBeDefined();
      expect(schema.schema).toBeDefined();
      expect(printSchemaWithDirectives(schema.schema)).toBe(printSchemaWithDirectives(testSchema));
      const calls = getMockedCalls(testUrl);
      expect(calls.length).toBe(1);
      expect(calls[0].headers).toEqual({
        Accept: 'application/json',
        'Content-Type': 'application/json',
      });
    });

    it('Should pass extra headers when they are specified as object', async () => {
      const testUrl = 'http://localhost:3000/graphql';
      mockRequest(testUrl, JSON.stringify({ data: VALID_INTROSPECTION }));
      const schema = await loader.load(testUrl, { headers: { Auth: '1' } });
      expect(schema).toBeDefined();
      expect(schema.schema).toBeDefined();
      expect(printSchemaWithDirectives(schema.schema)).toBe(printSchemaWithDirectives(testSchema));
      const calls = getMockedCalls(testUrl);
      expect(calls.length).toBe(1);
      expect(calls[0].headers).toEqual({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Auth: '1',
      });
    });

    it('Should pass extra headers when they are specified as array', async () => {
      const testUrl = 'http://localhost:3000/graphql';
      mockRequest(testUrl, JSON.stringify({ data: VALID_INTROSPECTION }));
      const schema = await loader.load(testUrl, { headers: [{ A: '1' }, { B: '2', C: '3' }] });
      expect(schema).toBeDefined();
      expect(schema.schema).toBeDefined();
      expect(printSchemaWithDirectives(schema.schema)).toBe(printSchemaWithDirectives(testSchema));
      const calls = getMockedCalls(testUrl);
      expect(calls.length).toBe(1);
      expect(calls[0].headers).toEqual({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        A: '1',
        B: '2',
        C: '3',
      });
    });
  });
});
