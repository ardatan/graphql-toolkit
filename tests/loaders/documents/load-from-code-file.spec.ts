import { loadFromCodeFile } from '../../../src/loaders/load-from-code-file';

describe('loadFromCodeFile', () => {
  it('Should throw an error when a document is loaded using AST and the document is not valid', async () => {
    try {
      const result = await loadFromCodeFile('./tests/loaders/documents/test-files/invalid-anon-doc.js', { noRequire: true });
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e.message).toBe('Syntax Error: Unexpected Name \"InvalidGetUser\"');
    }
  });
});
