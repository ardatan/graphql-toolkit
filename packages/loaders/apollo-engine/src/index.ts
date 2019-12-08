import { SchemaLoader, printSchemaWithDirectives } from '@graphql-toolkit/common';
import { ClientConfig } from 'apollo-language-server';
import { EngineSchemaProvider } from 'apollo-language-server/lib/providers/schema/engine';
import { parse } from 'graphql';

export class ApolloEngineLoader implements SchemaLoader {
  loaderId() {
    return 'apollo-engine';
  }
  async canLoad(ptr: string) {
    return typeof ptr === 'string' && ptr === 'apollo-engine';
  }
  async load(_: 'apollo-engine', options: ClientConfig) {
    const engineSchemaProvider = new EngineSchemaProvider(options);
    const asSchema = await engineSchemaProvider.resolveSchema({});
    const printed = printSchemaWithDirectives(asSchema);

    return {
      location: 'apollo-engine',
      document: parse(printed),
    };
  }
}
