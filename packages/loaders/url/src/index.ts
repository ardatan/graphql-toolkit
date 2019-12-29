import { buildClientSchema, parse, IntrospectionQuery, print, getIntrospectionQuery } from 'graphql';
import { SchemaPointerSingle, Source, DocumentLoader, SingleFileOptions } from '@graphql-toolkit/common';
import { isUri } from 'valid-url';
import { fetch as crossFetch } from 'cross-fetch';
import { makeRemoteExecutableSchema } from '@kamilkisiela/graphql-tools';
import { Fetcher } from '@kamilkisiela/graphql-tools/dist/stitching/makeRemoteExecutableSchema';

export type FetchFn = typeof import('cross-fetch').fetch;

type Headers = Record<string, string> | Array<Record<string, string>>;

export interface LoadFromUrlOptions extends SingleFileOptions {
  headers?: Headers;
  customFetch?: FetchFn | string;
  method?: 'GET' | 'POST';
}

export class UrlLoader implements DocumentLoader<LoadFromUrlOptions> {
  loaderId(): string {
    return 'url';
  }

  async canLoad(pointer: SchemaPointerSingle, options: LoadFromUrlOptions): Promise<boolean> {
    return !!isUri(pointer);
  }

  async load(pointer: SchemaPointerSingle, options: LoadFromUrlOptions): Promise<Source> {
    let headers = {};
    let fetch = crossFetch;
    let method: 'GET' | 'POST' = 'POST';

    if (options) {
      if (Array.isArray(options.headers)) {
        headers = options.headers.reduce((prev: object, v: object) => ({ ...prev, ...v }), {});
      } else if (typeof options.headers === 'object') {
        headers = options.headers;
      }

      if (options.customFetch) {
        if (typeof options.customFetch === 'string') {
          const [moduleName, fetchFnName] = options.customFetch.split('#');
          fetch = await import(moduleName).then(module => (fetchFnName ? module[fetchFnName] : module));
        }
      }

      if (options.method) {
        method = options.method;
      }
    }

    let extraHeaders = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    };

    const fetcher: Fetcher = async ({ query: queryDocument, variables, operationName }) => {
      const fetchResult = await fetch(pointer, {
        method,
        ...(method === 'POST'
          ? {
              body: JSON.stringify({ query: print(queryDocument), variables, operationName }),
            }
          : {}),
        headers: extraHeaders,
      });
      return fetchResult.json();
    };

    const body = await fetcher({
      query: parse(getIntrospectionQuery({ descriptions: true })),
      variables: {},
      operationName: 'IntrospectionQuery',
      context: {},
    });

    let errorMessage;

    if (body.errors && body.errors.length > 0) {
      errorMessage = body.errors.map((item: Error) => item.message).join(', ');
    } else if (!body.data) {
      errorMessage = body;
    }

    if (errorMessage) {
      throw new Error('Unable to download schema from remote: ' + errorMessage);
    }

    if (!body.data.__schema) {
      throw new Error('Invalid schema provided!');
    }

    const clientSchema = buildClientSchema(body.data as IntrospectionQuery, options as any);
    const remoteExecutableSchema = makeRemoteExecutableSchema({
      schema: clientSchema,
      fetcher,
    });

    return {
      location: pointer,
      schema: remoteExecutableSchema,
    };
  }
}
