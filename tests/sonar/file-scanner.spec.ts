import {loadResolversFiles, loadSchemaFiles} from '../../src';

function testSchemaDir(path: string, expectedResult: any, note: string, extensions?: string[] | null) {
  it(`should return the correct schema results for path: ${path} (${note})`, () => {
    const result = loadSchemaFiles(path, extensions ? { extensions } : {});

    expect(result.length).toBe(expectedResult.length);
    expect(result.map(stripWhitespaces)).toEqual(expectedResult.map(stripWhitespaces));
  });
}

function testResolversDir(path: string, expectedResult: any, note: string, extensions: string[] | null = null, compareValue = true) {
  it(`should return the correct resolvers results for path: ${path} (${note})`, () => {
    const result = loadResolversFiles(path, extensions ? { extensions } : {});

    expect(result.length).toBe(expectedResult.length);

    if (compareValue) {
      expect(result).toEqual(expectedResult);
    }
  });
}

function stripWhitespaces(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

describe('file scanner', function () {
  describe('schema', () => {
    const schemaContent = `type MyType { f: String }`;
    testSchemaDir('./tests/sonar/test-assets/1', [schemaContent], 'one file');
    testSchemaDir('./tests/sonar/test-assets/2', [schemaContent, schemaContent, schemaContent], 'multiple files');
    testSchemaDir('./tests/sonar/test-assets/3', [schemaContent, schemaContent, schemaContent], 'recursive');
    testSchemaDir('./tests/sonar/test-assets/4', [schemaContent], 'custom extension', ['schema']);
    testSchemaDir('./tests/sonar/test-assets/5', [schemaContent, schemaContent], 'custom extensions', ['schema', 'myschema']);
    testSchemaDir('./tests/sonar/test-assets/10', [schemaContent, schemaContent, schemaContent], 'code files with gql tag', ['js']);
  });

  describe('resolvers', () => {
    testResolversDir('./tests/sonar/test-assets/6', [{ MyType: { f: 1 }}], 'one file');
    testResolversDir('./tests/sonar/test-assets/7', [{ MyType: { f: 1 }}, { MyType: { f: 2 }}], 'multiple files');
    testResolversDir('./tests/sonar/test-assets/8', [{ MyType: { f: 1 }}], 'default export');
    testResolversDir('./tests/sonar/test-assets/9', [{ MyType: { f: 1 }}, { MyType: { f: 2 }}], 'named exports');
    testResolversDir('./tests/sonar/test-assets/11', (new Array(2)).fill(''), 'ignored extensions', null, false);
  });
});
