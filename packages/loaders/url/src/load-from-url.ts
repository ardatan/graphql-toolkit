import { introspectionQuery, buildClientSchema, parse, IntrospectionQuery, ExecutionResult } from 'graphql';
import { SchemaPointerSingle, Source, printSchemaWithDirectives, DocumentLoader } from '@graphql-toolkit/common';
import { isUri } from 'valid-url';
import { fetch as crossFetch } from 'cross-fetch';

export type FetchFn = typeof import('cross-fetch').fetch;

type Headers = Record<string, string> | Array<Record<string, string>>;

export interface LoadFromUrlOptions {
  headers?: Headers;
  fetch?: FetchFn;
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

    if (options) {
      if (Array.isArray(options.headers)) {
        headers = options.headers.reduce((prev: object, v: object) => ({ ...prev, ...v }), {});
      } else if (typeof options.headers === 'object') {
        headers = options.headers;
      }

      if (options.fetch) {
        fetch = options.fetch;
      }
    }

    let extraHeaders = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    };

    const response = await fetch(pointer, {
      method: options.method ? options.method : 'POST',
      ...(options.method === 'POST'
        ? {
            body: JSON.stringify({
              query: introspectionQuery,
            }),
          }
        : {}),
      headers: extraHeaders,
    });

    const body: ExecutionResult = await response.json();

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

    const asSchema = buildClientSchema(body.data as IntrospectionQuery);
    const printed = printSchemaWithDirectives(asSchema);

    return {
      location: pointer,
      document: parse(printed),
    };
  }
}
