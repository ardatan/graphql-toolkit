import { parse, Kind, Source as GraphQLSource, isSchema, DefinitionNode } from 'graphql';
import {
  Source,
  asArray,
  isDocumentString,
  debugLog,
  printSchemaWithDirectives,
  parseGraphQLSDL,
  fixSchemaAst,
  SingleFileOptions,
  Loader,
  resolveBuiltinModule,
  compareStrings,
} from '@graphql-toolkit/common';
import isGlob from 'is-glob';
import pLimit from 'p-limit';
import { filterKind } from './filter-document-kind';
import { RawModule, processImportSyntax, isEmptySDL } from './import-parser';
import { printWithComments, resetComments } from '@graphql-toolkit/schema-merging';

const CONCURRENCY_LIMIT = 100;

export type LoadTypedefsOptions<ExtraConfig = { [key: string]: any }> = SingleFileOptions &
  ExtraConfig & {
    processedFiles?: Map<string, RawModule[]>;
    cache?: { [key: string]: Source };
    loaders: Loader[];
    filterKinds?: string[];
    ignore?: string | string[];
    sort?: boolean;
    skipGraphQLImport?: boolean;
    forceGraphQLImport?: boolean;
    fs?: typeof import('fs');
    path?: typeof import('path');
    os?: typeof import('os');
  };

export type UnnormalizedTypeDefPointer = { [key: string]: any } | string;

export function normalizePointers(
  unnormalizedPointerOrPointers: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[]
) {
  return asArray(unnormalizedPointerOrPointers).reduce<{ [key: string]: any }>(
    (normalizedPointers, unnormalizedPointer) => {
      if (typeof unnormalizedPointer === 'string') {
        normalizedPointers[unnormalizedPointer] = {};
      } else if (typeof unnormalizedPointer === 'object') {
        Object.assign(normalizedPointers, unnormalizedPointer);
      } else {
        throw new Error(`Invalid pointer ${unnormalizedPointer}`);
      }

      return normalizedPointers;
    },
    {}
  );
}

async function getCustomLoaderByPath(path: string, cwd: string): Promise<any> {
  try {
    const { default: importFrom } = await import('import-from');
    const requiredModule: any = importFrom(cwd, path);

    if (requiredModule) {
      if (requiredModule.default && typeof requiredModule.default === 'function') {
        return requiredModule.default;
      }

      if (typeof requiredModule === 'function') {
        return requiredModule;
      }
    }
  } catch (e) {}

  return null;
}

// Convert to 32bit integer
function stringToHash(str: string) {
  let hash = 0;

  // tslint:disable-next-line: triple-equals
  if (str.length == 0) {
    return hash;
  }

  let char;
  for (let i = 0; i < str.length; i++) {
    char = str.charCodeAt(i);
    // tslint:disable-next-line: no-bitwise
    hash = (hash << 5) - hash + char;
    // tslint:disable-next-line: no-bitwise
    hash = hash & hash;
  }

  return hash;
}

function Queue<T>(options?: { concurrency?: number }) {
  const queue: Array<() => Promise<T>> = [];
  const limit = options?.concurrency ? pLimit(options.concurrency) : async (fn: () => Promise<T>) => fn();

  return {
    add(fn: () => Promise<T>) {
      queue.push(() => limit(fn));
    },
    runAll() {
      return Promise.all(queue.map(fn => fn()));
    },
  };
}

export async function loadTypedefs<AdditionalConfig = {}>(
  pointerOrPointers: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[],
  options: LoadTypedefsOptions<Partial<AdditionalConfig>>
): Promise<Source[]> {
  const normalizedPointerOptionsMap = normalizePointers(pointerOrPointers);
  const found: Source[] = [];
  const foundGlobs: string[] = [];
  const globOptions: any = {};
  const loadQueue = Queue<void>({
    concurrency: CONCURRENCY_LIMIT,
  });

  options.cache = options.cache || {};
  options.cwd = options.cwd || process.cwd();
  options.sort = 'sort' in options ? options.sort : true;
  options.processedFiles = options.processedFiles || new Map();
  options.fs = await resolveBuiltinModule('fs', options.fs);
  options.path = await resolveBuiltinModule('path', options.path);
  options.os = await resolveBuiltinModule('os', options.os);

  const unixify = await import('unixify').then(m => m.default || m);

  function addSource({ pointer, source, noCache }: { pointer: string; source: Source; noCache?: boolean }): void {
    found.push(source);

    if (!noCache) {
      options.cache[pointer] = source;
    }
  }

  for (const pointer in normalizedPointerOptionsMap) {
    const pointerOptions = normalizedPointerOptionsMap[pointer];
    if (isDocumentString(pointer)) {
      // ::documentString
      loadQueue.add(async () => {
        const source = parseGraphQLSDL(`${stringToHash(pointer)}.graphql`, pointer, {
          ...options,
          ...pointerOptions,
        });

        addSource({
          source,
          pointer,
        });
      });
    } else if (isGlob(unixify(pointer))) {
      // :: globals
      foundGlobs.push(unixify(pointer));
      Object.assign(globOptions, pointerOptions);
    } else if (pointerOptions.loader) {
      loadQueue.add(async () => {
        let loader;
        if (typeof pointerOptions.loader === 'string') {
          loader = await getCustomLoaderByPath(pointerOptions.loader, options.cwd);
        } else if (typeof pointerOptions.loader === 'function') {
          loader = pointerOptions.loader;
        }
        if (typeof loader !== 'function') {
          throw new Error(`Failed to load custom loader: ${pointerOptions.loader}`);
        }
        const customLoaderResult = await loader(
          pointer,
          { ...options, ...pointerOptions },
          normalizedPointerOptionsMap
        );
        if (isSchema(customLoaderResult && customLoaderResult)) {
          addSource({
            source: {
              location: pointer,
              schema: customLoaderResult,
            },
            pointer,
            noCache: true,
          });
        } else if (customLoaderResult && customLoaderResult.kind && customLoaderResult.kind === Kind.DOCUMENT) {
          addSource({
            source: {
              document: customLoaderResult,
              location: pointer,
            },
            pointer,
          });
        } else if (customLoaderResult && customLoaderResult.document) {
          addSource({
            source: {
              location: pointer,
              ...customLoaderResult,
            },
            pointer,
          });
        }
      });
    } else {
      loadQueue.add(async () => {
        const source = await loadSingleFile(pointer, {
          ...options,
          ...pointerOptions,
        });

        if (source) {
          addSource({ source, pointer });
        }
      });
    }
  }

  if (foundGlobs.length > 0) {
    if (options.ignore) {
      const ignoreList = asArray(options.ignore)
        .map(g => `!(${g})`)
        .map<string>(unixify);

      if (ignoreList.length > 0) {
        foundGlobs.push(...ignoreList);
      }
    }

    loadQueue.add(async () => {
      const { default: globby } = await import('globby');
      const limit = pLimit(CONCURRENCY_LIMIT);
      const paths = await globby(foundGlobs, { absolute: true, ...options, ignore: [] });
      await Promise.all(
        paths.map(path =>
          limit(async () => {
            if (globOptions.loader) {
              const loader = await useCustomLoader(globOptions.loader, options.cwd);

              const customLoaderResult = await loader(
                path,
                { ...options, ...globOptions },
                normalizedPointerOptionsMap
              );

              if (isSchema(customLoaderResult)) {
                addSource({
                  source: {
                    schema: customLoaderResult,
                    document: parse(printSchemaWithDirectives(customLoaderResult)),
                    location: path,
                  },
                  pointer: path,
                });
              } else if (customLoaderResult && customLoaderResult.kind && customLoaderResult.kind === Kind.DOCUMENT) {
                addSource({
                  source: {
                    document: customLoaderResult,
                    location: path,
                  },
                  pointer: path,
                });
              } else if (customLoaderResult && customLoaderResult.document) {
                addSource({
                  source: {
                    location: path,
                    ...customLoaderResult,
                  },
                  pointer: path,
                });
              }
            } else {
              const loaderResult = await loadSingleFile(path, { ...options, ...globOptions });

              addSource({
                source: loaderResult,
                pointer: path,
              });
            }
          })
        )
      );
    });
  }

  await loadQueue.runAll();

  const foundValid: Source[] = [];
  const definitionsCacheForImport: DefinitionNode[][] = [];

  // If we have few k of files it may be an issue
  const limit = pLimit(CONCURRENCY_LIMIT);

  await Promise.all(
    found.map(partialSource =>
      limit(async () => {
        if (partialSource) {
          const specificOptions = {
            ...options,
            ...(partialSource.location in normalizedPointerOptionsMap
              ? globOptions
              : normalizedPointerOptionsMap[partialSource.location]),
          };
          const resultSource: Source = { ...partialSource };

          if (resultSource.schema) {
            resultSource.schema = fixSchemaAst(resultSource.schema, specificOptions);
            resultSource.rawSDL = printSchemaWithDirectives(resultSource.schema, specificOptions);
          }

          if (resultSource.rawSDL) {
            resultSource.document = isEmptySDL(resultSource.rawSDL)
              ? {
                  kind: Kind.DOCUMENT,
                  definitions: [],
                }
              : parse(new GraphQLSource(resultSource.rawSDL, resultSource.location), specificOptions);
          }

          if (resultSource.document) {
            if (options.filterKinds) {
              resultSource.document = filterKind(resultSource.document, specificOptions.filterKinds);
            }

            if (!resultSource.rawSDL) {
              resultSource.rawSDL = printWithComments(resultSource.document);
              resetComments();
            }

            if (
              specificOptions.forceGraphQLImport ||
              (!specificOptions.skipGraphQLImport && /^\#.*import /i.test(resultSource.rawSDL.trimLeft()))
            ) {
              resultSource.document = {
                kind: Kind.DOCUMENT,
                definitions: await processImportSyntax(resultSource, specificOptions, definitionsCacheForImport),
              };
            }

            if (resultSource.document.definitions && resultSource.document.definitions.length > 0) {
              foundValid.push(resultSource);
            }
          }
        }
      })
    )
  );

  const pointerList = Object.keys(normalizedPointerOptionsMap);
  if (pointerList.length > 0 && foundValid.length === 0) {
    throw new Error(`
      Unable to find any GraphQL type definitions for the following pointers: 
        ${pointerList.map(
          p => `
          - ${p}
          `
        )}`);
  }

  return options.sort ? foundValid.sort((left, right) => compareStrings(left.location, right.location)) : foundValid;
}

export async function loadSingleFile(pointer: string, options: LoadTypedefsOptions): Promise<Source> {
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

async function useCustomLoader(loaderPointer: any, cwd: string) {
  let loader;

  if (typeof loaderPointer === 'string') {
    loader = await getCustomLoaderByPath(loaderPointer, cwd);
  } else if (typeof loaderPointer === 'function') {
    loader = loaderPointer;
  }

  if (typeof loader !== 'function') {
    throw new Error(`Failed to load custom loader: ${loaderPointer}`);
  }

  return loader;
}
