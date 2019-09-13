![tool](https://user-images.githubusercontent.com/25294569/64810060-4d9c8680-d5a3-11e9-9a66-84ff20e1179f.gif)

A set of utils for faster development of GraphQL tools. Use these utils if you are creating a tool that loads schema/documents, merges schemas, scan for schema/documents/resolvers files.

Included tools:

### Schema Loading

These utils are useful for scanning, loading and building a GraphQL schema from any input.

You can either specify a GraphQL endpoint, local introspection JSON file, code file that `export`s a GraphQLSchema, AST string and `.graphql` files (with support for `glob` expression).

It also merges all found schema files into a complete schema, and has support for `#import` syntax (using [`graphql-import`](https://github.com/prisma/graphql-import)).

You can also extend the loads by implementing you own loader (implement the interface `SchemaLoader`).

The schema loading util is using loaders, and implemented using [chain-of-responsibility pattern](https://en.wikipedia.org/wiki/Chain-of-responsibility_pattern). 

You don't have to specify which loader to use - just provide your input and this utils will detect it automatically.

Usage:

```ts
import { loadSchema } from 'graphql-toolkit';

const schema1 = loadSchema('type A { foo: String }'); // load from string
const schema2 = loadSchema('http://localhost:3000/graphql'); // load from endpoint
const schema3 = loadSchema('./schema.json'); // load from local json file
const schema4 = loadSchema('schema.graphql'); // load from a single schema file
const schema5 = loadSchema('./src/**/*.graphql'); // load from multiple files using glob
```

### Documents Loading

Similar to schema loading - but meant to use for GraphQL documents (query/mutation/subscription/fragment).

You an specify any input as source, and this utils will detect it automatically. 

It also extracts usages of `gql` from code files using [`graphql-tag-pluck`](https://github.com/DAB0mB/graphql-tag-pluck).

Usage:

```ts
import { loadDocuments } from 'graphql-toolkit';

const document1 = loadDocuments('query { f }'); // load from string
const document2 = loadDocuments('./users.query.graphql'); // load from a single file 
const document3 = loadDocuments('./src/**/*.graphql'); // load from multiple files using glob
const document4 = loadDocuments('./src/my-component.ts'); // load from code file
```

### Epoxy

Originally implemented in [graphql-modules](https://github.com/Urigo/graphql-modules). This tools merged GraphQL type definitions and schema. It aims to merge all possible types, interfaces, enums and unions, without conflicts.

It also merged resolvers by using deep-merge, so you can separate your resolvers implementating across multiple objects and the merge it into a single `resolvers` object.

```graphql
# a1.graphql
type A {
    f1: String
}

# a2.graphql
type A {
    f2: String
}
```

Will result:
```graphql
type A {
    f1: String
    f2: String
}
```

### Sonar

Sonar is a small util that scans you file-system and find GraphQL files (`.graphql`) and resolvers files (`.js`/`.ts`) and loads them (using `readFile` for GraphQL files and `require` for resolvers files).

### Other Utils

There are some more utils under `utils` directory:

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
