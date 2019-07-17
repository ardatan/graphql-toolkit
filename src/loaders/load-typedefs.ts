import { ExtractOptions } from './../utils/extract-document-string-from-code-file';
import { DocumentNode, parse, concatAST, Kind } from 'graphql';
import * as isValidPath from 'is-valid-path';
import * as isGlob from 'is-glob';
import { sync as globSync } from 'glob';
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
  return files.filter(file => !file.includes('node_modules') && !file.endsWith('.d.ts') && !file.endsWith('.spec.ts') && !file.endsWith('.spec.js') && !file.endsWith('.test.ts') && !file.endsWith('.test.js'));
}

export interface DocumentFile {
  filePath: string;
  content: DocumentNode;
}

export interface LoadTypedefsOptions {
  ignore?: string | string[];
  tagPluck?: ExtractOptions['tagPluck'];
  [key: string]: any;
}

export async function loadTypedefs<AdditionalConfig = any>(pointToSchema: string | string[], options: LoadTypedefsOptions & Partial<AdditionalConfig> = {}, filterKinds: null | string[] = [], cwd = process.cwd()): Promise<DocumentFile[]> {
  const schemasPaths: string[] = normalizeSchemaString(pointToSchema);
  let found: DocumentFile[] = [];

  for (const schemaPath of schemasPaths) {
    if (isSchemaString(schemaPath)) {
      found.push({
        filePath: schemaPath,
        content: parse(schemaPath),
      });
    } else if (!isUri(schemaPath)) {
      const fixedPath = fixWindowsPath(schemaPath);

      if (isValidPath(fixedPath) || isGlob(fixedPath)) {
        const relevantFiles = filterFiles(
          !isGlob(fixedPath)
            ? [fixedPath]
            : globSync(fixedPath, {
                cwd,
                ignore: options.ignore || [],
                absolute: true,
              })
        );

        found.push(...(await Promise.all(relevantFiles.map(async p => ({ filePath: p, content: await loadSingleFile(p, { tagPluck: options.tagPluck || {} }, cwd) })))));
      }
    } else if (isUri(schemaPath)) {
      found.push({
        filePath: schemaPath,
        content: await loadFromUrl(schemaPath, options as AdditionalConfig),
      });
    }
  }

  let allFoundDocuments: DocumentNode = concatAST(found.map(a => a.content).filter(a => a));

  if (allFoundDocuments.definitions.length > 0 && filterKinds && filterKinds.length > 0) {
    const invalidDefinitions = allFoundDocuments.definitions.filter(d => filterKinds.includes(d.kind));

    if (invalidDefinitions.length > 0) {
      invalidDefinitions.forEach(d => {
        debugLog(`Filtered document of kind ${d.kind} due to filter policy (${filterKinds.join(', ')})`);
      });
    }

    found = found.map(documentFile => ({
      filePath: documentFile.filePath,
      content: {
        kind: Kind.DOCUMENT,
        definitions: documentFile.content ? documentFile.content.definitions.filter(d => !filterKinds.includes(d.kind)) : null,
      },
    }));
  }

  const nonEmpty = found.filter(f => f.content && f.content.definitions && f.content.definitions.length > 0);

  if (nonEmpty.length === 0) {
    throw new Error(`Unable to find any GraphQL type defintions for the following pointers: ${schemasPaths.join(', ')}`);
  }

  return nonEmpty;
}

export async function loadSingleFile(filePath: string, pluckOptions: ExtractOptions = {}, cwd = process.cwd()): Promise<DocumentNode> {
  const extension = extname(filePath).toLowerCase();
  const fullPath = fixWindowsPath(isAbsolute(filePath) ? filePath : resolvePath(cwd, filePath));

  if (extension === '.json') {
    return loadFromJsonFile(fullPath);
  } else if (GQL_EXTENSIONS.includes(extension)) {
    return loadFromGqlFile(fullPath);
  } else if (CODE_FILE_EXTENSIONS.includes(extension)) {
    return loadFromCodeFile(fullPath, pluckOptions);
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

function normalizeSchemaString(str: string | string[]): string[] {
  if (Array.isArray(str)) {
    return str;
  }

  return [str];
}
