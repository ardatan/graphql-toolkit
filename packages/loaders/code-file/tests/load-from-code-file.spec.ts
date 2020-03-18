import * as path from 'path';
import * as fs from 'fs';
import { CodeFileLoader } from '../src';
import { parse } from 'graphql';

describe('loadFromCodeFile', () => {
  const loader = new CodeFileLoader();

  it('Should throw an error when a document is loaded using AST and the document is not valid', async () => {
    try {
      const loaded = await loader.load('./tests/test-files/invalid-anon-doc.js', {
      noRequire: true,
      fs,
      path,
    });
      const doc = parse(loaded.rawSDL);

      expect(doc).toBeFalsy();
    } catch (e) {
      expect(e.message).toContain('Syntax Error: Unexpected Name "InvalidGetUser"');
    }
  });

  it('should load a vaild file', async () => {
    const loaded = await loader.load('./tests/test-files/valid-doc.js', {
      noRequire: true,
      fs,
      path,
    });
    const doc = parse(loaded.rawSDL);

    expect(doc.kind).toEqual('Document');
  });

  it('should consider options.cwd', async () => {
    const loaded = await loader.load('valid-doc.js', {
      path,
      fs,
      cwd: path.resolve(__dirname, 'test-files'),
      noRequire: true,
    });
    const doc = parse(loaded.rawSDL);

    expect(doc.kind).toEqual('Document');
  });

  it('should load a TypeScript file using decorator', async () => {
    const loaded = await loader.load('./tests/test-files/with-decorator-doc.ts', {
      noRequire: true,
      fs,
      path,
    });
    const doc = parse(loaded.rawSDL);

    expect(doc.kind).toEqual('Document');
  });
});

describe('loadFromCodeFileSync', () => {
  const loader = new CodeFileLoader();

  it('Should throw an error when a document is loaded using AST and the document is not valid', () => {
    expect(() => {
      const loaded = loader.loadSync('./tests/test-files/invalid-anon-doc.js', {
        noRequire: true,
        fs,
        path,
      });
      parse(loaded.rawSDL);
    }).toThrowError('Syntax Error: Unexpected Name "InvalidGetUser"')
  });

  it('should load a vaild file', () => {
    const loaded = loader.loadSync('./tests/test-files/valid-doc.js', {
      noRequire: true,
      fs,
      path,
    });
    const doc = parse(loaded.rawSDL);

    expect(doc.kind).toEqual('Document');
  });

  it('should consider options.cwd', () => {
    const loaded = loader.loadSync('valid-doc.js', {
      path,
      fs,
      cwd: path.resolve(__dirname, 'test-files'),
      noRequire: true,
    });
    const doc = parse(loaded.rawSDL);

    expect(doc.kind).toEqual('Document');
  });
});
