import { buildClientSchema, printSchema, parse, DocumentNode } from 'graphql';
import { UniversalLoader } from '@graphql-toolkit/common';
import { fetch } from 'cross-fetch';

// github:owner/name#ref:path/to/file
function extractData(
  pointer: string
): {
  owner: string;
  name: string;
  ref: string;
  path: string;
} {
  const [repo, file] = pointer.split('#');
  const [owner, name] = repo.split(':')[1].split('/');
  const [ref, path] = file.split(':');

  return {
    owner,
    name,
    ref,
    path,
  };
}

export interface GithubLoaderOptions {
  token: string;
}

export class GithubLoader implements UniversalLoader<GithubLoaderOptions> {
  loaderId() {
    return 'github-loader';
  }
  async canLoad(pointer: string) {
    return typeof pointer === 'string' && pointer.toLowerCase().startsWith('github:');
  }
  async load(pointer: string, options: GithubLoaderOptions) {
    const { owner, name, ref, path } = extractData(pointer);
    const request = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `bearer ${options.token}`,
      },
      body: JSON.stringify({
        query: `
          query GetGraphQLSchemaForGraphQLToolkit($owner: String!, $name: String!, $expression: String!) {
            repository(owner: $owner, name: $name) {
              object(expression: $expression) {
                ... on Blob {
                  text
                }
              }
            }
          }
        `,
        variables: {
          owner,
          name,
          expression: ref + ':' + path,
        },
        operationName: 'GetGraphQLSchemaForGraphQLToolkit',
      }),
    });
    const response = await request.json();

    let errorMessage: string | null = null;

    if (response.errors && response.errors.length > 0) {
      errorMessage = response.errors.map((item: Error) => item.message).join(', ');
    } else if (!response.data) {
      errorMessage = response;
    }

    if (errorMessage) {
      throw new Error('Unable to download schema from github: ' + errorMessage);
    }

    const schemaString = response.data.repository.object.text;

    let document: DocumentNode;

    if (/\.(gql|graphql)s?$/i.test(path)) {
      document = parse(schemaString);
    }

    if (/\.json$/i.test(path)) {
      document = parse(printSchema(buildClientSchema(JSON.parse(schemaString))));
    }

    if (!document) {
      throw new Error('Unable to build schema from GitHub');
    }

    return {
      location: pointer,
      document,
    };
  }
}
