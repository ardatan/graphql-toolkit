import { loadResolversFiles, loadSchemaFiles, loadFilesAsync } from '@graphql-toolkit/file-loading';
import { print } from 'graphql';

function testSchemaDir({ path, expected, note, extensions, ignoreIndex }: { path: string; expected: any; note: string; extensions?: string[] | null; ignoreIndex?: boolean }) {
  it(`SYNC: should return the correct schema results for path: ${path} (${note})`, () => {
    const options = { ignoreIndex };
    const result = loadSchemaFiles(path, extensions ? { ...options, extensions } : options);

    expect(result.length).toBe(expected.length);
    expect(result.map(res => {
      if (res['kind'] === 'Document') {
        res = print(res);
      }
      return stripWhitespaces(res);
    })).toEqual(expected.map(stripWhitespaces));
  });
  
  it(`ASYNC: should return the correct schema results for path: ${path} (${note})`, async () => {
    const options = { ignoreIndex };
    const result = await loadFilesAsync(path, extensions ? { ...options, extensions } : options);

    expect(result.length).toBe(expected.length);
    expect(result.map(res => {
      if (res['kind'] === 'Document') {
        res = print(res);
      }
      return stripWhitespaces(res);
    })).toEqual(expected.map(stripWhitespaces));
  });
}

function testResolversDir({ path, expected, note, extensions, compareValue, ignoreIndex }: { path: string; expected: any; note: string; extensions?: string[]; compareValue?: boolean; ignoreIndex?: boolean }) {
  if (typeof compareValue === 'undefined') {
    compareValue = true;
  }

  it(`SYNC: should return the correct resolvers results for path: ${path} (${note})`, () => {
    const options = {
      ignoreIndex,
    };
    const result = loadResolversFiles(path, extensions ? { ...options, extensions } : options);

    expect(result.length).toBe(expected.length);

    if (compareValue) {
      expect(result).toEqual(expected);
    }
  });

  it(`ASYNC: should return the correct resolvers results for path: ${path} (${note})`, async () => {
    const options = {
      ignoreIndex,
    };
    const result = await loadFilesAsync(path, extensions ? { ...options, extensions } : options);

    expect(result.length).toBe(expected.length);

    if (compareValue) {
      expect(result).toEqual(expected);
    }
  });
}

function stripWhitespaces(str: any): string {
  return str.toString().replace(/\s+/g, ' ').trim();
}

describe('file scanner', function() {
  describe('schema', () => {
    const schemaContent = `type MyType { f: String }`;
    testSchemaDir({
      path: './tests/test-assets/1',
      expected: [schemaContent],
      note: 'one file',
    });
    testSchemaDir({
      path: './tests/test-assets/2',
      expected: [schemaContent, schemaContent, schemaContent],
      note: 'multiple files',
    });
    testSchemaDir({
      path: './tests/test-assets/3',
      expected: [schemaContent, schemaContent, schemaContent],
      note: 'recursive',
    });
    testSchemaDir({
      path: './tests/test-assets/4',
      expected: [schemaContent],
      note: 'custom extension',
      extensions: ['schema'],
    });
    testSchemaDir({
      path: './tests/test-assets/5',
      expected: [schemaContent, schemaContent],
      note: 'custom extensions',
      extensions: ['schema', 'myschema'],
    });
    testSchemaDir({
      path: './tests/test-assets/10',
      expected: [schemaContent, schemaContent, schemaContent],
      note: 'code files with gql tag',
      extensions: ['js'],
    });
    testSchemaDir({
      path: './tests/test-assets/10',
      expected: [schemaContent, schemaContent, schemaContent],
      note: 'code files with gql tag',
      extensions: ['js'],
    });
    testSchemaDir({
      path: './tests/test-assets/12',
      expected: [schemaContent],
      note: 'should ignore index on demand',
      extensions: ['graphql'],
      ignoreIndex: true,
    });
    testSchemaDir({
      path: './tests/test-assets/12',
      expected: [schemaContent, `type IndexType { f: Int }`],
      note: 'should include index by default',
      extensions: ['graphql'],
    });
  });

  describe('resolvers', () => {
    testResolversDir({
      path: './tests/test-assets/6',
      expected: [{ MyType: { f: 1 } }],
      note: 'one file',
    });
    testResolversDir({
      path: './tests/test-assets/7',
      expected: [{ MyType: { f: 1 } }, { MyType: { f: 2 } }],
      note: 'multiple files',
    });
    testResolversDir({
      path: './tests/test-assets/8',
      expected: [{ MyType: { f: 1 } }],
      note: 'default export',
    });
    testResolversDir({
      path: './tests/test-assets/9',
      expected: [{ MyType: { f: 1 } }, { MyType: { f: 2 } }],
      note: 'named exports',
    });
    testResolversDir({
      path: './tests/test-assets/11',
      expected: new Array(2).fill(''),
      note: 'ignored extensions',
      extensions: null,
      compareValue: false,
    });
    testResolversDir({
      path: './tests/test-assets/12',
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
      path: './tests/test-assets/12',
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
