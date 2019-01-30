import { post } from 'request';
import { SchemaLoader } from './schema-loader';
import { GraphQLSchema, introspectionQuery, buildClientSchema } from 'graphql';
import { isUri } from 'valid-url';

export class IntrospectionFromUrlLoader implements SchemaLoader {
  canHandle(pointerToSchema: string): boolean {
    return !!isUri(pointerToSchema);
  }

  handle(url: string, schemaOptions: any): Promise<GraphQLSchema> {
    let headers = {};

    if (Array.isArray(schemaOptions.headers)) {
      headers = schemaOptions.headers.reduce((prev: object, v: object) => ({ ...prev, ...v }), {});
    } else if (typeof schemaOptions.headers === 'object') {
      headers = schemaOptions.headers;
    }

    let extraHeaders = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    };

    return new Promise<GraphQLSchema>((resolve, reject) => {
      post(
        {
          url: url,
          json: {
            query: introspectionQuery,
          },
          headers: extraHeaders,
        },
        (err, _response, body) => {
          if (err) {
            reject(err);

            return;
          }

          const bodyJson = body.data;

          let errorMessage;
          if (body.errors && body.errors.length > 0) {
            errorMessage = body.errors.map((item: Error) => item.message).join(', ');
          } else if (!bodyJson) {
            errorMessage = body;
          }

          if (errorMessage) {
            reject('Unable to download schema from remote: ' + errorMessage);

            return;
          }

          resolve(buildClientSchema(bodyJson));
        }
      );
    });
  }
}
