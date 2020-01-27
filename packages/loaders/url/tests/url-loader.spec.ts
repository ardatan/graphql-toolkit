jest.mock('cross-fetch');
import { makeExecutableSchema } from '@ardatan/graphql-tools';
import { introspectionFromSchema } from 'graphql';
import { UrlLoader } from '../src';
import { printSchemaWithDirectives } from '@graphql-toolkit/common';
import { ApolloServer } from 'apollo-server-express';
import * as express from 'express';
import * as request from 'supertest';

const SHOULD_NOT_GET_HERE_ERROR = 'SHOULD_NOT_GET_HERE';
type MockHandler = (options: Parameters<WindowOrWorkerGlobalScope['fetch']>[1]) => ReturnType<WindowOrWorkerGlobalScope['fetch']>;

describe('Schema URL Loader', () => {
  const loader = new UrlLoader();
  const resetMocks = () => require('cross-fetch').__resetMocks();
  const mockRequest = (url: string, handler: MockHandler) => require('cross-fetch').__registerUrlRequestMock(url, handler);
  const getMockedCalls = (url: string) => require('cross-fetch').__getCalls(url);

  beforeEach(() => {
    resetMocks();
  });

  const testSchema = makeExecutableSchema({ typeDefs: /* GraphQL */`
    """
      Test type comment
    """
    type Query { 
      """
        Test field comment
      """
      a: String 
    }
  ` });

  const testUrl = 'http://localhost:3000/graphql';

  describe('handle', () => {
    it('Should throw an error when introspection is not valid', async () => {
      mockRequest(testUrl, async options => {
        return {
          async json() {
            return {
              data: {}
            };
          }
        } as any;
      });

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

    function setupFakedGraphQLServer() {
      const apollo = new ApolloServer({
        schema: testSchema,
        introspection: true,
      });
      const app = express();
      apollo.applyMiddleware({ app });
      const mockServer = request(app);
      mockRequest(testUrl, async options => {
        const mockResponse = mockServer
        .post('/graphql')
        .send(options.body);
        for (const header in options.headers) {
          mockResponse.set(header, options.headers[header]);
        }
        const actualResponse = await mockResponse;
        return {
          ...actualResponse,
          async json() {
            return actualResponse.body;
          }
        } as any;
      });
    }

    it('Should return a valid schema when request is valid', async () => {
      setupFakedGraphQLServer();
      const schema = await loader.load(testUrl, {});
      expect(schema.schema).toBeDefined();
      expect(printSchemaWithDirectives(schema.schema)).toBe(printSchemaWithDirectives(testSchema));
    });

    it('Should pass default headers', async () => {
      setupFakedGraphQLServer();
      const schema = await loader.load(testUrl, {});
      expect(schema).toBeDefined();
      expect(schema.schema).toBeDefined();
      expect(printSchemaWithDirectives(schema.schema)).toBe(printSchemaWithDirectives(testSchema));
      const calls = getMockedCalls(testUrl);
      expect(calls.length).toBe(1);
      const call = await calls[0];
      expect(call.req._header).toContain(`Accept: application/json`);
      expect(call.req._header).toContain(`Content-Type: application/json`);
    });

    it('Should pass extra headers when they are specified as object', async () => {
      setupFakedGraphQLServer();
      const schema = await loader.load(testUrl, { headers: { Auth: '1' } });
      expect(schema).toBeDefined();
      expect(schema.schema).toBeDefined();
      expect(printSchemaWithDirectives(schema.schema)).toBe(printSchemaWithDirectives(testSchema));
      const calls = getMockedCalls(testUrl);
      expect(calls.length).toBe(1);
      const call = await calls[0];
      expect(call.req._header).toContain(`Accept: application/json`);
      expect(call.req._header).toContain(`Content-Type: application/json`);
      expect(call.req._header).toContain(`Auth: 1`);
    });

    it('Should pass extra headers when they are specified as array', async () => {
      setupFakedGraphQLServer();
      const schema = await loader.load(testUrl, { headers: [{ A: '1' }, { B: '2', C: '3' }] });
      expect(schema).toBeDefined();
      expect(schema.schema).toBeDefined();
      expect(printSchemaWithDirectives(schema.schema)).toBe(printSchemaWithDirectives(testSchema));
      const calls = getMockedCalls(testUrl);
      expect(calls.length).toBe(1);
      const call = await calls[0];
      expect(call.req._header).toContain(`Accept: application/json`);
      expect(call.req._header).toContain(`Content-Type: application/json`);
      expect(call.req._header).toContain(`A: 1`);
      expect(call.req._header).toContain(`B: 2`);
      expect(call.req._header).toContain(`C: 3`);
    });

    it('Absolute file path should not be accepted as URL', async () => {
      expect(await loader.canLoad(process.cwd(), {})).toBeFalsy();
    });
  });
});
