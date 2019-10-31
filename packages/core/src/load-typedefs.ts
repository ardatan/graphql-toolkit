import { DocumentNode } from 'graphql';
import * as isValidPath from 'is-valid-path';
import * as isGlob from 'is-glob';
import { isAbsolute, resolve as resolvePath } from 'path';
import { Source, asArray, isDocumentString, debugLog, fixWindowsPath, Loader } from '@graphql-toolkit/common';
import { filterKind } from './filter-document-kind';
import { documentFromString } from './document-from-string';

function filterFiles(files: string[]): string[] {
  return files.filter(file => !file.endsWith('.d.ts') && !file.endsWith('.spec.ts') && !file.endsWith('.spec.js') && !file.endsWith('.test.ts') && !file.endsWith('.test.js'));
}

export type SingleFileOptions<ExtraConfig = { [key: string]: any }> = ExtraConfig & {
  noRequire?: boolean;
  skipGraphQLImport?: boolean;
};

export type LoadTypedefsOptions<ExtraConfig = { [key: string]: any }> = SingleFileOptions<ExtraConfig> & {
  ignore?: string | string[];
};

function isUrl(pointer: string) {
  return typeof pointer === 'string' && /^https?\:\/\//i.test(pointer);
}

export async function loadTypedefsUsingLoaders<AdditionalConfig = {}>(
  loaders: Loader[],
  pointerOrPointers: string | string[],
  options: LoadTypedefsOptions<Partial<AdditionalConfig>> = {},
  filterKinds: string[] = [],
  cwd = process.cwd()
): Promise<Source[]> {
  const pointers: string[] = asArray(pointerOrPointers);
  const loadPromises$: Promise<any>[] = [];
  const found: Source[] = [];
  const foundGlobs: string[] = [];

  for (const pointer of pointers) {
    if (isDocumentString(pointer)) {
      loadPromises$.push(
        Promise.resolve().then(async () => {
          const docs = documentFromString(pointer, filterKinds);
          found.push(...docs);
        })
      );
    } else if (isUrl(pointer)) {
      loadPromises$.push(
        Promise.resolve().then(async () => {
          const fullPath = fixWindowsPath(isAbsolute(pointer) ? pointer : resolvePath(cwd, pointer));
          let content = await loadSingleFile(loaders, fullPath, options);
          content = filterKind(content, filterKinds);

          if (content && content.definitions && content.definitions.length > 0) {
            found.push({
              location: pointer,
              document: content,
            });
          }
        })
      );
    } else if (isValidPath(pointer)) {
      const fixedPath = fixWindowsPath(pointer);

      const relevantFiles = filterFiles(asArray(fixedPath));
      for (const filePath of relevantFiles) {
        loadPromises$.push(
          Promise.resolve().then(async () => {
            let content = await loadSingleFile(loaders, filePath, options);
            content = filterKind(content, filterKinds);

            if (content && content.definitions && content.definitions.length > 0) {
              found.push({
                location: filePath,
                document: content,
              });
            }
          })
        );
      }
    } else if (isGlob(pointer)) {
      foundGlobs.push(pointer);
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

    const globby = eval(`require('globby')`) as typeof import('globby');

    loadPromises$.push(
      Promise.resolve().then(async () => {
        const paths = await globby(foundGlobs, { cwd, absolute: true });
        await Promise.all(
          paths.map(async path => {
            const filePath = fixWindowsPath(path);
            let content = await loadSingleFile(loaders, filePath, options);
            content = filterKind(content, filterKinds);

            if (content && content.definitions && content.definitions.length > 0) {
              found.push({
                location: filePath,
                document: content,
              });
            }
          })
        );
      })
    );
  }

  await Promise.all(loadPromises$);

  if (found.length === 0) {
    throw new Error(`Unable to find any GraphQL type definitions for the following pointers: ${pointers.join(', ')}`);
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
