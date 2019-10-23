export * from '@graphql-toolkit/common';
export * from '@graphql-toolkit/core';
export * from '@graphql-toolkit/file-loading';
export * from '@graphql-toolkit/schema-merging';

import { JsonFileLoader } from '@graphql-toolkit/json-file-loader';
import { LoadFromUrlOptions, UrlLoader } from '@graphql-toolkit/url-loader';
import { CodeFileLoader, CodeFileLoaderOptions } from '@graphql-toolkit/code-file-loader';
import { GraphQLFileLoader, GraphQLFileLoaderOptions } from '@graphql-toolkit/graphql-file-loader';
import { Source, Loader } from '@graphql-toolkit/common';
import { GraphQLSchema } from 'graphql';
import { LoadTypedefsOptions, loadTypedefsUsingLoaders, loadDocumentsUsingLoaders, loadSchemaUsingLoaders } from '@graphql-toolkit/core';

const DEFAULT_SCHEMA_LOADERS: Loader[] = [new UrlLoader(), new JsonFileLoader(), new GraphQLFileLoader(), new CodeFileLoader()];
const DEFAULT_DOCUMENTS_LOADERS: Loader[] = [new GraphQLFileLoader(), new CodeFileLoader()];

export async function loadTypedefs(
  pointerOrPointers: string | string[],
  options: LoadTypedefsOptions<LoadFromUrlOptions | CodeFileLoaderOptions | GraphQLFileLoaderOptions> = {},
  filterKinds: string[] = [],
  cwd = process.cwd(),
  loaders: Loader[] = DEFAULT_SCHEMA_LOADERS
): Promise<Source[]> {
  return loadTypedefsUsingLoaders(loaders, pointerOrPointers, options, filterKinds, cwd);
}

export async function loadDocuments(pointerOrPointers: string | string[], options: LoadTypedefsOptions<CodeFileLoaderOptions | GraphQLFileLoaderOptions> = {}, cwd = process.cwd(), loaders: Loader[] = DEFAULT_DOCUMENTS_LOADERS): Promise<Source[]> {
  return loadDocumentsUsingLoaders(loaders, pointerOrPointers, options, cwd);
}

export async function loadSchema(pointerOrPointers: string | string[], options: LoadTypedefsOptions<CodeFileLoaderOptions | GraphQLFileLoaderOptions> = {}, cwd = process.cwd(), loaders: Loader[] = DEFAULT_DOCUMENTS_LOADERS): Promise<GraphQLSchema> {
  return loadSchemaUsingLoaders(loaders, pointerOrPointers, options, cwd);
}
