import { ExtractOptions } from './../utils/extract-document-string-from-code-file';
import { DocumentNode, parse, Kind, DefinitionNode } from 'graphql';
import * as isValidPath from 'is-valid-path';
import * as isGlob from 'is-glob';
import { isUri } from 'valid-url';
import { loadFromUrl } from './load-from-url';
import { extname, isAbsolute, resolve as resolvePath } from 'path';
import { loadFromJsonFile } from './load-from-json-file';
import { loadFromGqlFile } from './load-from-gql-file';
import { loadFromCodeFile } from './load-from-code-file';
import { debugLog } from '../utils/debugLog';
import { fixWindowsPath } from '../utils/fix-windows-path';

const GQL_EXTENSIONS = ['.gql', '.graphql', '.graphqls'];
const CODE_FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

function filterFiles(files: string[]): string[] {
  return files.filter(file => !file.endsWith('.d.ts') && !file.endsWith('.spec.ts') && !file.endsWith('.spec.js') && !file.endsWith('.test.ts') && !file.endsWith('.test.js'));
}

export interface DocumentFile {
  filePath: string;
  content: DocumentNode;
}

export interface LoadTypedefsOptions {
  ignore?: string | string[];
  tagPluck?: ExtractOptions['tagPluck'];
  noRequire?: boolean;
  skipGraphQLImport?: boolean;
  [key: string]: any;
}

export const filterKind = (content: DocumentNode, filterKinds: null | string[]) => {
  if (content && filterKinds && filterKinds.length > 0) {
    if (content.definitions.length > 0) {
      const invalidDefinitions: DefinitionNode[] = [];
      const validDefinitions: DefinitionNode[] = [];
      for (const definitionNode of content.definitions) {
        if (filterKinds.includes(definitionNode.kind)) {
          invalidDefinitions.push(definitionNode);
        } else {
          validDefinitions.push(definitionNode);
        }
      }

      if (invalidDefinitions.length > 0) {
        invalidDefinitions.forEach(d => {
          debugLog(`Filtered document of kind ${d.kind} due to filter policy (${filterKinds.join(', ')})`);
        });
      }

      return {
        kind: Kind.DOCUMENT,
        definitions: validDefinitions,
      };
    }
  }
  return content;
}

export async function loadTypedefs<AdditionalConfig = any>(pointToSchema: string | string[], options: LoadTypedefsOptions & Partial<AdditionalConfig> = {}, filterKinds: null | string[] = [], cwd = process.cwd()): Promise<DocumentFile[]> {
  const typesPaths: string[] = asArray(pointToSchema);
  const found$: Promise<void>[] = [];
  let found: DocumentFile[] = [];
  const foundGlobs: string[] = [];

  for (const typesPath of typesPaths) {
    if (isSchemaString(typesPath)) {
      found$.push(
        Promise.resolve().then(async () => {
          let content = parse(typesPath);
          content = filterKind(content, filterKinds);
          if (content && content.definitions && content.definitions.length > 0) {
            found.push({
              filePath: typesPath,
              content
            });
          }
        }),
      )
    } else if (!isUri(typesPath)) {
      const fixedPath = fixWindowsPath(typesPath);

      if (isValidPath(fixedPath)) {
        const relevantFiles = filterFiles(asArray(fixedPath));
        for (const filePath of relevantFiles) {
          found$.push(
            Promise.resolve().then(
              async () => {
                let content = await loadSingleFile(
                  filePath, {
                  skipGraphQLImport: options.skipGraphQLImport,
                  noRequire: options.noRequire,
                  tagPluck: options.tagPluck || {}
                }, cwd);
                content = filterKind(content, filterKinds);
                if (content && content.definitions && content.definitions.length > 0) {
                  found.push({
                    filePath,
                    content
                  });
                }
              }
            )
          )
        }

      } else if (isGlob(fixedPath)) {
        foundGlobs.push(fixedPath);
      }
    } else if (isUri(typesPath)) {
      found$.push(
        Promise.resolve().then(async () => {
          let content = await loadFromUrl(typesPath, options as AdditionalConfig);
          content = filterKind(content, filterKinds);
          if (content && content.definitions && content.definitions.length > 0) {
            found.push({
              filePath: typesPath,
              content,
            });
          }
        })
      );
    }
  }

  if (foundGlobs.length > 0) {
    if (options.ignore) {
      const ignoreList = asArray(options.ignore).map(g => `!(${g})`).map(p => fixWindowsPath(p));

      if (ignoreList.length > 0) {
        foundGlobs.push(...ignoreList);
      }
    }

    const globby = eval(`require('globby')`) as typeof import('globby');
    for await (let path of globby.stream(foundGlobs, { cwd, absolute: true })) {
      const filePath = path.toString('utf8');
      found$.push(
        Promise.resolve().then(async () => {
          let content = await loadSingleFile(
            filePath,
            { skipGraphQLImport: options.skipGraphQLImport, noRequire: options.noRequire, tagPluck: options.tagPluck || {} }, cwd);
          content = filterKind(content, filterKinds);
          if (content && content.definitions && content.definitions.length > 0) {
            found.push({
              filePath,
              content,
            });
          }
        })
      );
    }
  }

  await Promise.all(found$);

  found = found.sort((left, right) => left.filePath.localeCompare(right.filePath))

  if (found.length === 0) {
    throw new Error(`Unable to find any GraphQL type definitions for the following pointers: ${typesPaths.join(', ')}`);
  }

  return found;
}

export async function loadSingleFile(filePath: string, options: ExtractOptions & { noRequire?: boolean; skipGraphQLImport?: boolean } = {}, cwd = process.cwd()): Promise<DocumentNode> {
  const extension = extname(filePath).toLowerCase();
  const fullPath = fixWindowsPath(isAbsolute(filePath) ? filePath : resolvePath(cwd, filePath));

  try {
    if (extension === '.json') {
      return await loadFromJsonFile(fullPath);
    } else if (GQL_EXTENSIONS.includes(extension)) {
      return await loadFromGqlFile(fullPath, options.skipGraphQLImport);
    } else if (CODE_FILE_EXTENSIONS.includes(extension)) {
      return await loadFromCodeFile(fullPath, options);
    }
  } catch (e) {
    debugLog(`Failed to find any GraphQL type definitions in: ${filePath} - ${e.message}`);

    throw e;
  }

  return null;
}

function isSchemaString(str: string): boolean {
  // XXX: is-valid-path or is-glob treat SDL as a valid path
  // (`scalar Date` for example)
  // this why checking the extension is fast enough
  // and prevent from parsing the string in order to find out
  // if the string is a SDL
  if (/\.[a-z0-9]+$/i.test(str)) {
    return false;
  }

  try {
    parse(str);

    return true;
  } catch (e) {
    return false;
  }
}

function asArray(str: string | string[]): string[] {
  if (Array.isArray(str)) {
    return str;
  }

  return [str];
}
