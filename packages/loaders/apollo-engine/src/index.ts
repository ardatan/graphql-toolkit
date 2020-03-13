import { SchemaLoader, SingleFileOptions, Source } from '@graphql-toolkit/common';
import { ClientConfig } from 'apollo-language-server';
import { EngineSchemaProvider } from 'apollo-language-server/lib/providers/schema/engine';

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
    const engineSchemaProvider = new EngineSchemaProvider(options);
    const schema = await engineSchemaProvider.resolveSchema({});

    return {
      location: 'apollo-engine',
      schema,
    };
  }

  loadSync(): never {
    throw new Error('Loader ApolloEngine has no sync mode');
  }
}
