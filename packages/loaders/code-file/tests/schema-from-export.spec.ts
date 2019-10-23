import { CodeFileLoader } from '../src';

describe('Schema From Export', () => {
  const loader = new CodeFileLoader();

  it('should load the schema correctly from module.exports', async () => {
    const result = await loader.load('./tests/test-files/loaders/module-exports.js', {});
    expect(result).toBeDefined();
  });

  it('should load the schema (with extend) correctly from module.exports', async () => {
    const result = await loader.load('./tests/test-files/loaders/with-extend.js', {});
    expect(result).toBeDefined();
  });

  it('should load the schema correctly from variable export', async () => {
    const result = await loader.load('./tests/test-files/loaders/schema-export.js', {});
    expect(result).toBeDefined();
  });

  it('should load the schema correctly from default export', async () => {
    const result = await loader.load('./tests/test-files/loaders/default-export.js', {});
    expect(result).toBeDefined();
  });

  it('should load the schema correctly from promise export', async () => {
    const result = await loader.load('./tests/test-files/loaders/promise-export.js', {});
    expect(result).toBeDefined();
  });
});
