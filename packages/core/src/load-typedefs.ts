import { GraphQLSchema, parse, DocumentNode, Source as GraphQLSource } from 'graphql';
import { Source, asArray, isDocumentString, debugLog, fixWindowsPath, Loader, printSchemaWithDirectives, fixSchemaAst } from '@graphql-toolkit/common';
import { filterKind } from './filter-document-kind';
import { join } from 'path';
import isGlob from 'is-glob';
import globby from 'globby';
import { processImportSyntax } from './import-parser';

export type SingleFileOptions<ExtraConfig = { [key: string]: any }> = ExtraConfig & {
  noRequire?: boolean;
  skipGraphQLImport?: boolean;
  forceRawSDL?: boolean;
  forceGraphQLImport?: boolean;
  mergeableTypes?: [string];
};

export type LoadTypedefsOptions<ExtraConfig = { [key: string]: any }> = SingleFileOptions<ExtraConfig> & {
  ignore?: string | string[];
  schemas?: { [key: string]: string | DocumentNode | GraphQLSchema };
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
    if (options && options.schemas && pointer in options.schemas) {
      const content = options.schemas[pointer];
      if (typeof content === 'string') {
        const rawSDL = content as string;
        let unfilteredDocument: DocumentNode;
        if (options.forceGraphQLImport || (!options.skipGraphQLImport && /^\#.*import /i.test(rawSDL.trimLeft()))) {
          unfilteredDocument = await processImportSyntax(pointer, rawSDL, loaders, options, cwd);
        } else {
          unfilteredDocument = parse(new GraphQLSource(rawSDL, pointer));
        }
        const document = filterKind(unfilteredDocument, filterKinds);
        if (options.forceRawSDL || (document && document.definitions && document.definitions.length > 0)) {
          found.push({
            location: pointer,
            document,
            rawSDL,
          });
        }
      } else if (content instanceof GraphQLSchema) {
        const schema = content as GraphQLSchema;
        found.push({
          location: pointer,
          get document() {
            return parse(new GraphQLSource(printSchemaWithDirectives(schema), pointer));
          },
          schema,
        });
      } else {
        let document = content as DocumentNode;
        document = filterKind(document, filterKinds);
        if (document && document.definitions && document.definitions.length > 0) {
          found.push({
            location: pointer,
            document,
          });
        }
      }
    } else if (isDocumentString(pointer)) {
      loadPromises$.push(
        Promise.resolve().then(async () => {
          let rawSDL = pointer;
          let content: DocumentNode;
          if (options.forceGraphQLImport || (!options.skipGraphQLImport && /^\#.*import /i.test(rawSDL.trimLeft()))) {
            content = await processImportSyntax(pointer, rawSDL, loaders, options, cwd);
          } else {
            content = parse(new GraphQLSource(rawSDL, pointer));
          }
          content = filterKind(content, filterKinds);
          if (options.forceRawSDL || (content && content.definitions && content.definitions.length > 0)) {
            found.push({
              location: stringToHash(pointer) + '.graphql',
              document: content,
              rawSDL: pointer,
            });
          }
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
          let schema: GraphQLSchema;
          let content = await loader(pointer, { ...options, ...pointerOptions }, normalizedPointerOptionsMap);
          if (content && content instanceof GraphQLSchema) {
            schema = fixSchemaAst(content, options as any);
            content = parse(printSchemaWithDirectives(content));
          }
          content = filterKind(content, filterKinds);
          if (content && content.definitions && content.definitions.length > 0) {
            found.push({
              location: pointer,
              document: content,
              schema,
            });
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
          let loaded = await loadSingleFile(loaders, pointer, combinedOptions);
          if (loaded) {
            let unfilteredDocument: DocumentNode;
            const rawSDL = loaded.rawSDL;
            if (options.forceGraphQLImport || (rawSDL && !options.skipGraphQLImport && /^\#.*import /i.test(rawSDL.trimLeft()))) {
              unfilteredDocument = await processImportSyntax(pointer, rawSDL, loaders, options, cwd);
            } else {
              unfilteredDocument = loaded.document;
            }
            const filteredDocument = filterKind(unfilteredDocument, filterKinds);
            if (options.forceRawSDL || (filteredDocument && filteredDocument.definitions && filteredDocument.definitions.length > 0)) {
              found.push({
                location: pointer,
                document: filteredDocument,
                schema: loaded.schema && fixSchemaAst(loaded.schema, combinedOptions),
                rawSDL: loaded.rawSDL,
              });
            }
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
              let content, schema, rawSDL;
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
                  schema = content;
                  content = parse(printSchemaWithDirectives(content));
                }
              } else {
                const loaded = await loadSingleFile(loaders, path, { ...options, ...globOptions });
                if (loaded) {
                  rawSDL = loaded.rawSDL;
                  if (options.forceGraphQLImport || (rawSDL && !options.skipGraphQLImport && /^\#.*import /i.test(rawSDL.trimLeft()))) {
                    content = await processImportSyntax(path, rawSDL, loaders, options, cwd);
                  } else {
                    content = loaded.document;
                  }
                }
              }
              content = filterKind(content, filterKinds);

              if (options.forceRawSDL || (content && content.definitions && content.definitions.length > 0)) {
                found.push({
                  location: path,
                  document: content,
                  schema,
                  rawSDL,
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

export async function loadSingleFile(loaders: Loader[], pointer: string, options: SingleFileOptions = {}): Promise<Source> {
  try {
    for (const loader of loaders) {
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
