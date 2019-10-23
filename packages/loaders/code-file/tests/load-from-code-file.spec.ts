import { CodeFileLoader } from '../src';

describe('loadFromCodeFile', () => {
  const loader = new CodeFileLoader();

  it('Should throw an error when a document is loaded using AST and the document is not valid', async () => {
    try {
      await loader.load('./tests/test-files/invalid-anon-doc.js', { noRequire: true });
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e.message).toBe('Syntax Error: Unexpected Name "InvalidGetUser"');
    }
  });
});
