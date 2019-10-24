jest.mock('cross-fetch');

import { printSchema, buildSchema, parse, print } from 'graphql';
import { GithubLoader } from '../src';

const owner = 'kamilkisiela';
const name = 'graphql-inspector-example';
const ref = 'master';
const path = 'example/schemas/schema.graphqls';
const token = 'MY-SECRET-TOKEN';

const pointer = `github:${owner}/${name}#${ref}:${path}`;

const typeDefs = `
  type Post {
    id: ID
    title: String @deprecated(reason: "No more used")
    createdAt: String
    modifiedAt: String
  }
  type Query {
    post: Post!
    posts: [Post!]
  }
`;

function normalize(doc: string): string {
    return print(parse(doc));
}

test('load schema from Github', async () => {

    const loader = new GithubLoader();
    const resetMocks = () => require('cross-fetch').__resetMocks();
    const mockRequest = (url: string, content: string) => require('cross-fetch').__registerUrlRequestMock(url, content);
    const getMockedCalls = (url: string) => require('cross-fetch').__getCalls(url);

    beforeEach(() => {
        resetMocks();
    });

    mockRequest('https://api.github.com/graphql', JSON.stringify({
        data: {
            repository: {
                object: {
                    text: typeDefs
                }
            }
        }
    }));

    const schema = await loader.load(pointer, {
        token,
    });

    const calls = getMockedCalls('https://api.github.com/graphql');
    expect(calls.length).toBe(1);

    const init = calls[0];

    // settings
    expect(init.method).toEqual('POST');
    expect(init.headers).toEqual({
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `bearer ${token}`,
    });

    const body = JSON.parse(init.body);

    // query
    expect(normalize(body.query)).toEqual(
        normalize(`
      query GetGraphQLSchemaForGraphQLToolkit($owner: String!, $name: String!, $expression: String!) {
        repository(owner: $owner, name: $name) {
          object(expression: $expression) {
            ... on Blob {
              text
            }
          }
        }
      }
    `),
    );

    // variables
    expect(body.variables).toEqual({
        owner,
        name,
        expression: ref + ':' + path,
    });

    // name
    expect(body.operationName).toEqual('GetGraphQLSchemaForGraphQLToolkit');

    // schema
    expect(print(schema.document)).toEqual(printSchema(buildSchema(typeDefs)));
});
