import { DocumentNode, GraphQLSchema, parse } from 'graphql';
import { Source, asArray, isDocumentString, debugLog, fixWindowsPath, Loader, printSchemaWithDirectives } from '@graphql-toolkit/common';
import { filterKind } from './filter-document-kind';
import { documentFromString } from './document-from-string';
import { join } from 'path';
import isGlob from 'is-glob';
import globby from 'globby';

export type SingleFileOptions<ExtraConfig = { [key: string]: any }> = ExtraConfig & {
  noRequire?: boolean;
  skipGraphQLImport?: boolean;
};

export type LoadTypedefsOptions<ExtraConfig = { [key: string]: any }> = SingleFileOptions<ExtraConfig> & {
  ignore?: string | string[];
};

export type UnnormalizedTypeDefPointer = { [key: string]: any } | string;

export function normalizePointers(unnormalizedPointerOrPointers: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[]) {
  return asArray(unnormalizedPointerOrPointers).reduce<{ [key: string]: any }>((normalizedPointers, unnormalizedPointer) => {
    if (typeof unnormalizedPointer === 'string') {
      normalizedPointers[unnormalizedPointer] = {};
    } else if (typeof unnormalizedPointer === 'object') {
      Object.assign(normalizedPointers, unnormalizedPointer);
    } else {
      throw new Error(`Invalid pointer ${unnormalizedPointer}`);
    }
    return normalizedPointers;
  }, {});
}

async function getCustomLoaderByPath(path: string, cwd: string): Promise<any> {
  try {
    const requiredModule = await import(join(cwd, path));

    if (requiredModule) {
      if (requiredModule.default && typeof requiredModule.default === 'function') {
        return requiredModule.default;
      } else if (typeof requiredModule === 'function') {
        return requiredModule;
      }
    }

    return null;
  } catch (e) {
    return null;
  }
}

export async function loadTypedefsUsingLoaders<AdditionalConfig = {}>(
  loaders: Loader[],
  pointerOrPointers: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[],
  options: LoadTypedefsOptions<Partial<AdditionalConfig>> = {},
  filterKinds: string[] = [],
  cwd = process.cwd()
): Promise<Source[]> {
  const normalizedPointerOptionsMap = normalizePointers(pointerOrPointers);
  const loadPromises$: Promise<any>[] = [];
  const found: Source[] = [];
  const foundGlobs: string[] = [];
  const globOptions: any = {};

  for (const pointer in normalizedPointerOptionsMap) {
    const pointerOptions = normalizedPointerOptionsMap[pointer];
    if (isDocumentString(pointer)) {
      loadPromises$.push(
        Promise.resolve().then(async () => {
          const docs = documentFromString(pointer, filterKinds);
          found.push(...docs);
        })
      );
    } else if (isGlob(pointer)) {
      foundGlobs.push(pointer);
      Object.assign(globOptions, pointerOptions);
    } else if (pointerOptions.loader) {
      loadPromises$.push(
        Promise.resolve().then(async () => {
          let loader;
          if (typeof pointerOptions.loader === 'string') {
            loader = await getCustomLoaderByPath(pointerOptions.loader, cwd);
          } else if (typeof pointerOptions.loader === 'function') {
            loader = pointerOptions.loader;
          }
          if (typeof loader !== 'function') {
            throw new Error(`Failed to load custom loader: ${pointerOptions.loader}`);
          }
          let content = await loader(pointer, { ...options, ...pointerOptions }, normalizedPointerOptionsMap);
          if (content && content instanceof GraphQLSchema) {
            content = parse(printSchemaWithDirectives(content));
          }
          content = filterKind(content, filterKinds);
          if (content && content.definitions && content.definitions.length > 0) {
            found.push({
              location: pointer,
              document: content,
            });
          }
        })
      );
    } else {
      loadPromises$.push(
        Promise.resolve().then(async () => {
          let content = await loadSingleFile(loaders, pointer, {
            ...options,
            ...pointerOptions,
          });
          content = filterKind(content, filterKinds);

          if (content && content.definitions && content.definitions.length > 0) {
            found.push({
              location: pointer,
              document: content,
            });
          }
        })
      );
    }
  }

  if (foundGlobs.length > 0) {
    if (options.ignore) {
      const ignoreList = asArray(options.ignore)
        .map(g => `!(${g})`)
        .map(p => fixWindowsPath(p));

      if (ignoreList.length > 0) {
        foundGlobs.push(...ignoreList);
      }
    }

    loadPromises$.push(
      Promise.resolve().then(async () => {
        const paths = await globby(foundGlobs, { cwd, absolute: true });
        await Promise.all(
          paths.map(async path => {
            if (!path.endsWith('.d.ts') && !path.endsWith('.spec.ts') && !path.endsWith('.spec.js') && !path.endsWith('.test.ts') && !path.endsWith('.test.js')) {
              let content;
              if (globOptions.loader) {
                let loader;
                if (typeof globOptions.loader === 'string') {
                  loader = await getCustomLoaderByPath(globOptions.loader, cwd);
                } else if (typeof globOptions.loader === 'function') {
                  loader = globOptions.loader;
                }
                if (typeof loader !== 'function') {
                  throw new Error(`Failed to load custom loader: ${globOptions.loader}`);
                }
                content = await loader(path, { ...options, ...globOptions }, normalizedPointerOptionsMap);
                if (content && content instanceof GraphQLSchema) {
                  content = parse(printSchemaWithDirectives(content));
                }
              } else {
                content = await loadSingleFile(loaders, path, { ...options, ...globOptions });
              }
              content = filterKind(content, filterKinds);

              if (content && content.definitions && content.definitions.length > 0) {
                found.push({
                  location: path,
                  document: content,
                });
              }
            }
          })
        );
      })
    );
  }

  await Promise.all(loadPromises$);

  const pointerList = Object.keys(normalizedPointerOptionsMap);
  if (pointerList.length > 0 && found.length === 0) {
    throw new Error(`Unable to find any GraphQL type definitions for the following pointers: ${pointerList.join(', ')}`);
  }

  return found.sort((left, right) => left.location.localeCompare(right.location));
}

export async function loadSingleFile(loaders: Loader[], pointer: string, options: SingleFileOptions = {}): Promise<DocumentNode> {
  try {
    for (const loader of loaders) {
      const canLoad = await loader.canLoad(pointer, options);

      if (canLoad) {
        const found = await loader.load(pointer, options);

        if (found) {
          return found.document;
        }
      }
    }
  } catch (e) {
    debugLog(`Failed to find any GraphQL type definitions in: ${pointer} - ${e.message}`);

    throw e;
  }

  return null;
}
