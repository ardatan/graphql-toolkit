const { makeExecutableSchema } = require('@ardatan/graphql-tools');

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type User {
      a: String
    }

    type Query {
      user: User
    }

    extend type Query {
      hello: String
    }
  `,
});

module.exports = schema;
