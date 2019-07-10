import { fetch } from 'cross-fetch';
import { SchemaLoader } from './schema-loader';
import { GraphQLSchema, introspectionQuery, buildClientSchema } from 'graphql';
import { isUri } from 'valid-url';

export interface IntrospectionFromUrlLoaderOptions {
  headers?: { [key: string]: string }[] | { [key: string]: string };
}

export class IntrospectionFromUrlLoader implements SchemaLoader<IntrospectionFromUrlLoaderOptions> {
  canHandle(pointerToSchema: string): boolean {
    return !!isUri(pointerToSchema);
  }

  async handle(url: string, schemaOptions?: IntrospectionFromUrlLoaderOptions): Promise<GraphQLSchema> {
    let headers = {};

    if (schemaOptions) {
      if (Array.isArray(schemaOptions.headers)) {
        headers = schemaOptions.headers.reduce((prev: object, v: object) => ({ ...prev, ...v }), {});
      } else if (typeof schemaOptions.headers === 'object') {
        headers = schemaOptions.headers;
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
      throw ('Unable to download schema from remote: ' + errorMessage);
    }

    if (!body.data.__schema) {
      throw new Error('Invalid schema provided!');
    }

    return buildClientSchema(body.data);

  }
}
