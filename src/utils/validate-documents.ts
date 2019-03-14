import AggregateError from 'aggregate-error';
import { validate, GraphQLSchema, GraphQLError, specifiedRules } from 'graphql';
import { DocumentFile } from '../loaders/documents';

const rulesToIgnore = ['KnownFragmentNames', 'NoUnusedFragments', 'NoUnusedVariables', 'KnownDirectives'];
const effectiveRules = specifiedRules.filter((f: Function) => !rulesToIgnore.includes(f.name));

export interface LoadDocumentError {
  readonly filePath: string;
  readonly errors: ReadonlyArray<GraphQLError>;
}

export const validateGraphQlDocuments = (schema: GraphQLSchema, documentFiles: DocumentFile[]): ReadonlyArray<LoadDocumentError> =>
  documentFiles
    .map(result => ({
      filePath: result.filePath,
      errors: validate(schema, result.content, effectiveRules),
    }))
    .filter(r => r.errors.length > 0);

export function checkValidationErrors(loadDocumentErrors: ReadonlyArray<LoadDocumentError>): void | never {
  if (loadDocumentErrors.length > 0) {
    const errors: Error[] = [];

    for (const loadDocumentError of loadDocumentErrors) {
      for (const graphQLError of loadDocumentError.errors) {
        const error = new Error()
        error.name = 'GraphQLDocumentError'
        error.message = `${error.name}: ${graphQLError.message}`
        error.stack = error.message

        graphQLError.locations.forEach(location =>
          error.stack += `\n    at ${loadDocumentError.filePath}:${location.line}:${location.column}`
        );

        errors.push(error);
      }
    }

    throw new AggregateError(errors);
  }
}
