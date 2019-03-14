import { makeExecutableSchema } from "graphql-tools";
import { mergeSchemas } from '../../src/epoxy';
import gql from "graphql-tag";
import { graphql } from "graphql";

describe('Merge Schemas', () => {
    it('should merge two valid executable schemas', async () => {
        const fooSchema = makeExecutableSchema({
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
        });
        const barSchema = makeExecutableSchema({
            typeDefs: gql`
                type Query {
                    bar: String
                }
            `,
            resolvers: {
                Query: {
                    bar: () => 'BAR'
                }
            }
        });
        const { errors, data } = await graphql({
            schema: mergeSchemas({
                schemas: [fooSchema, barSchema]
            }),
            source: `
                {
                    foo
                    bar
                }
            `
        });
        expect(errors).toBeFalsy();
        expect(data.foo).toBe('FOO');
        expect(data.bar).toBe('BAR');
    });
    it('should merge two valid executable schemas with extra resolvers', async () => {
        const fooSchema = makeExecutableSchema({
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
        });
        const barSchema = makeExecutableSchema({
            typeDefs: gql`
                type Query {
                    bar: String
                    qux: String
                }
            `,
            resolvers: {
                Query: {
                    bar: () => 'BAR'
                }
            }
        });
        const { errors, data } = await graphql({
            schema: mergeSchemas({
                schemas: [fooSchema, barSchema],
                resolvers: {
                    Query: {
                        qux: () => 'QUX'
                    }
                }
            }),
            source: `
                {
                    foo
                    bar
                    qux
                }
            `
        });
        expect(errors).toBeFalsy();
        expect(data.foo).toBe('FOO');
        expect(data.bar).toBe('BAR');
        expect(data.qux).toBe('QUX');
    });
    it('should merge two valid executable schemas with extra typeDefs and resolvers', async () => {
        const fooSchema = makeExecutableSchema({
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
        });
        const barSchema = makeExecutableSchema({
            typeDefs: gql`
                type Query {
                    bar: String
                }
            `,
            resolvers: {
                Query: {
                    bar: () => 'BAR'
                }
            }
        });
        const { errors, data } = await graphql({
            schema: mergeSchemas({
                schemas: [fooSchema, barSchema],
                typeDefs: gql`
                    type Query {
                        qux: String
                    }
                `,
                resolvers: {
                    Query: {
                        qux: () => 'QUX'
                    }
                }
            }),
            source: `
                {
                    foo
                    bar
                    qux
                }
            `
        });
        expect(errors).toBeFalsy();
        expect(data.foo).toBe('FOO');
        expect(data.bar).toBe('BAR');
        expect(data.qux).toBe('QUX');
    });
    it('should merge two valid schemas by keeping their directives to be used in extra typeDefs', async () => {
        const fooSchema = makeExecutableSchema({
            typeDefs: gql`
                directive @fooDirective on FIELD_DEFINITION
                type Query {
                    foo: String
                }
            `,
            resolvers: {
                Query: {
                    foo: () => 'FOO'
                }
            }
        });
        const barSchema = makeExecutableSchema({
            typeDefs: gql`
                type Query {
                    bar: String
                }
            `,
            resolvers: {
                Query: {
                    bar: () => 'BAR'
                }
            }
        });
        const { errors, data } = await graphql({
            schema: mergeSchemas({
                schemas: [fooSchema, barSchema],
                typeDefs: gql`
                    type Query {
                        qux: String @fooDirective
                    }
                `,
                resolvers: {
                    Query: {
                        qux: () => 'QUX'
                    }
                }
            }),
            source: `
                {
                    foo
                    bar
                    qux
                }
            `
        });
        expect(errors).toBeFalsy();
        expect(data.foo).toBe('FOO');
        expect(data.bar).toBe('BAR');
        expect(data.qux).toBe('QUX');
    });
})