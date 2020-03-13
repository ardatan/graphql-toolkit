import { Kind, isSchema } from 'graphql';
import {
  SchemaPointerSingle,
  DocumentPointerSingle,
  debugLog,
  SingleFileOptions,
  Source,
  UniversalLoader,
  asArray,
  isValidPath,
  parseGraphQLSDL,
} from '@graphql-toolkit/common';
import {
  GraphQLTagPluckOptions,
  gqlPluckFromCodeString,
  gqlPluckFromCodeStringSync,
} from '@graphql-toolkit/graphql-tag-pluck';
import { tryToLoadFromExport, tryToLoadFromExportSync } from './load-from-module';

export type CodeFileLoaderOptions = {
  require?: string | string[];
  pluckConfig?: GraphQLTagPluckOptions;
  fs?: typeof import('fs');
  path?: typeof import('path');
} & SingleFileOptions;

const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.vue'];

export class CodeFileLoader implements UniversalLoader<CodeFileLoaderOptions> {
  loaderId(): string {
    return 'code-file';
  }

  async canLoad(
    pointer: SchemaPointerSingle | DocumentPointerSingle,
    options: CodeFileLoaderOptions
  ): Promise<boolean> {
    return this.canLoadSync(pointer, options);
  }

  canLoadSync(pointer: SchemaPointerSingle | DocumentPointerSingle, options: CodeFileLoaderOptions): boolean {
    if (isValidPath(pointer) && options.path && options.fs) {
      const { resolve, isAbsolute } = options.path;

      if (FILE_EXTENSIONS.find(extension => pointer.endsWith(extension))) {
        const normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || process.cwd(), pointer);
        const { existsSync } = options.fs;

        if (existsSync(normalizedFilePath)) {
          return true;
        }
      }
    }

    return false;
  }

  async load(pointer: SchemaPointerSingle | DocumentPointerSingle, options: CodeFileLoaderOptions): Promise<Source> {
    const normalizedFilePath = ensureAbsolutePath(pointer, options);

    try {
      const content: string = getContent(normalizedFilePath, options);
      const sdl = await gqlPluckFromCodeString(normalizedFilePath, content, options.pluckConfig);

      if (sdl) {
        return parseSDL({ pointer, sdl, options });
      }
    } catch (e) {
      debugLog(`Failed to load schema from code file "${normalizedFilePath}": ${e.message}`);

      throw e;
    }

    if (!options.noRequire) {
      if (options && options.require) {
        await Promise.all(asArray(options.require).map(m => import(m)));
      }

      const loaded = await tryToLoadFromExport(normalizedFilePath);
      const source = resolveSource(pointer, loaded);

      if (source) {
        return source;
      }
    }

    return null;
  }

  loadSync(pointer: SchemaPointerSingle | DocumentPointerSingle, options: CodeFileLoaderOptions): Source {
    const normalizedFilePath = ensureAbsolutePath(pointer, options);

    try {
      const content: string = getContent(normalizedFilePath, options);
      const sdl = gqlPluckFromCodeStringSync(normalizedFilePath, content, options.pluckConfig);

      if (sdl) {
        return parseSDL({ pointer, sdl, options });
      }
    } catch (e) {
      debugLog(`Failed to load schema from code file "${normalizedFilePath}": ${e.message}`);

      throw e;
    }

    if (!options.noRequire) {
      if (options && options.require) {
        asArray(options.require).forEach(m => require(m));
      }

      const loaded = tryToLoadFromExportSync(normalizedFilePath);
      const source = resolveSource(pointer, loaded);

      if (source) {
        return source;
      }
    }

    return null;
  }
}

function parseSDL({ pointer, sdl, options }: { pointer: string; sdl: string; options: CodeFileLoaderOptions }) {
  return parseGraphQLSDL(pointer, sdl, options);
}

function resolveSource(pointer: string, value: any): Source | null {
  if (isSchema(value)) {
    return {
      location: pointer,
      schema: value,
    };
  } else if (value && value.kind === Kind.DOCUMENT) {
    return {
      location: pointer,
      document: value,
    };
  }

  return null;
}

function ensureAbsolutePath(
  pointer: SchemaPointerSingle | DocumentPointerSingle,
  options: CodeFileLoaderOptions
): string {
  const { resolve, isAbsolute } = options.path;

  return isAbsolute(pointer) ? pointer : resolve(options.cwd || process.cwd(), pointer);
}

function getContent(filepath: string, options: CodeFileLoaderOptions): string {
  return options.fs.readFileSync(filepath, { encoding: 'utf-8' });
}
