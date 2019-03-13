import { checkValidationErrors } from '../../src/utils/validate-documents';

describe('checkValidationErrors', () => {
  it('Should throw errors source files and locations', async () => {
    const loadDocumentErrors = [
      {
        filePath: 'packages/server/src/modules/github-check-run/providers/documents/create-check-run.mutation.graphql',
        errors: [
          {
            message: 'Cannot query field "randomField" on type "CheckRun".',
            locations: [
              {
                line: 7,
                column: 13
              },
            ],
          },
          {
            message: 'Cannot query field "randomField2" on type "CheckRun".',
            locations: [
              {
                line: 8,
                column: 13
              },
            ],
          },
        ],
      },
      {
        filePath: 'packages/server/src/modules/github-check-run/providers/documents/check-run.query.graphql',
        errors: [
          {
            message: 'Cannot query field "randomField" on type "CheckRun".',
            locations: [
              {
                line: 7,
                column: 13
              },
            ],
          },
        ],
      },
    ];

    let errors
    try {
      checkValidationErrors(loadDocumentErrors as any);
    } catch (_errors) {
      console.log(errors);
      errors = _errors;
    }

    const { default: AggregateError } = await import('aggregate-error');
    expect(errors).toBeInstanceOf(AggregateError);

    let error;
    const generator = errors[Symbol.iterator]();

    error = generator.next().value;

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toEqual('GraphQLDocumentError');
    expect(error.message).toEqual('GraphQLDocumentError: Cannot query field "randomField" on type "CheckRun".');
    expect(error.stack).toEqual([
      'GraphQLDocumentError: Cannot query field "randomField" on type "CheckRun".',
      '    at packages/server/src/modules/github-check-run/providers/documents/create-check-run.mutation.graphql:7:13'
    ].join('\n'));

    error = generator.next().value;

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toEqual('GraphQLDocumentError');
    expect(error.message).toEqual('GraphQLDocumentError: Cannot query field "randomField2" on type "CheckRun".');
    expect(error.stack).toEqual([
      'GraphQLDocumentError: Cannot query field "randomField2" on type "CheckRun".',
      '    at packages/server/src/modules/github-check-run/providers/documents/create-check-run.mutation.graphql:8:13'
    ].join('\n'));

    error = generator.next().value;

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toEqual('GraphQLDocumentError');
    expect(error.message).toEqual('GraphQLDocumentError: Cannot query field "randomField" on type "CheckRun".');
    expect(error.stack).toEqual([
      'GraphQLDocumentError: Cannot query field "randomField" on type "CheckRun".',
      '    at packages/server/src/modules/github-check-run/providers/documents/check-run.query.graphql:7:13'
    ].join('\n'));
  });
});
