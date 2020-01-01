import { loadDocuments } from '@graphql-toolkit/core';
import { join } from 'path';
import { separateOperations } from 'graphql';
import { GraphQLFileLoader } from '@graphql-toolkit/graphql-file-loader';
import { CodeFileLoader } from '@graphql-toolkit/code-file-loader';

describe('documentsFromGlob', () => {
  it('Should load one GraphQL document from glob expression', async () => {
    const glob = join(__dirname, './test-files/', '*.query.graphql');
    const result = await loadDocuments(glob, {
      loaders: [new GraphQLFileLoader()]
    });
    expect(result.length).toBe(1);
    expect(result[0].document).toBeDefined();
  });

  it('Should load multiple GraphQL document from glob expression', async () => {
    const glob = join(__dirname, './test-files/', '*.graphql');
    const result = await loadDocuments(glob, {
      loaders: [new GraphQLFileLoader()]
    });
    expect(result.length).toBe(2);
    expect(result[0].document).toBeDefined();
    expect(result[1].document).toBeDefined();
  });

  it('Should load two GraphQL documents both for gatsby and graphql-tag by default', async () => {
    const glob = join(__dirname, './test-files/', 'tags.js');
    const result = await loadDocuments(glob, {
      loaders: [new CodeFileLoader()]
    });
    const operations = separateOperations(result[0].document);

    expect(Object.keys(operations)).toHaveLength(2);
  });

  it('Should load GraphQL documents that match custom settings', async () => {
    const glob = join(__dirname, './test-files/', 'tags.js');

    const result = await loadDocuments(glob, {
      pluckConfig: {
        modules: [
          {
            name: 'parse-graphql',
            identifier: 'parse',
          },
        ],
        globalGqlIdentifierName: 'somethingElse',
      },
      loaders: [
        new CodeFileLoader()
      ]
    });

    const operations = separateOperations(result[0].document);

    expect(Object.keys(operations)).toHaveLength(1);
  });

  it('Should throw on empty files and empty result', async () => {
    try {
      const glob = join(__dirname, './test-files/', '*.empty.graphql');
      const result = await loadDocuments(glob, {
        loaders: [new GraphQLFileLoader()]
      });
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('Should throw on invalid files', async () => {
    try {
      const glob = join(__dirname, './test-files/', 'invalid*.*.graphql');
      const result = await loadDocuments(glob, {
        loaders: [new GraphQLFileLoader()]
      });
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e).toBeDefined();
    }
  })

  it('Should ignore schema definitions', async () => {
    const glob = join(__dirname, './test-files/', '*.graphql');
    const result = await loadDocuments(glob, {
      loaders: [new GraphQLFileLoader()]
    });
    expect(result.length).toBe(2);
  });

  it('Should ignore files that is added to ignore glob (using options.ignore)', async () => {
    const glob = join(__dirname, './test-files/', '*.graphql');
    const ignoreGlob = join(__dirname, './test-files/', '*.query.graphql');
    const result = await loadDocuments([glob], { 
      ignore: ignoreGlob, 
      loaders: [new GraphQLFileLoader()] 
    });
    expect(result.length).toBe(1);
  });

  it('Should ignore files that is added to ignore glob (using negative glob)', async () => {
    const glob = join(__dirname, './test-files/', '*.graphql');
    const ignoreGlob = `!(${join(__dirname, './test-files/', '*.query.graphql')})`;
    const result = await loadDocuments([glob, ignoreGlob], {
      loaders: [new GraphQLFileLoader()] 
    });
    expect(result.length).toBe(1);
  });

  it('should respect brackets in file path', async () => {
    const glob = join(__dirname, './test-with-brackets/', '**/*.ts');
    const result = await loadDocuments(glob, {
      loaders: [new CodeFileLoader()],
    })
    expect(result.length).toBe(1);
  });
});
