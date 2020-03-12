import { Source, debugLog } from '@graphql-toolkit/common';
import { LoadTypedefsOptions } from '../load-typedefs';

export async function loadFile(pointer: string, options: LoadTypedefsOptions): Promise<Source> {
  if (pointer in options.cache) {
    return options.cache[pointer];
  }

  for await (const loader of options.loaders) {
    try {
      const canLoad = await loader.canLoad(pointer, options);

      if (canLoad) {
        return await loader.load(pointer, options);
      }
    } catch (error) {
      debugLog(`Failed to find any GraphQL type definitions in: ${pointer} - ${error.message}`);
      throw error;
    }
  }

  return undefined;
}
