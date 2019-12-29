import {
  buildASTSchema,
  printSchema,
  DefinitionNode,
  DocumentNode,
  GraphQLSchema,
  parse,
  print,
  Source,
  GraphQLObjectType,
  isSpecifiedScalarType,
  isIntrospectionType,
  GraphQLScalarType,
  printType,
  ObjectTypeExtensionNode,
  GraphQLNamedType,
  Kind,
} from 'graphql';
import { isGraphQLSchema, isSourceTypes, isStringTypes, isSchemaDefinition } from './utils';
import { MergedResultMap, mergeGraphQLNodes } from './merge-nodes';
import { resetComments, printWithComments } from './comments';
import { fixSchemaAst } from '@graphql-toolkit/common';

type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
type CompareFn<T> = (a: T, b: T) => number;

export interface Config {
  /**
   * Produces `schema { query: ..., mutation: ..., subscription: ... }`
   *
   * Default: true
   */
  useSchemaDefinition?: boolean;
  /**
   * Creates schema definition, even when no types are available
   * Produces: `schema { query: Query }`
   *
   * Default: false
   */
  forceSchemaDefinition?: boolean;
  /**
   * Throws an error on a merge conflict
   *
   * Default: false
   */
  throwOnConflict?: boolean;
  /**
   * Descriptions are defined as preceding string literals, however an older
   * experimental version of the SDL supported preceding comments as
   * descriptions. Set to true to enable this deprecated behavior.
   * This option is provided to ease adoption and will be removed in v16.
   *
   * Default: false
   */
  commentDescriptions?: boolean;
  /**
   * Puts the next directive first.
   *
   * Default: false
   *
   * @example:
   * Given:
   * ```graphql
   *  type User { a: String @foo }
   *  type User { a: String @bar }
   * ```
   *
   * Results:
   * ```
   *  type User { a: @bar @foo }
   * ```
   */
  reverseDirectives?: boolean;
  exclusions?: string[];
  sort?: boolean | CompareFn<string>;
}

export function mergeGraphQLSchemas(types: Array<string | Source | DocumentNode | GraphQLSchema>, config?: Omit<Partial<Config>, 'commentDescriptions'>) {
  console.info(`
    GraphQL Toolkit/Epoxy 
    Deprecation Notice;
    'mergeGraphQLSchemas' is deprecated and will be removed in the next version.
    Please use 'mergeTypeDefs' instead!
  `);
  return mergeGraphQLTypes(types, config);
}

export function mergeTypeDefs(types: Array<string | Source | DocumentNode | GraphQLSchema>): DocumentNode;
export function mergeTypeDefs(types: Array<string | Source | DocumentNode | GraphQLSchema>, config?: Partial<Config> & { commentDescriptions: true }): string;
export function mergeTypeDefs(types: Array<string | Source | DocumentNode | GraphQLSchema>, config?: Omit<Partial<Config>, 'commentDescriptions'>): DocumentNode;
export function mergeTypeDefs(types: Array<string | Source | DocumentNode | GraphQLSchema>, config?: Partial<Config>): DocumentNode | string {
  resetComments();

  const doc = {
    kind: Kind.DOCUMENT,
    definitions: mergeGraphQLTypes(types, {
      useSchemaDefinition: true,
      forceSchemaDefinition: false,
      throwOnConflict: false,
      commentDescriptions: false,
      ...config,
    }),
  };

  let result: any;

  if (config && config.commentDescriptions) {
    result = printWithComments(doc);
  } else {
    result = doc;
  }

  resetComments();

  return result;
}

function createSchemaDefinition(
  def: { query: string | GraphQLObjectType | null; mutation: string | GraphQLObjectType | null; subscription: string | GraphQLObjectType | null },
  config?: {
    force?: boolean;
  }
): string {
  const schemaRoot: {
    query?: string;
    mutation?: string;
    subscription?: string;
  } = {};

  if (def.query) {
    schemaRoot.query = def.query.toString();
  }
  if (def.mutation) {
    schemaRoot.mutation = def.mutation.toString();
  }
  if (def.subscription) {
    schemaRoot.subscription = def.subscription.toString();
  }

  const fields = Object.keys(schemaRoot)
    .map(rootType => (schemaRoot[rootType] ? `${rootType}: ${schemaRoot[rootType]}` : null))
    .filter(a => a);

  if (fields.length) {
    return `schema { ${fields.join('\n')} }`;
  } else if (config && config.force) {
    return ` schema { query: Query } `;
  }

  return undefined;
}

export function mergeGraphQLTypes(types: Array<string | Source | DocumentNode | GraphQLSchema>, config: Config): DefinitionNode[] {
  resetComments();

  const allNodes: ReadonlyArray<DefinitionNode> = types
    .map<DocumentNode>(type => {
      if (isGraphQLSchema(type)) {
        let schema: GraphQLSchema = type;
        let typesMap = type.getTypeMap();
        const validAstNodes = Object.keys(typesMap).filter(key => typesMap[key].astNode);

        if (validAstNodes.length === 0 && Object.keys(typesMap).length > 0) {
          schema = fixSchemaAst(schema, config);
          typesMap = schema.getTypeMap();
        }

        const schemaDefinition = createSchemaDefinition({
          query: schema.getQueryType(),
          mutation: schema.getMutationType(),
          subscription: schema.getSubscriptionType(),
        });
        const allTypesPrinted = Object.keys(typesMap)
          .map(typeName => {
            const type = typesMap[typeName];
            const isPredefinedScalar = type instanceof GraphQLScalarType && isSpecifiedScalarType(type);
            const isIntrospection = isIntrospectionType(type);

            if (isPredefinedScalar || isIntrospection) {
              return null;
            }
            if (type.astNode) {
              return print(type.extensionASTNodes ? extendDefinition(type) : type.astNode);
            } else {
              // KAMIL: we might want to turn on descriptions in future
              return printType(correctType(typeName, typesMap), { commentDescriptions: config.commentDescriptions });
            }
          })
          .filter(e => e);
        const directivesDeclaration = schema
          .getDirectives()
          .map(directive => (directive.astNode ? print(directive.astNode) : null))
          .filter(e => e);
        const printedSchema = [...directivesDeclaration, ...allTypesPrinted, schemaDefinition].join('\n');

        return parse(printedSchema);
      } else if (isStringTypes(type) || isSourceTypes(type)) {
        return parse(type);
      }

      return type;
    })
    .map(ast => ast.definitions)
    .reduce((defs, newDef = []) => [...defs, ...newDef], []);

  // XXX: right now we don't handle multiple schema definitions
  let schemaDef: {
    query: string | null;
    mutation: string | null;
    subscription: string | null;
  } = allNodes.filter(isSchemaDefinition).reduce(
    (def, node) => {
      node.operationTypes
        .filter(op => op.type.name.value)
        .forEach(op => {
          def[op.operation] = op.type.name.value;
        });

      return def;
    },
    {
      query: null,
      mutation: null,
      subscription: null,
    }
  );

  const mergedNodes: MergedResultMap = mergeGraphQLNodes(allNodes, config);
  const allTypes = Object.keys(mergedNodes);
  if (config && config.sort) {
    allTypes.sort(typeof config.sort === 'function' ? config.sort : undefined);
  }

  if (config && config.useSchemaDefinition) {
    const queryType = schemaDef.query ? schemaDef.query : allTypes.find(t => t === 'Query');
    const mutationType = schemaDef.mutation ? schemaDef.mutation : allTypes.find(t => t === 'Mutation');
    const subscriptionType = schemaDef.subscription ? schemaDef.subscription : allTypes.find(t => t === 'Subscription');
    schemaDef = {
      query: queryType,
      mutation: mutationType,
      subscription: subscriptionType,
    };
  }

  const schemaDefinition = createSchemaDefinition(schemaDef, {
    force: config.forceSchemaDefinition,
  });

  if (!schemaDefinition) {
    return Object.values(mergedNodes);
  }

  return [...Object.values(mergedNodes), parse(schemaDefinition).definitions[0]];
}

function extendDefinition(type: GraphQLNamedType): GraphQLNamedType['astNode'] {
  switch (type.astNode.kind) {
    case Kind.OBJECT_TYPE_DEFINITION:
      return {
        ...type.astNode,
        fields: type.astNode.fields.concat((type.extensionASTNodes as ReadonlyArray<ObjectTypeExtensionNode>).reduce((fields, node) => fields.concat(node.fields), [])),
      };
    case Kind.INPUT_OBJECT_TYPE_DEFINITION:
      return {
        ...type.astNode,
        fields: type.astNode.fields.concat((type.extensionASTNodes as ReadonlyArray<ObjectTypeExtensionNode>).reduce((fields, node) => fields.concat(node.fields), [])),
      };
    default:
      return type.astNode;
  }
}

function correctType<TMap extends { [key: string]: GraphQLNamedType }, TName extends keyof TMap>(typeName: TName, typesMap: TMap): TMap[TName] {
  const type = typesMap[typeName];

  type.name = typeName.toString();

  return type;
}
