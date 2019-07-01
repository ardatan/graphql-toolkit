import { mergeTypeDefs, mergeResolvers } from 'graphql-toolkit';

console.log(
    mergeTypeDefs([
        `
            type Query {
                foo: String
            }
        `,
        `
            type Query {
                bar: String
            }
        `
        ]),
    mergeResolvers([
        {
            Query: {
                foo: () => 'FOO'
            }
        },
        {
            Query: {
                bar: () => 'BAR'
            }
        }
    ])
);
