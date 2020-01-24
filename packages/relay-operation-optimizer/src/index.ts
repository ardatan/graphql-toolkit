import { printSchemaWithDirectives } from '@graphql-toolkit/common';
import { parse, GraphQLSchema, DefinitionNode, DocumentNode, ParseOptions, concatAST } from 'graphql';

import * as SkipRedundantNodesTransform from 'relay-compiler/lib/transforms/SkipRedundantNodesTransform';
import * as InlineFragmentsTransform from 'relay-compiler/lib/transforms/InlineFragmentsTransform';
import * as ApplyFragmentArgumentTransform from 'relay-compiler/lib/transforms/ApplyFragmentArgumentTransform';
import * as FlattenTransform from 'relay-compiler/lib/transforms/FlattenTransform';
import GraphQLCompilerContext from 'relay-compiler/lib/core/GraphQLCompilerContext';
import * as RelayParser from 'relay-compiler/lib/core/RelayParser';
import * as RelayPrinter from 'relay-compiler/lib/core/GraphQLIRPrinter';
import * as RelayCreate from 'relay-compiler/lib/core/Schema';
import { Options } from 'graphql/utilities/schemaPrinter';

export type OptimizeDocumentsOptions = Options &
  ParseOptions & {
    includeFragments?: boolean;
  };

export const optimizeDocuments = (schema: GraphQLSchema, documents: DocumentNode[], options: OptimizeDocumentsOptions = {}) => {
  // @TODO way for users to define directives they use, otherwise relay will throw an unknown directive error
  // Maybe we can scan the queries and add them dynamically without users having to do some extra stuff
  // transformASTSchema creates a new schema instance instead of mutating the old one
  const adjustedSchema = RelayCreate.create(printSchemaWithDirectives(schema, options));

  const documentAsts = concatAST(documents);

  const relayDocuments = RelayParser.transform(adjustedSchema, documentAsts.definitions as DefinitionNode[]);

  const result: DocumentNode[] = [];

  if (options.includeFragments) {
    const fragmentCompilerContext = new GraphQLCompilerContext(adjustedSchema)
      .addAll(relayDocuments)
      .applyTransforms([ApplyFragmentArgumentTransform.transform, FlattenTransform.transformWithOptions({ flattenAbstractTypes: false }), SkipRedundantNodesTransform.transform]);

    result.push(
      ...fragmentCompilerContext
        .documents()
        .filter(doc => doc.kind === 'Fragment')
        .map(doc => parse(RelayPrinter.print(adjustedSchema, doc), options))
    );
  }

  const queryCompilerContext = new GraphQLCompilerContext(adjustedSchema)
    .addAll(relayDocuments)
    .applyTransforms([ApplyFragmentArgumentTransform.transform, InlineFragmentsTransform.transform, FlattenTransform.transformWithOptions({ flattenAbstractTypes: false }), SkipRedundantNodesTransform.transform]);

  result.push(...queryCompilerContext.documents().map(doc => parse(RelayPrinter.print(adjustedSchema, doc), options)));

  return result;
};
