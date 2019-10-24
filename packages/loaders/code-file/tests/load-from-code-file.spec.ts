import { resolve } from 'path';
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

  it('should load a vaild file', async () => {
    const doc = await loader.load('./tests/test-files/valid-doc.js', { noRequire: true });

    expect(doc.document.kind).toEqual('Document');
  });

  it('should consider options.cwd', async () => {
    const doc = await loader.load('valid-doc.js', { noRequire: true, cwd: resolve(__dirname, 'test-files') });
    expect(doc.document.kind).toEqual('Document');
  });
});
