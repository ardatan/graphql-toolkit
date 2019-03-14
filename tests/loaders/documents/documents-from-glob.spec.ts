import { join } from 'path';
import { separateOperations } from 'graphql';
import { DocumentsFromGlob } from '../../../src/loaders/documents/documents-from-glob';

describe('documentsFromGlob', () => {
  it('Should load one GraphQL document from glob expression', async () => {
    const glob = join(__dirname, './test-files/', '*.query.graphql');
    const handler = new DocumentsFromGlob();
    const canHandle = await handler.canHandle(glob);
    expect(canHandle).toBeTruthy();
    const result = await handler.handle(glob);
    expect(result.length).toBe(1);
    expect(result[0].content).toBeDefined();
  });

  it('Should load multiple GraphQL document from glob expression', async () => {
    const glob = join(__dirname, './test-files/', '*.graphql');
    const handler = new DocumentsFromGlob();
    const canHandle = await handler.canHandle(glob);
    expect(canHandle).toBeTruthy();
    const result = await handler.handle(glob);
    expect(result.length).toBe(2);
    expect(result[0].content).toBeDefined();
    expect(result[1].content).toBeDefined();
  });

  it('Should load two GraphQL documents both for gatsby and graphql-tag by default', async () => {
    const glob = join(__dirname, './test-files/', 'tags.js');
    const handler = new DocumentsFromGlob();
    const canHandle = await handler.canHandle(glob);

    // should handle
    expect(canHandle).toEqual(true);

    // should get documents
    const result = await handler.handle(glob);
    const operations = separateOperations(result[0].content);

    expect(Object.keys(operations)).toHaveLength(2);
  });

  it('Should load GraphQL documents that match custom settings', async () => {
    const glob = join(__dirname, './test-files/', 'tags.js');
    const handler = new DocumentsFromGlob();
    const canHandle = await handler.canHandle(glob);

    // should handle
    expect(canHandle).toEqual(true);

    // should get documents
    const result = await handler.handle(glob, {
      tagPluck: {
        modules: [
          {
            name: 'parse-graphql',
            identifier: 'parse',
          },
        ],
      },
    });

    const operations = separateOperations(result[0].content);

    expect(Object.keys(operations)).toHaveLength(1);
  });

  it('Should ignore empty files', async () => {
    const glob = join(__dirname, './test-files/', '*.empty.graphql');
    const handler = new DocumentsFromGlob();
    const canHandle = await handler.canHandle(glob);
    expect(canHandle).toBeTruthy();
    const result = await handler.handle(glob);
    expect(result.length).toBe(0);
  });

  it('Should ignore schema definitions', async () => {
    const glob = join(__dirname, './test-files/', '*.graphql');
    const handler = new DocumentsFromGlob();
    const canHandle = await handler.canHandle(glob);
    expect(canHandle).toBeTruthy();
    const result = await handler.handle(glob);
    expect(result.length).toBe(2);
  });
});
