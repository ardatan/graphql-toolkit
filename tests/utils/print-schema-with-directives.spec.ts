import { makeExecutableSchema } from '@kamilkisiela/graphql-tools';
import { buildSchema, printSchema } from 'graphql';
import { printSchemaWithDirectives } from '../../src/utils/print-schema-with-directives';
import GraphQLJSON from 'graphql-type-json';

describe('printSchemaWithDirectives', () => {
  it('Should print with directives, while printSchema doesnt', () => {
    const schemaWithDirectives = buildSchema(/* GraphQL */ `
      directive @entity on OBJECT
      directive @id on FIELD_DEFINITION
      directive @link on FIELD_DEFINITION

      type Query {
        me: User
      }

      type User @entity {
        id: ID! @id
        friends: [User!]! @link
      }
    `);

    const printedSchemaByGraphQL = printSchema(schemaWithDirectives);
    expect(printedSchemaByGraphQL).toContain('directive @entity on OBJECT');
    expect(printedSchemaByGraphQL).not.toContain(`id: ID! @id`);
    expect(printedSchemaByGraphQL).not.toContain(`friends: [User!]! @link`);
    expect(printedSchemaByGraphQL).not.toContain(`type User @entity`);
    const printedSchemaAlternative = printSchemaWithDirectives(schemaWithDirectives);
    expect(printedSchemaAlternative).toContain('directive @entity on OBJECT');
    expect(printedSchemaAlternative).toContain(`id: ID! @id`);
    expect(printedSchemaAlternative).toContain(`friends: [User!]! @link`);
    expect(printedSchemaAlternative).toContain(`type User @entity`);
  });

  it('Should print types correctly if they dont have astNode', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
      scalar JSON
    
      type TestType {
        testField: JSON!
      }

      type Other {
        something: String
      }
    
      type Query {
        test: TestType
        other: Other!
      }
      `,
      resolvers: {
        Other: {
          something: () => 'a',
        },
        JSON: GraphQLJSON
      }
    });

    const output = printSchemaWithDirectives(schema);
    
    expect(output).toContain('scalar JSON');
    expect(output).toContain('type Other');
    expect(output).toContain('type TestType');
    expect(output).toContain('type Query');
  });
});
