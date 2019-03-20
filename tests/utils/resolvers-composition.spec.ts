import gql from "graphql-tag";
import { composeResolvers } from "../../src/utils";
import { makeExecutableSchema } from "graphql-tools";
import { execute, subscribe, ExecutionResult } from "graphql";
import { $$asyncIterator, createAsyncIterator } from 'iterall';

describe('Resolvers composition', () => {
    it('should compose regular resolvers', async () => {
        const getFoo = () => 'FOO';
        const typeDefs = gql`
            type Query {
            foo: String
            }
        `
        const resolvers = {
            Query: {
                foo: async () => getFoo(),
            },
        };
        const resolversComposition = {
            'Query.foo': (next: (arg0: any, arg1: any, arg2: any, arg3: any) => void) => async (root: any, args: any, context: any, info: any) => {
                const prevResult = await next(root, args, context, info);
                return getFoo() + prevResult;
            },
        }
        const composedResolvers = composeResolvers(resolvers, resolversComposition);
        const schema = makeExecutableSchema({
            typeDefs,
            resolvers: composedResolvers,
        });
        
        const result = await execute({
            schema,
    
            document: gql`query { foo }`,
          });
          expect(result.errors).toBeFalsy();
          expect(result.data.foo).toBe('FOOFOO');
    })
    it('should compose resolvers with resolve field', async () => {
        const getFoo = () => 'FOO';
        const typeDefs = gql`
            type Query {
            foo: String
            }
        `
        const resolvers = {
            Query: {
                foo: {
                    resolve: async () => getFoo()
                },
            },
        };
        const resolversComposition = {
            'Query.foo': (next: (arg0: any, arg1: any, arg2: any, arg3: any) => void) => async (root: any, args: any, context: any, info: any) => {
                const prevResult = await next(root, args, context, info);
                return getFoo() + prevResult;
            },
        }
        const composedResolvers = composeResolvers(resolvers, resolversComposition);
        const schema = makeExecutableSchema({
            typeDefs,
            resolvers: composedResolvers,
        });
        
        const result = await execute({
            schema,
    
            document: gql`query { foo }`,
          });
          expect(result.errors).toBeFalsy();
          expect(result.data.foo).toBe('FOOFOO');
    })
    it('should compose subscription resolvers', async () => {
        const array1 = [1, 2];
        const array2 = [3, 4];
        const typeDefs = gql`
            type Query {
                foo: String
            }
            type Subscription {
                foo: Int
            }
        `;
        const resolvers = {
            Subscription: {
                foo: {
                    subscribe: () => createAsyncIterator(array1)
                }
            }
        };
        
        const resolversComposition = {
            'Subscription.foo': (prevAsyncIteratorFactory: any) => (root: any, args: any, context: any, info: any) => {
                const prevAsyncIterator = prevAsyncIteratorFactory(root, args, context, info);
                const newAsyncIterator = createAsyncIterator(array2);
                return {
                    async next() {
                        const { value: v1, done } = await prevAsyncIterator.next();
                        const { value: v2 } = await newAsyncIterator.next();
                        if (!done) {
                            return {
                                value: v1 + v2,
                                done
                            };
                        } else {
                            return {
                                value: undefined,
                                done
                            }
                        }
                    },
                    [$$asyncIterator](): AsyncIterator<number> {
                        return this;
                    }
                }
            },
        }
        const composedResolvers = composeResolvers(resolvers, resolversComposition);
        const schema = makeExecutableSchema({
            typeDefs,
            resolvers: composedResolvers,
        });
        const result = await subscribe({
            schema,
            document: gql`subscription { foo }`
        }) as AsyncIterator<ExecutionResult<{ foo: number }>>
        
        const firstResult = await result.next();
        console.log(firstResult);
        expect(firstResult.value.data.foo).toBe(4);
        const secondResult = await result.next();
        expect(secondResult.value.data.foo).toBe(6);
    })
})