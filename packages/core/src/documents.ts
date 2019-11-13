import { Loader, Source } from '@graphql-toolkit/common';
import { Kind } from 'graphql';
import { LoadTypedefsOptions, loadTypedefsUsingLoaders, UnnormalizedTypeDefPointer } from './load-typedefs';

export const OPERATION_KINDS = [Kind.OPERATION_DEFINITION, Kind.FRAGMENT_DEFINITION];
export const NON_OPERATION_KINDS = Object.keys(Kind)
  .reduce((prev, v) => [...prev, Kind[v]], [])
  .filter(v => !OPERATION_KINDS.includes(v));

export async function loadDocumentsUsingLoaders(loaders: Loader[], documentDef: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[], options: LoadTypedefsOptions = {}, cwd = process.cwd()): Promise<Source[]> {
  return await loadTypedefsUsingLoaders(loaders, documentDef, { ...options, skipGraphQLImport: true, noRequire: true }, NON_OPERATION_KINDS, cwd);
}
