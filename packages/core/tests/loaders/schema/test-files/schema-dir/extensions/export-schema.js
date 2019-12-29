const { makeExecutableSchema } = require('@kamilkisiela/graphql-tools');
const { doc } = require('./type-defs');

const schema = makeExecutableSchema({
  typeDefs: [doc],
});

exports.schema = schema;