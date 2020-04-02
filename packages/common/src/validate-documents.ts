import AggregateError from 'aggregate-error';
import {
  Kind,
  validate,
  GraphQLSchema,
  GraphQLError,
  specifiedRules,
  FragmentDefinitionNode,
  ValidationContext,
  ASTVisitor,
  DocumentNode,
} from 'graphql';
import { Source } from './loaders';

export type ValidationRule = (context: ValidationContext) => ASTVisitor;
const DEFAULT_IGNORED_RULES = ['NoUnusedFragments', 'NoUnusedVariables', 'KnownDirectives'];
const DEFAULT_EFFECTIVE_RULES = specifiedRules.filter((f: Function) => !DEFAULT_IGNORED_RULES.includes(f.name));

export interface LoadDocumentError {
  readonly filePath: string;
  readonly errors: ReadonlyArray<GraphQLError>;
}

export async function validateGraphQlDocuments(
  schema: GraphQLSchema,
  documentFiles: Source[],
  effectiveRules: ValidationRule[] = DEFAULT_EFFECTIVE_RULES
): Promise<ReadonlyArray<LoadDocumentError>> {
  const allFragments: FragmentDefinitionNode[] = [];

  documentFiles.forEach((documentFile) => {
    if (documentFile.document) {
      for (const definitionNode of documentFile.document.definitions) {
        if (definitionNode.kind === Kind.FRAGMENT_DEFINITION) {
          allFragments.push(definitionNode);
        }
      }
    }
  });

  const allErrors: LoadDocumentError[] = [];

  await Promise.all(
    documentFiles.map(async (documentFile) => {
      const documentToValidate = {
        kind: Kind.DOCUMENT,
        definitions: [...allFragments, ...documentFile.document.definitions].filter((definition, index, list) => {
          if (definition.kind === Kind.FRAGMENT_DEFINITION) {
            const firstIndex = list.findIndex(
              (def) => def.kind === Kind.FRAGMENT_DEFINITION && def.name.value === definition.name.value
            );
            const isDuplicated = firstIndex !== index;

            if (isDuplicated) {
              return false;
            }
          }

          return true;
        }),
      };

      const errors = skipUnusedFragmentsInNonOperations(
        documentToValidate,
        validate(schema, documentToValidate, effectiveRules)
      );

      if (errors.length > 0) {
        allErrors.push({
          filePath: documentFile.location,
          errors,
        });
      }
    })
  );

  return allErrors;
}

export function checkValidationErrors(loadDocumentErrors: ReadonlyArray<LoadDocumentError>): void | never {
  if (loadDocumentErrors.length > 0) {
    const errors: Error[] = [];

    for (const loadDocumentError of loadDocumentErrors) {
      for (const graphQLError of loadDocumentError.errors) {
        const error = new Error();
        error.name = 'GraphQLDocumentError';
        error.message = `${error.name}: ${graphQLError.message}`;
        error.stack = error.message;
        graphQLError.locations.forEach(
          (location) => (error.stack += `\n    at ${loadDocumentError.filePath}:${location.line}:${location.column}`)
        );

        errors.push(error);
      }
    }

    throw new AggregateError(errors);
  }
}

/**
 * GraphQL 15.0.0 throws an error ("unused fragment") when DocumentNode includes only a FragmentDefinitionNode
 * In previous versions, it was valid.
 * That's why we need to filter out "unused fragment" errors when a document has only fragments
 *
 * @deprecated
 */
function skipUnusedFragmentsInNonOperations(doc: DocumentNode, errors: readonly GraphQLError[]) {
  if (errors.length > 0) {
    const isFragmentOnly = doc.definitions.some((def) => def.kind === 'OperationDefinition') === false;

    if (isFragmentOnly) {
      return errors.filter((error) => error.message.includes('is never used') === false);
    }
  }

  return errors;
}
