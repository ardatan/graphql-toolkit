import { loadResolversFiles, loadSchemaFiles } from '../../src';

function testSchemaDir({ path, expected, note, extensions, ignoreIndex }: { path: string; expected: any; note: string; extensions?: string[] | null; ignoreIndex?: boolean }) {
  it(`should return the correct schema results for path: ${path} (${note})`, () => {
    const options = { ignoreIndex };
    const result = loadSchemaFiles(path, extensions ? { ...options, extensions } : options);

    expect(result.length).toBe(expected.length);
    expect(result.map(stripWhitespaces)).toEqual(expected.map(stripWhitespaces));
  });
}

function testResolversDir({ path, expected, note, extensions, compareValue, ignoreIndex }: { path: string; expected: any; note: string; extensions?: string[]; compareValue?: boolean; ignoreIndex?: boolean }) {
  if (typeof compareValue === 'undefined') {
    compareValue = true;
  }

  it(`should return the correct resolvers results for path: ${path} (${note})`, () => {
    const options = {
      ignoreIndex,
    };
    const result = loadResolversFiles(path, extensions ? { ...options, extensions } : options);

    expect(result.length).toBe(expected.length);

    if (compareValue) {
      expect(result).toEqual(expected);
    }
  });
}

function stripWhitespaces(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

describe('file scanner', function() {
  describe('schema', () => {
    const schemaContent = `type MyType { f: String }`;
    testSchemaDir({
      path: './tests/sonar/test-assets/1',
      expected: [schemaContent],
      note: 'one file',
    });
    testSchemaDir({
      path: './tests/sonar/test-assets/2',
      expected: [schemaContent, schemaContent, schemaContent],
      note: 'multiple files',
    });
    testSchemaDir({
      path: './tests/sonar/test-assets/3',
      expected: [schemaContent, schemaContent, schemaContent],
      note: 'recursive',
    });
    testSchemaDir({
      path: './tests/sonar/test-assets/4',
      expected: [schemaContent],
      note: 'custom extension',
      extensions: ['schema'],
    });
    testSchemaDir({
      path: './tests/sonar/test-assets/5',
      expected: [schemaContent, schemaContent],
      note: 'custom extensions',
      extensions: ['schema', 'myschema'],
    });
    testSchemaDir({
      path: './tests/sonar/test-assets/10',
      expected: [schemaContent, schemaContent, schemaContent],
      note: 'code files with gql tag',
      extensions: ['js'],
    });
    testSchemaDir({
      path: './tests/sonar/test-assets/10',
      expected: [schemaContent, schemaContent, schemaContent],
      note: 'code files with gql tag',
      extensions: ['js'],
    });
    testSchemaDir({
      path: './tests/sonar/test-assets/12',
      expected: [schemaContent],
      note: 'should ignore index on demand',
      extensions: ['graphql'],
      ignoreIndex: true,
    });
    testSchemaDir({
      path: './tests/sonar/test-assets/12',
      expected: [schemaContent, `type IndexType { f: Int }`],
      note: 'should include index by default',
      extensions: ['graphql'],
    });
  });

  describe('resolvers', () => {
    testResolversDir({
      path: './tests/sonar/test-assets/6',
      expected: [{ MyType: { f: 1 } }],
      note: 'one file',
    });
    testResolversDir({
      path: './tests/sonar/test-assets/7',
      expected: [{ MyType: { f: 1 } }, { MyType: { f: 2 } }],
      note: 'multiple files',
    });
    testResolversDir({
      path: './tests/sonar/test-assets/8',
      expected: [{ MyType: { f: 1 } }],
      note: 'default export',
    });
    testResolversDir({
      path: './tests/sonar/test-assets/9',
      expected: [{ MyType: { f: 1 } }, { MyType: { f: 2 } }],
      note: 'named exports',
    });
    testResolversDir({
      path: './tests/sonar/test-assets/11',
      expected: new Array(2).fill(''),
      note: 'ignored extensions',
      extensions: null,
      compareValue: false,
    });
    testResolversDir({
      path: './tests/sonar/test-assets/12',
      expected: [
        {
          MyType: {
            f: '12',
          },
        },
        {
          IndexType: {
            f: '12',
          },
        },
      ],
      note: 'includes index files but only if it matches extensions',
      extensions: ['js'],
      compareValue: true,
    });
    testResolversDir({
      path: './tests/sonar/test-assets/12',
      expected: [
        {
          MyType: {
            f: '12',
          },
        },
      ],
      note: 'ingore index files',
      extensions: ['js'],
      compareValue: true,
      ignoreIndex: true,
    });
  });
});
