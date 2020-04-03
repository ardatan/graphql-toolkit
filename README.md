![tool](https://user-images.githubusercontent.com/25294569/64810060-4d9c8680-d5a3-11e9-9a66-84ff20e1179f.gif)

[![npm version](https://badge.fury.io/js/%40graphql-toolkit%2Fcore.svg)](https://badge.fury.io/js/%40graphql-toolkit%2Fcore)
![CI](https://github.com/ardatan/graphql-toolkit/workflows/CI/badge.svg)
[![Discord Chat](https://img.shields.io/discord/625400653321076807)](https://discord.gg/xud7bH9)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![renovate-app badge][renovate-badge]][renovate-app]

[renovate-badge]: https://img.shields.io/badge/renovate-app-blue.svg
[renovate-app]: https://renovateapp.com/

A set of utils for faster development of GraphQL tools. Use these utils if you are creating a tool that loads schema/documents, merges schemas, scan for schema/documents/resolvers files.

# Features
- [Schema Loading](#schema-loading)
- [Documents Loading](#documents-loading)
- [Schema Merging](#schema-merging)
- - [`GraphQLSchema` Merging](#graphql-schema-merging)
- - [Type Definitions (SDL) Merging](#typedefs-merging)
- - [Resolvers Merging](#resolvers-merging)
- [File Loading for Schema and Resolvers](#file-loading)
- [Other Utils](#other-utils)

### <a name="schema-loading"></a> Schema Loading

These utils are useful for scanning, loading and building a GraphQL schema from any input.

You can specify a GraphQL endpoint, local introspection JSON file, code file that `export`s a GraphQLSchema, AST string and `.graphql` files (with support for `glob` expression).

All found schema files can be merged into a complete schema. There is support for `#import` syntax (using [`graphql-import`](https://github.com/prisma/graphql-import)).

The user is given the option of implementing their own loader (implement the interface `SchemaLoader`).

The schema loading util is using loaders, and implemented using [chain-of-responsibility pattern](https://en.wikipedia.org/wiki/Chain-of-responsibility_pattern). 

Specifiying the loader is not necessary. The user need only provide the inputs. The utils will detect it automatically.

Usage:

```ts
import { loadSchema } from '@graphql-toolkit/core';
import { UrlLoader } from '@graphql-toolkit/url-loader';
import { JsonFileLoader } from '@graphql-toolkit/json-file-loader';
import { GraphQLFileLoader } from '@graphql-toolkit/graphql-file-loader';

const schema1 = loadSchema('type A { foo: String }');   // load from string w/ no loaders

const schema2 = loadSchema('http://localhost:3000/graphql', {   // load from endpoint
    loaders: [
        new UrlLoader()
    ]
});

const schema3 = loadSchema('./schema.json', {   // load from local json file
    loaders: [
        new JsonFileLoader()
    ]
}); 

const schema4 = loadSchema('schema.graphql', {  // load from a single schema file
    loaders: [
        new GraphQLFileLoader()
    ]
}); 

const schema5 = loadSchema('./src/**/*.graphql', { // load from multiple files using glob
    loaders: [
        new GraphQLFileLoader()
    ]
});
```

### <a name="documents-loading"></a> Documents Loading

Similar to schema loading - but meant to use for GraphQL documents (query/mutation/subscription/fragment).

Any input provided as a source will be recognized by utils automatically.

It also extracts usages of `gql` from code files using [`graphql-tag-pluck`](https://github.com/ardatan/graphql-toolkit/tree/master/packages/graphql-tag-pluck).

#### Usage:

```ts
import { loadDocuments } from '@graphql-toolkit/core';
import { GraphQLFileLoader } from '@graphql-toolkit/graphql-file-loader';
import { CodeFileLoader } from '@graphql-toolkit/code-file-loader';

const document1 = loadDocuments('query { f }'); // load from string

const document2 = loadDocuments('./users.query.graphql', {  // load from a single file 
    loaders: [
        new GraphQLFileLoader()
    ]
});

const document3 = loadDocuments('./src/**/*.graphql', { // load from multiple files using glob
    loaders: [
        new GraphQLFileLoader()
    ]
});

const document4 = loadDocuments('./src/my-component.ts', {  // load from code file
    loaders: [
        new CodeFileLoader()
    ]
});


```

### <a name="schema-merging"></a> Schema Merging

Originally implemented in [graphql-modules](https://github.com/Urigo/graphql-modules). This tools merged GraphQL type definitions and schema. It aims to merge all possible types, interfaces, enums and unions, without conflicts.

Resolvers are merged using deep-merge. Resolver implementations can be separated across multiple objects and then merged into a single `resolvers` object.

#### <a name="graphql-schema-merging"></a> Merging different `GraphQLSchema`s
You can use `mergeSchemas` to merge `GraphQLSchema` objects together with extra `typeDefs` and `resolvers`.

```ts
import { mergeSchemas } from '@graphql-toolkit/schema-merging';

const mergedSchema = mergeSchemas({
    schemas: [
        BarSchema,
        BazSchema,
    ],
    typeDefs: `
        type ExtraType {
            foo: String
        }
    `,
    resolvers: {
        ExtraType: {
            foo: () => 'FOO',
        }
    }
});
```

> There is also `mergeSchemasAsync` as a faster asynchronous alternative.

#### <a name="typedefs-merging"></a> Merging GraphQL Type Definitions (SDL)

```ts
import { mergeTypeDefs } from '@graphql-toolkit/schema-merging';

const typeDef1 = /* GraphQL */`
    type A {
        f1: String
    }
`;

const typeDef2 = /* GraphQL */`
    type A {
    f2: String
    }
`;

const result = mergeTypeDefs([typeDef1, typeDef2]);
```

Will result:
```graphql
type A {
    f1: String
    f2: String
}
```

#### <a name="resolvers-merging"></a> Merging Resolvers

```ts
import { mergeResolvers } from '@graphql-toolkit/schema-merging';

const QueryResolvers = {
    Query: {
        foo: () => 'FOO',
    }
};

const MutationResolvers = {
    Mutation: {
      bar: () => 'BAR',
    }
};

const mergedResolvers = mergeResolvers([
  QueryResolvers,
  MutationResolvers,
]);
```

### <a name="file-loading"></a> File Loading for both schema and resolvers

There is a small util in GraphQL Toolkit that scans you file-system and find GraphQL files (`.graphql`) and resolvers files (`.js`/`.ts`) and loads them (using `readFile` for GraphQL files and `require` for resolvers files).

```ts
import { loadFiles } from '@graphql-toolkit/file-loading';
import { join } from 'path';

const typeDefs = loadFiles(join(__dirname, 'typeDefs', '**/*.graphql'));
const resolvers = loadFiles(join(__dirname, 'resolvers', '**/*.ts'));

const graphQLServer = new ApolloServer({
    typeDefs,
    resolvers,
});
```

> There is also `loadFilesAsync` as a faster asynchronous alternative.

### <a name="other-utils"></a> Other Utils

There are some more utils under `@graphql-toolkit/common` package:

#### `validateGraphQlDocuments`

A tool for validating GraphQL documents (query/mutation/subscription/fragment) against the schema.

It uses the original validation logic from `graphql` package, but suspressing some validation rules, and focuses on validating the fields and the structure of the documents.

#### `extractDocumentStringFromCodeFile`

This method gets a source code file, and using `graphql-tag-pluck` tries to extract GraphQL AST from it. 

#### `getDirectives`

This method accepts `GraphQLSchema` and any AST node, and tries to extract the GraphQL directives of the AST node. 

It returnes a `Map` of the directive name and the arguments of it. 

#### `getFieldsWithDirectives`

This method accepts a GraphQL `DocumentNode` of a GraphQL types definition and creates a map between GraphQL `type.field` and the directives it has. 

It's useful for getting an easy-to-use structure of the directives that are decorating the schema. 

#### `getImplementingTypes`

This method accepts `GraphQLSchema` object and a name of a GraphQL interface, and returns an array of all the GraphQL types that are implementing the GraphQL `interface`.

#### `getSchemaDirectiveFromDirectiveResolver`

This method accepts a name of a GraphQL Directive and its resolver function; using this method you can easily generate `SchemaDirective` with a single resolver function.

#### `composeResolvers`

This method accepts `IResolvers` object and mappings for composition functions that would be run before resolver itself.

Instead of doing this,

```js
const resolvers ={
    Query: {
        myQuery: (root, args, context) => {
            // Make sure that the user is authenticated
            if (!context.currentUser) {
                throw new Error('You are not authenticated!');
            }

            // Make sure that the user has the correct roles
            if (!context.currentUser.roles || context.currentUser.roles.includes('EDITOR')) {
                throw new Error('You are not authorized!');
            }

            // Business logic
            if (args.something === '1') {
                return true;
            }

            return false;
        },
    },
};
```

You can do;

```js
const resolvers ={
    Query: {
        myQuery: (root, args, context) => {
            if (args.something === '1') {
                return true;
            }

            return false;
        },
    },
};

const isAuthenticated = () => next => async (root, args, context, info) => {
    if (!context.currentUser) {
        throw new Error('You are not authenticated!');
    }

    return next(root, args, context, info);
};

const hasRole = (role: string) => next => async (root, args, context, info) => {
    if (!context.currentUser.roles || context.currentUser.roles.includes(role)) {
        throw new Error('You are not authorized!');
    }

    return next(root, args, context, info);
};

const resolversComposition = {
    'Query.myQuery': [isAuthenticated(), hasRole('EDITOR')],
};

const composedResolvers = composeResolvers(resolvers, resolversComposition);
```

#### `extractResolversFromSchema`

This methods accepts `GraphQLSchema` object, and returns a map with field resolver functions of all types inside the schema as in [`IResolvers` interface of `graphql-tools`.](https://www.apollographql.com/docs/graphql-tools/resolvers.html)

#### `extractFieldResolversFromObjectType`

This methods accepts `GraphQLObjectType` or `GraphQLInterfaceType` object, and returns a map with field resolvers of given type.
