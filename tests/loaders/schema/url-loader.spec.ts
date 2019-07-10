jest.mock('cross-fetch');
import { IntrospectionFromUrlLoader } from '../../../src/loaders/schema/introspection-from-url';
import { makeExecutableSchema } from '@kamilkisiela/graphql-tools';
import { introspectionFromSchema, GraphQLSchema } from 'graphql';

const SHOULD_NOT_GET_HERE_ERROR = 'SHOULD_NOT_GET_HERE';

describe('Schema URL Loader', () => {
  const resetMocks = () => require('cross-fetch').__resetMocks();
  const mockRequest = (url: string, content: object) => require('cross-fetch').__registerUrlRequestMock(url, content);
  const getMockedCalls = (url: string) => require('cross-fetch').__getCalls(url);

  beforeEach(() => {
    resetMocks();
  });

  const VALID_INTROSPECTION = introspectionFromSchema(makeExecutableSchema({ typeDefs: 'type Query { a: String }' }));
  const loader = new IntrospectionFromUrlLoader();

  describe('canHandle', () => {
    it('Should return true for handling a valid url', async () => {
      expect(loader.canHandle('http://localhost:3000/graphql')).toBeTruthy();
    });

    it('Should return false for handling a non-valid string', async () => {
      expect(loader.canHandle('file.graphql')).toBeFalsy();
    });

    it('Should return false for handling a non-valid string glob', async () => {
      expect(loader.canHandle('**/*.graphql')).toBeFalsy();
    });
  });

  describe('handle', () => {
    it('Should throw an error when introspection is not valid', async () => {
      const testUrl = 'http://localhost:3000/graphql';
      mockRequest(testUrl, {});

      try {
        await loader.handle(testUrl, {});
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
      mockRequest(testUrl, VALID_INTROSPECTION);

      const schema = await loader.handle(testUrl, {});
      expect(schema).toBeDefined();
      expect(schema instanceof GraphQLSchema).toBeTruthy();

      const calls = getMockedCalls(testUrl);
      expect(calls.length).toBe(1);
    });

    it('Should pass default headers', async () => {
      const testUrl = 'http://localhost:3000/graphql';
      mockRequest(testUrl, VALID_INTROSPECTION);
      const schema = await loader.handle(testUrl, {});
      expect(schema).toBeDefined();
      expect(schema instanceof GraphQLSchema).toBeTruthy();
      const calls = getMockedCalls(testUrl);
      expect(calls.length).toBe(1);
      expect(calls[0].headers).toEqual({
        Accept: 'application/json',
        'Content-Type': 'application/json'
      });
    });

    it('Should pass extra headers when they are specified as object', async () => {
      const testUrl = 'http://localhost:3000/graphql';
      mockRequest(testUrl, VALID_INTROSPECTION);
      const schema = await loader.handle(testUrl, { headers: { Auth: '1' } });
      expect(schema).toBeDefined();
      expect(schema instanceof GraphQLSchema).toBeTruthy();
      const calls = getMockedCalls(testUrl);
      expect(calls.length).toBe(1);
      expect(calls[0].headers).toEqual({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Auth: '1'
      });
    });

    it('Should pass extra headers when they are specified as array', async () => {
      const testUrl = 'http://localhost:3000/graphql';
      mockRequest(testUrl, VALID_INTROSPECTION);
      const schema = await loader.handle(testUrl, { headers: [{ A: '1' }, { B: '2', C: '3' }] });
      expect(schema).toBeDefined();
      expect(schema instanceof GraphQLSchema).toBeTruthy();
      const calls = getMockedCalls(testUrl);
      expect(calls.length).toBe(1);
      expect(calls[0].headers).toEqual({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        A: '1',
        B: '2',
        C: '3'
      });
    });
  });
});
