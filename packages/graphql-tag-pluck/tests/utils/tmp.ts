import { ensureFileSync, createFileSync, removeSync } from 'fs-extra';
import { join } from 'path';

export const createTmpFile = async (options: { unsafeCleanup?: boolean, template?: string}) => {
      const filename = (options.template || 'XXXXXX').replace('XXXXXX', Math.random().toString().replace('.', ''));
      const absolutePath = join(__dirname, filename);
      ensureFileSync(absolutePath);
      createFileSync(absolutePath);
      return {
        cleanupCallback: () => {
          removeSync(absolutePath);
        },
        name: absolutePath,
      };
  }
