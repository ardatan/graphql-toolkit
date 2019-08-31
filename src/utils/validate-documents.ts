import * as AggregateError from 'aggregate-error';
import { Kind, concatAST, validate, GraphQLSchema, GraphQLError, specifiedRules, FragmentDefinitionNode } from 'graphql';
import { DocumentFile } from '../loaders/load-typedefs';

const DEFAULT_IGNORED_RULES = ['NoUnusedFragments', 'NoUnusedVariables', 'KnownDirectives'];
const DEFAULT_EFFECTIVE_RULES = specifiedRules.filter((f: Function) => !DEFAULT_IGNORED_RULES.includes(f.name));

export interface LoadDocumentError {
  readonly filePath: string;
  readonly errors: ReadonlyArray<GraphQLError>;
}

export const validateGraphQlDocuments = (schema: GraphQLSchema, documentFiles: DocumentFile[], effectiveRules: typeof specifiedRules = DEFAULT_EFFECTIVE_RULES): ReadonlyArray<LoadDocumentError> => {
  const allAst = concatAST(documentFiles.map(m => m.content));
  const allFragments = allAst.definitions.filter(d => d.kind === Kind.FRAGMENT_DEFINITION) as FragmentDefinitionNode[];

  return documentFiles
    .map(file => {
      const documentToValidate = {
        kind: Kind.DOCUMENT,
        definitions: [...allFragments, ...file.content.definitions].filter((d, index, arr) => {
          if (d.kind === Kind.FRAGMENT_DEFINITION) {
            const foundIndex = arr.findIndex(i => i.kind === Kind.FRAGMENT_DEFINITION && i.name.value === d.name.value);

            if (foundIndex !== index) {
              return false;
            }
          }

          return true;
        }),
      };

      return {
        filePath: file.filePath,
        errors: validate(schema, documentToValidate, effectiveRules),
      };
    })
    .filter(r => r.errors.length > 0);
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
