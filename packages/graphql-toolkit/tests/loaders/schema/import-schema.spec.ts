import { parseImportLine, parseSDL, loadTypedefsUsingLoaders, LoadTypedefsOptions } from '@graphql-toolkit/core';
import * as fs from 'fs'
import { DEFAULT_SCHEMA_LOADERS } from '../../../src';
import { OPERATION_KINDS } from '../../../src';
import { print, BuildSchemaOptions } from 'graphql';
import { CodeFileLoaderOptions } from '@graphql-toolkit/code-file-loader';
import { GraphQLFileLoaderOptions } from '@graphql-toolkit/graphql-file-loader';

const importSchema = (schema: string, options: BuildSchemaOptions & LoadTypedefsOptions<CodeFileLoaderOptions | GraphQLFileLoaderOptions> = {}) => loadTypedefsUsingLoaders(DEFAULT_SCHEMA_LOADERS, schema, { ...options, forceGraphQLImport: true, }, OPERATION_KINDS).then(r => print(r[0].document));

test('parseImportLine: parse single import', () => {
    expect(parseImportLine(`import A from "schema.graphql"`)).toEqual({
        imports: ['A'],
        from: 'schema.graphql',
    })
})

test('parseImportLine: optional semicolon', () => {
    expect(parseImportLine(`import A from "schema.graphql";`)).toEqual({
        imports: ['A'],
        from: 'schema.graphql',
    });
})

test('parseImportLine: invalid', async () => {
    expect(() => parseImportLine(`import from "schema.graphql"`)).toThrow();
})

test('parseImportLine: invalid 2', async () => {
    expect(() => parseImportLine(`import A from ""`)).toThrow();
})

test('parseImportLine: parse multi import', async () => {
    expect(parseImportLine(`import A, B from "schema.graphql"`)).toEqual({
        imports: ['A', 'B'],
        from: 'schema.graphql',
    })
})

test('parseImportLine: parse multi import (weird spacing)', async () => {
    expect(parseImportLine(`import  A  ,B   from "schema.graphql"`)).toEqual({
        imports: ['A', 'B'],
        from: 'schema.graphql',
    })
})

test('parseImportLine: different path', async () => {
    expect(parseImportLine(`import A from "../new/schema.graphql"`)).toEqual({
        imports: ['A'],
        from: '../new/schema.graphql',
    })
})

test('parseImportLine: module in node_modules', async () => {
    expect(parseImportLine(`import A from "module-name"`)).toEqual({
        imports: ['A'],
        from: 'module-name',
    })
})

test('parseSDL: non-import comment', async () => {
    expect(parseSDL(`#importent: comment`)).toEqual([]);
})

test('parse: multi line import', async () => {
    const sdl = `\
# import A from "a.graphql"
# import * from "b.graphql"
  `
    expect(parseSDL(sdl)).toEqual([
        {
            imports: ['A'],
            from: 'a.graphql',
        },
        {
            imports: ['*'],
            from: 'b.graphql',
        },
    ])
})

test('Module in node_modules', async () => {
    const b = `\
# import lower from './lower.graphql'
type B {
  id: ID!
  nickname: String! @lower
}
`
    const lower = `\
directive @lower on FIELD_DEFINITION
`
    const expectedSDL = `\
type A {
  id: ID!
  author: B!
}

type B {
  id: ID!
  nickname: String! @lower
}

directive @lower on FIELD_DEFINITION
`
    const moduleDir = 'node_modules/graphql-import-test'
    if (!fs.existsSync(moduleDir)) {
        fs.mkdirSync(moduleDir)
    }

    fs.writeFileSync(moduleDir + '/b.graphql', b)
    fs.writeFileSync(moduleDir + '/lower.graphql', lower)
    expect(await importSchema('tests/loaders/schema/fixtures/import-module/a.graphql')).toBe(expectedSDL)
})

test('importSchema: imports only', async () => {
    const expectedSDL = `\
type Query {
  first: String
  second: Float
  third: String
}
`
    expect(await importSchema('tests/loaders/schema/fixtures/imports-only/all.graphql')).toBe(expectedSDL);
})

test('importSchema: import .gql extension', async () => {
    const expectedSDL = `\
type A {
  id: ID!
}
`
    expect(await importSchema('tests/loaders/schema/fixtures/import-gql/a.gql')).toBe(expectedSDL)
})

test('importSchema: import duplicate', async () => {
    const expectedSDL = `\
type Query {
  first: String
  second: Float
  third: String
}
`
    expect(await importSchema('tests/loaders/schema/fixtures/import-duplicate/all.graphql')).toBe(expectedSDL)
})

test('importSchema: import nested', async () => {
    const expectedSDL = `\
type Query {
  first: String
  second: Float
  third: String
}
`
    expect(await importSchema('tests/loaders/schema/fixtures/import-nested/all.graphql')).toBe(expectedSDL)
})

test('importSchema: field types', async () => {
    const expectedSDL = `\
type A {
  first: String
  second: Float
  b: B
}

type B {
  c: C
  hello: String!
}

type C {
  id: ID!
}
`
    expect(await importSchema('tests/loaders/schema/fixtures/field-types/a.graphql')).toBe(expectedSDL)
})

test('importSchema: enums', async () => {
    const expectedSDL = `\
type A {
  first: String
  second: Float
  b: B
}

enum B {
  B1
  B2
  B3
}
`
    expect(await importSchema('tests/loaders/schema/fixtures/enums/a.graphql')).toBe(expectedSDL)
})

test('importSchema: import all', async () => {
    const expectedSDL = `\
type A {
  first: String
  second: Float
  b: B
}

type B {
  hello: String!
  c1: C1
  c2: C2
}

type C1 {
  id: ID!
}

type C2 {
  id: ID!
}
`
    expect(await importSchema('tests/loaders/schema/fixtures/import-all/a.graphql')).toBe(expectedSDL)
})

test('importSchema: import all from objects', async () => {
    const schemaC = `
    type C1 {
      id: ID!
    }

    type C2 {
      id: ID!
    }

    type C3 {
      id: ID!
    }
`

    const schemaB = `
    # import * from 'schemaC'
    type B {
      hello: String!
      c1: C1
      c2: C2
    }
`

    const schemaA = `
    # import B from 'schemaB'
    type A {
      # test 1
      first: String
      second: Float
      b: B
    }
`

    const schemas = {
        schemaA,
        schemaB,
        schemaC,
    }

    const expectedSDL = `\
type A {
  first: String
  second: Float
  b: B
}

type B {
  hello: String!
  c1: C1
  c2: C2
}

type C1 {
  id: ID!
}

type C2 {
  id: ID!
}
`
    expect(await importSchema(schemaA, { schemas })).toBe(expectedSDL)
})

test(`importSchema: single object schema`, async () => {
    const schemaA = `
    type A {
      field: String
    }
`

    const expectedSDL = `\
type A {
  field: String
}
`

    expect(await importSchema(schemaA)).toBe(expectedSDL)
})

test(`importSchema: import all mix 'n match`, async () => {
    const schemaB = `
    # import C1, C2 from 'tests/loaders/schema/fixtures/import-all/c.graphql'
    type B {
      hello: String!
      c1: C1
      c2: C2
    }
`

    const schemaA = `
    # import * from "schemaB"
    type A {
      # test 1
      first: String
      second: Float
      b: B
    }
`

    const schemas = {
        schemaB,
    }

    const expectedSDL = `\
type A {
  first: String
  second: Float
  b: B
}

type C1 {
  id: ID!
}

type C2 {
  id: ID!
}

type B {
  hello: String!
  c1: C1
  c2: C2
}
`

    expect(await importSchema(schemaA, { schemas })).toBe(expectedSDL)
})

test(`importSchema: import all mix 'n match 2`, async () => {
    const schemaA = `
    # import * from "tests/loaders/schema/fixtures/import-all/b.graphql"
    type A {
      # test 1
      first: String
      second: Float
      b: B
    }
`

    const expectedSDL = `\
type A {
  first: String
  second: Float
  b: B
}

type B {
  hello: String!
  c1: C1
  c2: C2
}

type C1 {
  id: ID!
}

type C2 {
  id: ID!
}
`
    expect(await importSchema(schemaA)).toBe(expectedSDL)
})

test(`importSchema: import all - exclude Query/Mutation/Subscription type`, async () => {
    const schemaC = `
    type C1 {
      id: ID!
    }

    type C2 {
      id: ID!
    }

    type C3 {
      id: ID!
    }

    type Query {
      hello: String!
    }

    type Mutation {
      hello: String!
    }

    type Subscription {
      hello: String!
    }

    `

    const schemaB = `
    # import * from 'schemaC'
    type B {
      hello: String!
      c1: C1
      c2: C2
    }
`

    const schemaA = `
    # import B from 'schemaB'
    type Query {
      greet: String!
    }

    type A {
      # test 1
      first: String
      second: Float
      b: B
    }
`

    const schemas = {
        schemaA,
        schemaB,
        schemaC,
    }

    const expectedSDL = `\
type Query {
  greet: String!
}

type A {
  first: String
  second: Float
  b: B
}

type B {
  hello: String!
  c1: C1
  c2: C2
}

type C1 {
  id: ID!
}

type C2 {
  id: ID!
}
`
    expect(await importSchema(schemaA, { schemas })).toBe(expectedSDL)
})

test('importSchema: scalar', async () => {
    const expectedSDL = `\
type A {
  b: B
}

scalar B
`
    expect(await importSchema('tests/loaders/schema/fixtures/scalar/a.graphql')).toBe(expectedSDL)
})

test('importSchema: directive', async () => {
    const expectedSDL = `\
type A {
  first: String @upper
  second: String @withB @deprecated
}

scalar B

directive @upper on FIELD_DEFINITION

directive @withB(argB: B) on FIELD_DEFINITION
`
    expect(await importSchema('tests/loaders/schema/fixtures/directive/a.graphql')).toBe(expectedSDL)
})

test('importSchema: key directive', async () => {
    const expectedSDL = `\
scalar UPC

type Product @key(fields: "upc") {
  upc: UPC!
  name: String
}
`
    expect(await importSchema('tests/loaders/schema/fixtures/directive/c.graphql')).toBe(expectedSDL)
})

test('importSchema: multiple key directive', async () => {
    const expectedSDL = `\
scalar UPC

scalar SKU

type Product @key(fields: "upc") @key(fields: "sku") {
  upc: UPC!
  sku: SKU!
  name: String
}
`
    expect(await importSchema('tests/loaders/schema/fixtures/directive/e.graphql')).toBe(expectedSDL)
})

test('importSchema: external directive', async () => {
    const expectedSDL = `\
type Review @key(fields: "id") {
  product: Product @provides(fields: "name")
}

extend type Product @key(fields: "upc") {
  upc: String @external
  name: String @external
}
`
    expect(await importSchema('tests/loaders/schema/fixtures/directive/f.graphql')).toBe(expectedSDL)
})

test('importSchema: requires directive', async () => {
    const expectedSDL = `\
type Review {
  id: ID
}

extend type User @key(fields: "id") {
  id: ID! @external
  email: String @external
  reviews: [Review] @requires(fields: "email")
}
`
    expect(await importSchema('tests/loaders/schema/fixtures/directive/g.graphql')).toBe(expectedSDL)
})

test('importSchema: interfaces', async () => {
    const expectedSDL = `\
type A implements B {
  first: String
  second: Float
}

interface B {
  second: Float
  c: [C!]!
}

type C {
  c: ID!
}
`
    expect(await importSchema('tests/loaders/schema/fixtures/interfaces/a.graphql')).toBe(expectedSDL)
})

test('importSchema: interfaces-many', async () => {
    const expectedSDL = `\
type A implements B {
  first: String
  second: Float
}

interface B {
  second: Float
  c: [C!]!
}

type C implements D1 & D2 {
  c: ID!
}

interface D1 {
  d1: ID!
}

interface D2 {
  d2: ID!
}
`
    expect(await importSchema('tests/loaders/schema/fixtures/interfaces-many/a.graphql')).toBe(expectedSDL)
})

test('importSchema: interfaces-implements', async () => {
    const expectedSDL = `\
type A implements B {
  id: ID!
}

interface B {
  id: ID!
}

type B1 implements B {
  id: ID!
}
`
    expect(await importSchema('tests/loaders/schema/fixtures/interfaces-implements/a.graphql')).toBe(expectedSDL)
})

test('importSchema: interfaces-implements-many', async () => {
    const expectedSDL = `\
type A implements B {
  id: ID!
}

interface B {
  id: ID!
}

type B1 implements B {
  id: ID!
}

type B2 implements B {
  id: ID!
}
`
    expect(
        await importSchema('tests/loaders/schema/fixtures/interfaces-implements-many/a.graphql')
    ).toBe(
        expectedSDL,
    )
})

test('importSchema: input types', async () => {
    const expectedSDL = `\
type A {
  first(b: B): String
  second: Float
}

input B {
  hello: [C!]!
}

input C {
  id: ID!
}
`
    expect(await importSchema('tests/loaders/schema/fixtures/input-types/a.graphql')).toBe(expectedSDL)
})

test('importSchema: complex test', async () => {
    expect(() => {
        importSchema('tests/loaders/schema/fixtures/complex/a.graphql')
    }).not.toThrow();
})

test('circular imports', async () => {
    const expectedSDL = `\
type A {
  first: String
  second: Float
  b: B
}

type C1 {
  id: ID!
}

type C2 {
  id: ID!
}

type B {
  hello: String!
  c1: C1
  c2: C2
  a: A
}
`
    const actualSDL = await importSchema('tests/loaders/schema/fixtures/circular/a.graphql')
    expect(actualSDL).toBe(expectedSDL)
})

test('related types', async () => {
    const expectedSDL = `\
type A {
  first: String
  second: Float
  b: B
}

type B {
  hello: String!
  c1: C
}

type C {
  field: String
}
`
    const actualSDL = await importSchema('tests/loaders/schema/fixtures/related-types/a.graphql')
    expect(actualSDL).toBe(expectedSDL)
})

test('relative paths', async () => {
    const expectedSDL = `\
type Query {
  feed: [Post!]!
}

type Mutation {
  createDraft(title: String!, text: String): Post
  publish(id: ID!): Post
}

type Post implements Node {
  id: ID!
  isPublished: Boolean!
  title: String!
  text: String!
}

interface Node {
  id: ID!
}
`
    const actualSDL = await importSchema('tests/loaders/schema/fixtures/relative-paths/src/schema.graphql')
    expect(actualSDL).toBe(expectedSDL)
})

test('root field imports', async () => {
    const expectedSDL = `\
type Query {
  posts(filter: PostFilter): [Post]
}

type Dummy {
  field: String
}

type Post {
  field1: String
}

input PostFilter {
  field3: Int
}
`
    const actualSDL = await importSchema('tests/loaders/schema/fixtures/root-fields/a.graphql')
    expect(actualSDL).toBe(expectedSDL)
})

test('extend root field', async () => {
    const expectedSDL = `\
extend type Query {
  me: User
}

type User @key(fields: "id") {
  id: ID!
  name: String
}
`
    const actualSDL = await importSchema('tests/loaders/schema/fixtures/root-fields/c.graphql')
    expect(actualSDL).toBe(expectedSDL)
})

test('extend root field imports', async () => {
    const expectedSDL = `\
extend type Query {
  me: User
  post: Post
}

type Post {
  id: ID!
}

type User @key(fields: "id") {
  id: ID!
  name: String
}
`
    const actualSDL = await importSchema('tests/loaders/schema/fixtures/root-fields/d.graphql')
    expect(actualSDL).toBe(expectedSDL)
})

test('merged root field imports', async () => {
    const expectedSDL = `\
type Query {
  helloA: String
  posts(filter: PostFilter): [Post]
  hello: String
}

type Dummy {
  field: String
  field2: String
}

type Post {
  field1: String
}

input PostFilter {
  field3: Int
}
`
    const actualSDL = await importSchema('tests/loaders/schema/fixtures/merged-root-fields/a.graphql')
    expect(actualSDL).toBe(expectedSDL)
})

test('global schema modules', async () => {
    const shared = `
    type Shared {
      first: String
    }

  `
    const expectedSDL = `\
type A {
  first: String
  second: Shared
}

type Shared {
  first: String
}
`
    expect(await importSchema('tests/loaders/schema/fixtures/global/a.graphql', { schemas: { shared } })).toBe(expectedSDL)
})

test('missing type on type', async () => {
    try {
        await importSchema('tests/loaders/schema/fixtures/type-not-found/a.graphql');
        throw new Error();
    } catch (e) {
        expect(e.message).toBe(`Field test: Couldn't find type Post in any of the schemas.`);
    }

})

test('missing type on interface', async () => {
    try {
        await importSchema('tests/loaders/schema/fixtures/type-not-found/b.graphql');
        throw new Error();
    } catch (e) {
        expect(e.message).toBe(`Field test: Couldn't find type Post in any of the schemas.`)
    }

})

test('missing type on input type', async () => {
    try {
        await importSchema('tests/loaders/schema/fixtures/type-not-found/c.graphql');
        throw new Error();
    } catch (e) {
        expect(e.message).toBe(`Field post: Couldn't find type Post in any of the schemas.`)
    }

})

test('missing interface type', async () => {

    try {
        await importSchema('tests/loaders/schema/fixtures/type-not-found/d.graphql');
        throw new Error();
    } catch (e) {
        expect(e.message).toBe(`Couldn't find interface MyInterface in any of the schemas.`)
    }

})

test('missing union type', async () => {

    try {
        await importSchema('tests/loaders/schema/fixtures/type-not-found/e.graphql')
        throw new Error();
    } catch (e) {
        expect(e.message).toBe(`Couldn't find type C in any of the schemas.`)
    }

})

test('missing type on input type', async () => {

    try {
        await importSchema('tests/loaders/schema/fixtures/type-not-found/f.graphql');
        throw new Error();
    } catch (e) {
        expect(e.message).toBe(`Field myfield: Couldn't find type Post in any of the schemas.`)
    }

})

test('missing type on directive', async () => {

    try {
        await importSchema('tests/loaders/schema/fixtures/type-not-found/g.graphql');
        throw new Error();
    } catch (e) {
        expect(e.message).toBe(`Directive first: Couldn't find type first in any of the schemas.`)
    }

})

test('import with collision', async () => {
    // Local type gets preference over imported type
    const expectedSDL = `\
type User {
  id: ID!
  name: String!
  intro: String
}
`
    expect(await importSchema('tests/loaders/schema/fixtures/collision/a.graphql')).toBe(expectedSDL)
})

function stripWhitespaces(str: string): string {
    return str.replace(/\s+/g, ' ').trim();
}


test('merged custom root fields imports', async () => {
    const expectedSDL = stripWhitespaces(`\
  type Query {
    helloA: String
    posts(filter: PostFilter): [Post]
    hello: String
  }
  type Dummy {
    field: String
    field2: String
  }
  type Post {
    field1: String
  }
  input PostFilter {
    field3: Int
  }
  `);
    const actualSDL = await importSchema('tests/loaders/schema/fixtures/merged-root-fields/a.graphql', { mergeableTypes: ['Dummy'] })
    expect(stripWhitespaces(actualSDL)).toBe(stripWhitespaces(expectedSDL))
})