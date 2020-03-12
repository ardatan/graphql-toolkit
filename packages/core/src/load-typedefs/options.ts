import { resolveBuiltinModule } from '@graphql-toolkit/common';
import { LoadTypedefsOptions } from './../load-typedefs';

function applyDefaultOptions<T>(options: LoadTypedefsOptions<Partial<T>>) {
  options.cache = options.cache || {};
  options.cwd = options.cwd || process.cwd();
  options.sort = 'sort' in options ? options.sort : true;
  options.processedFiles = options.processedFiles || new Map();
}

export async function prepareOptions<T>(options: LoadTypedefsOptions<Partial<T>>) {
  applyDefaultOptions(options);

  options.fs = await resolveBuiltinModule('fs', options.fs);
  options.path = await resolveBuiltinModule('path', options.path);
  options.os = await resolveBuiltinModule('os', options.os);

  return options;
}
