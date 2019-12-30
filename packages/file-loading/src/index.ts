import { existsSync, statSync, readFileSync, readFile } from 'fs';
import { extname } from 'path';
import globby from 'globby';

const DEFAULT_IGNORED_EXTENSIONS = ['spec', 'test', 'd', 'map'];
const DEFAULT_EXTENSIONS = ['gql', 'graphql', 'graphqls', 'ts', 'js'];
const DEFAULT_EXPORT_NAMES = ['typeDefs', 'schema'];

function isDirectory(path: string) {
  return existsSync(path) && statSync(path).isDirectory();
}

function scanForFiles(globStr: string, globOptions: import('globby').GlobbyOptions = {}): string[] {
  return globby.sync(globStr.replace(/\\/g, '/'), { absolute: true, ...globOptions });
}

function buildGlob(basePath: string, extensions: string[], ignoredExtensions: string[] = [], recursive: boolean): string {
  return `${basePath}${recursive ? '/**' : ''}/${ignoredExtensions.length > 0 ? `!(${ignoredExtensions.map(e => '*.' + e).join('|')})` : '*'}+(${extensions.map(e => '*.' + e).join('|')})`;
}

function extractExports(fileExport: any, exportNames: string[]): any | null {
  if (!fileExport) {
    return null;
  }

  if (fileExport.default) {
    for (const exportName of exportNames) {
      if (fileExport.default[exportName]) {
        return fileExport.default[exportName];
      }
    }

    return fileExport.default;
  }

  for (const exportName of exportNames) {
    if (fileExport[exportName]) {
      return fileExport[exportName];
    }
  }

  return fileExport;
}

export interface LoadFilesOptions {
  ignoredExtensions?: string[];
  extensions?: string[];
  useRequire?: boolean;
  requireMethod?: any;
  globOptions?: import('globby').GlobbyOptions;
  exportNames?: string[];
  recursive?: boolean;
  ignoreIndex?: boolean;
}

const LoadFilesDefaultOptions: LoadFilesOptions = {
  ignoredExtensions: DEFAULT_IGNORED_EXTENSIONS,
  extensions: DEFAULT_EXTENSIONS,
  useRequire: false,
  requireMethod: null,
  globOptions: {
    absolute: true,
  },
  exportNames: DEFAULT_EXPORT_NAMES,
  recursive: true,
  ignoreIndex: false,
};

export function loadFiles(path: string, options: LoadFilesOptions = LoadFilesDefaultOptions): any[] {
  const execOptions = { ...LoadFilesDefaultOptions, ...options };
  const relevantPaths = scanForFiles(isDirectory(path) ? buildGlob(path, execOptions.extensions, execOptions.ignoredExtensions, execOptions.recursive) : path, options.globOptions);

  return relevantPaths
    .map(path => {
      if (!checkExtension(path, options)) {
        return;
      }

      if (isIndex(path, execOptions.extensions) && options.ignoreIndex) {
        return false;
      }

      const extension = extname(path);

      if (extension.endsWith('.js') || extension.endsWith('.ts') || execOptions.useRequire) {
        const fileExports = (execOptions.requireMethod ? execOptions.requireMethod : require)(path);
        const extractedExport = extractExports(fileExports, execOptions.exportNames);

        if (extractedExport.resolver) {
          return extractedExport.resolver;
        }

        if (extractedExport.resolvers) {
          return extractedExport.resolvers;
        }

        return extractedExport;
      } else {
        return readFileSync(path, { encoding: 'utf-8' });
      }
    })
    .filter(v => v);
}

function scanForFilesAsync(globStr: string, globOptions: import('globby').GlobbyOptions = {}): Promise<string[]> {
  return globby(globStr.replace(/\\/g, '/'), { absolute: true, ...globOptions, ignore: [] });
}

const checkExtension = (path: string, { extensions, ignoredExtensions }: { extensions?: string[]; ignoredExtensions?: string[] }) => {
  if (ignoredExtensions) {
    for (const ignoredExtension of ignoredExtensions) {
      if (path.endsWith(ignoredExtension)) {
        return false;
      }
    }
  }

  if (extensions) {
    for (const extension of extensions) {
      if (path.endsWith(extension)) {
        return true;
      }
    }
  } else {
    return true;
  }

  return false;
};

export async function loadFilesAsync(path: string, options: LoadFilesOptions = LoadFilesDefaultOptions): Promise<any[]> {
  const execOptions = { ...LoadFilesDefaultOptions, ...options };
  const relevantPaths = await scanForFilesAsync(isDirectory(path) ? buildGlob(path, execOptions.extensions, execOptions.ignoredExtensions, execOptions.recursive) : path, options.globOptions);

  const require$ = (path: string) => import(path);

  return Promise.all(
    relevantPaths
      .map(async path => {
        if (!checkExtension(path, options)) {
          return;
        }

        if (isIndex(path, execOptions.extensions) && options.ignoreIndex) {
          return false;
        }
        const extension = extname(path);

        if (extension.endsWith('.js') || extension.endsWith('.ts') || execOptions.useRequire) {
          const fileExports = await (execOptions.requireMethod ? execOptions.requireMethod : require$)(path);
          const extractedExport = extractExports(fileExports, execOptions.exportNames);

          if (extractedExport.resolver) {
            return extractedExport.resolver;
          }

          if (extractedExport.resolvers) {
            return extractedExport.resolvers;
          }

          return extractedExport;
        } else {
          return new Promise((resolve, reject) => {
            readFile(path, { encoding: 'utf-8' }, (err, data) => {
              if (err) {
                reject(err);
              }
              resolve(data);
            });
          });
        }
      })
      .filter(p => p)
  );
}

function isIndex(path: string, extensions: string[] = []): boolean {
  const IS_INDEX = /(\/|\\)index\.[^\/\\]+$/i; // (/ or \) AND `index.` AND (everything except \ and /)(end of line)
  return IS_INDEX.test(path) && extensions.some(ext => path.endsWith('.' + ext));
}

export { loadFilesAsync as loadSchemaFilesAsync, loadFiles as loadSchemaFiles };
export { loadFilesAsync as loadResolversFilesAsync, loadFiles as loadResolversFiles };
