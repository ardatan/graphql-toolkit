import { SchemaLoader, SingleFileOptions, Source } from '@graphql-toolkit/common';
import { ClientConfig, schemaProviderFromConfig } from 'apollo-language-server';

export class ApolloEngineLoader implements SchemaLoader {
  loaderId() {
    return 'apollo-engine';
  }

  async canLoad(ptr: string) {
    return typeof ptr === 'string' && ptr === 'apollo-engine';
  }

  canLoadSync() {
    return false;
  }

  async load(_: 'apollo-engine', options: ClientConfig & SingleFileOptions): Promise<Source> {
    const schemaProvider = schemaProviderFromConfig(options);
    const schema = await schemaProvider.resolveSchema({});

    return {
      location: 'apollo-engine',
      schema,
    };
  }

  loadSync(): never {
    throw new Error('Loader ApolloEngine has no sync mode');
  }
}
