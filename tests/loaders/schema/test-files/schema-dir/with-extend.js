const { makeExecutableSchema } = require('@kamilkisiela/graphql-tools');

const schema = makeExecutableSchema({
  typeDefs: [
    `
    type User {
      a: String
    }
    
    type Query {
      user: User
    }
  `,
    `
    extend type Query {
      hello: String
    }
  `
  ]
});

module.exports = schema;
