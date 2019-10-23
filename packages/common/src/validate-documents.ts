const AggregateError = require('aggregate-error');
import { Kind, validate, GraphQLSchema, GraphQLError, specifiedRules, FragmentDefinitionNode, ValidationContext, ASTVisitor } from 'graphql';
import { Source } from './loaders';

export type ValidationRule = (context: ValidationContext) => ASTVisitor;
const DEFAULT_IGNORED_RULES = ['NoUnusedFragments', 'NoUnusedVariables', 'KnownDirectives'];
const DEFAULT_EFFECTIVE_RULES = specifiedRules.filter((f: Function) => !DEFAULT_IGNORED_RULES.includes(f.name));

export interface LoadDocumentError {
  readonly filePath: string;
  readonly errors: ReadonlyArray<GraphQLError>;
}

export const validateGraphQlDocuments = async (schema: GraphQLSchema, documentFiles: Source[], effectiveRules: ValidationRule[] = DEFAULT_EFFECTIVE_RULES): Promise<ReadonlyArray<LoadDocumentError>> => {
  const allFragments: FragmentDefinitionNode[] = [];

  const allFragments$ = Promise.all(
    documentFiles.map(async documentFile => {
      if (documentFile.document) {
        for (const definitionNode of documentFile.document.definitions) {
          if (definitionNode.kind === Kind.FRAGMENT_DEFINITION) {
            allFragments.push(definitionNode);
          }
        }
      }
    })
  );

  await allFragments$;

  const allErrors: LoadDocumentError[] = [];

  const allErrors$ = Promise.all(
    documentFiles.map(async documentFile => {
      const documentToValidate = {
        kind: Kind.DOCUMENT,
        definitions: [...allFragments, ...documentFile.document.definitions].filter((d, index, arr) => {
          if (d.kind === Kind.FRAGMENT_DEFINITION) {
            const foundIndex = arr.findIndex(i => i.kind === Kind.FRAGMENT_DEFINITION && i.name.value === d.name.value);

            if (foundIndex !== index) {
              return false;
            }
          }

          return true;
        }),
      };

      const errors = validate(schema, documentToValidate, effectiveRules);

      if (errors.length > 0) {
        allErrors.push({
          filePath: documentFile.location,
          errors,
        });
      }
    })
  );

  await allErrors$;

  return allErrors;
};

export function checkValidationErrors(loadDocumentErrors: ReadonlyArray<LoadDocumentError>): void | never {
  if (loadDocumentErrors.length > 0) {
    const errors: Error[] = [];

    for (const loadDocumentError of loadDocumentErrors) {
      for (const graphQLError of loadDocumentError.errors) {
        const error = new Error();
        error.name = 'GraphQLDocumentError';
        error.message = `${error.name}: ${graphQLError.message}`;
        error.stack = error.message;
        graphQLError.locations.forEach(location => (error.stack += `\n    at ${loadDocumentError.filePath}:${location.line}:${location.column}`));

        errors.push(error);
      }
    }

    throw new AggregateError(errors);
  }
}
