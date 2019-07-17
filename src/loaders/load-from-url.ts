import { introspectionQuery, buildClientSchema, DocumentNode, parse, IntrospectionQuery } from 'graphql';
import { printSchemaWithDirectives } from '../utils/print-schema-with-directives';
import { fetch } from 'cross-fetch';

export interface LoadFromUrlOptions {
  headers?: { [key: string]: string }[] | { [key: string]: string };
}

export async function loadFromUrl(url: string, options?: LoadFromUrlOptions): Promise<DocumentNode> {
  let headers = {};

  if (options) {
    if (Array.isArray(options.headers)) {
      headers = options.headers.reduce((prev: object, v: object) => ({ ...prev, ...v }), {});
    } else if (typeof options.headers === 'object') {
      headers = options.headers;
    }
  }

  let extraHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...headers,
  };

  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      query: introspectionQuery,
    }),
    headers: extraHeaders,
  });

  const body = await response.json();

  let errorMessage;

  if (body.errors && body.errors.length > 0) {
    errorMessage = body.errors.map((item: Error) => item.message).join(', ');
  } else if (!body.data) {
    errorMessage = body;
  }

  if (errorMessage) {
    throw 'Unable to download schema from remote: ' + errorMessage;
  }

  if (!body.data.__schema) {
    throw new Error('Invalid schema provided!');
  }

  const asSchema = buildClientSchema(body.data as IntrospectionQuery);
  const printed = printSchemaWithDirectives(asSchema);

  return parse(printed);
}
