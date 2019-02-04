import { extractResolversFromSchema } from '../../src/utils/extract-resolvers-from-schema';
import { makeExecutableSchema } from 'graphql-tools';
import gql from 'graphql-tag';

describe('extractResolversFromSchema', async () => {
    it('should extract correct resolvers from a schema with correct type mapping', async () => {
        const schema = makeExecutableSchema({
            typeDefs: gql`
                type Query {
                    foo: String
                }
            `,
            resolvers: {
                Query: {
                    foo: () => 'FOO'
                }
            }
        })
        const fieldResolvers = extractResolversFromSchema(schema);
        expect((fieldResolvers.Query['foo'] as Function)()).toBe('FOO');
    });
});