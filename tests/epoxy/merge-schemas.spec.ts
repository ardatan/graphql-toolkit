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
    it('should merge valid schemas with interfaces correctly', async () => {
        const fooSchema = makeExecutableSchema({
            typeDefs: gql`
                interface Foo {
                    foo: String
                }
                type Bar implements Foo {
                    foo: String
                    bar: String
                }
                type Qux implements Foo {
                    foo: String
                    qux: String
                }
            `
        })
        const barSchema = makeExecutableSchema({
            typeDefs: gql`
                interface Foo {
                    foo: String
                }
                type Query {
                    bar: Foo
                    qux: Foo
                }
            `,
            resolvers: {
                Foo: {
                    __resolveType: (root: any) => {
                        if ('bar' in root) {
                            return 'Bar';
                        }
                        if ('qux' in root) {
                            return 'Qux';
                        }
                        return null;
                    }
                },
                Query: {
                    bar: () => ({ foo: 'foo', bar: 'bar' }),
                    qux: () => ({ foo: 'foo', qux: 'qux'})
                }
            }
        });
        const { errors, data } = await graphql({
            schema: mergeSchemas({
                schemas: [fooSchema, barSchema]
            }),
            source: `
                {
                    bar {
                        foo
                        ... on Bar {
                            bar
                        }
                    }
                    qux {
                        foo
                        ... on Qux {
                            qux
                        }
                    }
                }
            `
        });
        expect(errors).toBeFalsy();
        expect(data.bar.foo).toBe('foo');
        expect(data.bar.bar).toBe('bar');
        expect(data.qux.foo).toBe('foo');
        expect(data.qux.qux).toBe('qux');
    })
})