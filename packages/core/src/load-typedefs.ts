import { GraphQLSchema, parse, Kind, Source as GraphQLSource } from 'graphql';
import { Source, asArray, isDocumentString, debugLog, fixWindowsPath, printSchemaWithDirectives, parseGraphQLSDL, fixSchemaAst, SingleFileOptions, Loader } from '@graphql-toolkit/common';
import { join } from 'path';
import isGlob from 'is-glob';
import globby from 'globby';
import { filterKind } from './filter-document-kind';
import { RawModule, processImportSyntax, isEmptySDL } from './import-parser';
import { ValidDefinitionNode } from './import-parser/definition';
import { printWithComments } from '@graphql-toolkit/schema-merging';

export type LoadTypedefsOptions<ExtraConfig = { [key: string]: any }> = SingleFileOptions &
  ExtraConfig & {
    processedFiles?: Map<string, RawModule[]>;
    typeDefinitions?: ValidDefinitionNode[][];
    allDefinitions?: ValidDefinitionNode[][];
    cache?: { [key: string]: Source };
    loaders: Loader[];
    filterKinds?: string[];
    ignore?: string | string[];
    sort?: boolean;
    skipGraphQLImport?: boolean;
    forceGraphQLImport?: boolean;
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

// Convert to 32bit integer
function stringToHash(str: string) {
  let hash = 0;

  if (str.length == 0) return hash;

  let char;
  for (let i = 0; i < str.length; i++) {
    char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return hash;
}

export async function loadTypedefs<AdditionalConfig = {}>(pointerOrPointers: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[], options: LoadTypedefsOptions<Partial<AdditionalConfig>>): Promise<Source[]> {
  const normalizedPointerOptionsMap = normalizePointers(pointerOrPointers);
  const loadPromises$: Promise<any>[] = [];
  const found: Source[] = [];
  const foundGlobs: string[] = [];
  const globOptions: any = {};

  options.cache = options.cache || {};
  options.cwd = options.cwd || process.cwd();
  options.sort = 'sort' in options ? options.sort : true;
  options.processedFiles = options.processedFiles || new Map();
  options.allDefinitions = options.allDefinitions || [];
  options.typeDefinitions = options.typeDefinitions || [];

  for (const pointer in normalizedPointerOptionsMap) {
    const pointerOptions = normalizedPointerOptionsMap[pointer];
    if (isDocumentString(pointer)) {
      loadPromises$.push(
        Promise.resolve().then(async () => {
          const result = parseGraphQLSDL(`${stringToHash(pointer)}.graphql`, pointer, options);
          found.push(result);
          options.cache[pointer] = result;
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
            loader = await getCustomLoaderByPath(pointerOptions.loader, options.cwd);
          } else if (typeof pointerOptions.loader === 'function') {
            loader = pointerOptions.loader;
          }
          if (typeof loader !== 'function') {
            throw new Error(`Failed to load custom loader: ${pointerOptions.loader}`);
          }
          const customLoaderResult = await loader(pointer, { ...options, ...pointerOptions }, normalizedPointerOptionsMap);
          if (customLoaderResult && customLoaderResult instanceof GraphQLSchema) {
            found.push({
              location: pointer,
              schema: customLoaderResult,
            });
          } else if (customLoaderResult && customLoaderResult.kind && customLoaderResult.kind === Kind.DOCUMENT) {
            const result = {
              document: customLoaderResult,
              location: pointer,
            };
            options.cache[pointer] = result;
            found.push(result);
          } else if (customLoaderResult && customLoaderResult.document) {
            const result = {
              location: pointer,
              ...customLoaderResult,
            };
            options.cache[pointer] = result;
            found.push(result);
          }
        })
      );
    } else {
      loadPromises$.push(
        Promise.resolve().then(async () => {
          const combinedOptions = {
            ...options,
            ...pointerOptions,
          };
          const loaderResult = await loadSingleFile(pointer, combinedOptions);
          options.cache[pointer] = loaderResult;
          found.push(loaderResult);
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
        const paths = await globby(foundGlobs, { absolute: true, ...options, ignore: [] });
        await Promise.all(
          paths.map(async path => {
            if (!path.endsWith('.d.ts') && !path.endsWith('.spec.ts') && !path.endsWith('.spec.js') && !path.endsWith('.test.ts') && !path.endsWith('.test.js')) {
              if (globOptions.loader) {
                let loader;
                if (typeof globOptions.loader === 'string') {
                  loader = await getCustomLoaderByPath(globOptions.loader, options.cwd);
                } else if (typeof globOptions.loader === 'function') {
                  loader = globOptions.loader;
                }
                if (typeof loader !== 'function') {
                  throw new Error(`Failed to load custom loader: ${globOptions.loader}`);
                }
                const customLoaderResult = await loader(path, { ...options, ...globOptions }, normalizedPointerOptionsMap);
                if (customLoaderResult instanceof GraphQLSchema) {
                  const result = {
                    schema: customLoaderResult,
                    document: parse(printSchemaWithDirectives(customLoaderResult)),
                    location: path,
                  };
                  options.cache[path] = result;
                  found.push(result);
                } else if (customLoaderResult && customLoaderResult.kind && customLoaderResult.kind === Kind.DOCUMENT) {
                  const result = {
                    document: customLoaderResult,
                    location: path,
                  };
                  options.cache[path] = result;
                  found.push(result);
                } else if (customLoaderResult && customLoaderResult.document) {
                  const result = {
                    location: path,
                    ...customLoaderResult,
                  };
                  options.cache[path] = result;
                  found.push(result);
                }
              } else {
                const loaderResult = await loadSingleFile(path, { ...options, ...globOptions });
                options.cache[path] = loaderResult;
                found.push(loaderResult);
              }
            }
          })
        );
      })
    );
  }

  await Promise.all(loadPromises$);

  const foundValid: Source[] = [];

  await Promise.all(
    found.map(async partialSource => {
      if (partialSource) {
        const resultSource: Source = { ...partialSource };
        if (resultSource.schema) {
          resultSource.schema = fixSchemaAst(resultSource.schema, options);
          resultSource.rawSDL = printSchemaWithDirectives(resultSource.schema);
        }
        if (resultSource.rawSDL) {
          if (isEmptySDL(resultSource.rawSDL)) {
            resultSource.document = {
              kind: Kind.DOCUMENT,
              definitions: [],
            };
          } else {
            resultSource.document = parse(new GraphQLSource(resultSource.rawSDL, resultSource.location), options);
          }
        }
        if (resultSource.document) {
          if (options.filterKinds) {
            resultSource.document = filterKind(resultSource.document, options.filterKinds);
          }
          if (!resultSource.rawSDL) {
            resultSource.rawSDL = printWithComments(resultSource.document);
          }
          if (options.forceGraphQLImport || (!options.skipGraphQLImport && /^\#.*import /i.test(resultSource.rawSDL.trimLeft()))) {
            await processImportSyntax(resultSource, options);
          }
          if (resultSource.document.definitions && resultSource.document.definitions.length > 0) {
            foundValid.push(resultSource);
          }
        }
      }
    })
  );

  const pointerList = Object.keys(normalizedPointerOptionsMap);
  if (pointerList.length > 0 && foundValid.length === 0) {
    throw new Error(`Unable to find any GraphQL type definitions for the following pointers: ${pointerList.join(', ')}`);
  }

  return options.sort ? foundValid.sort((left, right) => left.location.localeCompare(right.location)) : foundValid;
}

export async function loadSingleFile(pointer: string, options: LoadTypedefsOptions): Promise<Source> {
  if (pointer in options.cache) {
    return options.cache[pointer];
  }
  try {
    for (const loader of options.loaders) {
      const canLoad = await loader.canLoad(pointer, options);

      if (canLoad) {
        const found = await loader.load(pointer, options);

        if (found) {
          return found;
        }
      }
    }
  } catch (e) {
    debugLog(`Failed to find any GraphQL type definitions in: ${pointer} - ${e.message}`);

    throw e;
  }

  return null;
}
