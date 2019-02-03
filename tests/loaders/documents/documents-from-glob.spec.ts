import { join } from 'path';
import { DocumentsFromGlob } from '../../../src/loaders/documents/documents-from-glob';

describe('documentsFromGlob', () => {
  it('Should load one GraphQL document from glob expression', async () => {
    const glob = join(__dirname, './test-files/', '*.query.graphql');
    const handler = new DocumentsFromGlob();
    const canHandle = handler.canHandle(glob);
    expect(canHandle).toBeTruthy();
    const result = await handler.handle(glob);
    expect(result.length).toBe(1);
    expect(result[0].content).toBeDefined();
  });

  it('Should load multiple GraphQL document from glob expression', async () => {
    const glob = join(__dirname, './test-files/', '*.graphql');
    const handler = new DocumentsFromGlob();
    const canHandle = handler.canHandle(glob);
    expect(canHandle).toBeTruthy();
    const result = await handler.handle(glob);
    expect(result.length).toBe(2);
    expect(result[0].content).toBeDefined();
    expect(result[1].content).toBeDefined();
  });

  it('Should ignore empty files', async () => {
    const glob = join(__dirname, './test-files/', '*.empty.graphql');
    const handler = new DocumentsFromGlob();
    const canHandle = handler.canHandle(glob);
    expect(canHandle).toBeTruthy();
    const result = await handler.handle(glob);
    expect(result.length).toBe(0);
  });

  it('Should ignore schema definitions', async () => {
    const glob = join(__dirname, './test-files/', '*.graphql');
    const handler = new DocumentsFromGlob();
    const canHandle = handler.canHandle(glob);
    expect(canHandle).toBeTruthy();
    const result = await handler.handle(glob);
    expect(result.length).toBe(2);
  });
});
