import { Source } from '@graphql-toolkit/common';
import { Kind } from 'graphql';
import { LoadTypedefsOptions, loadTypedefs, UnnormalizedTypeDefPointer } from './load-typedefs';

export const OPERATION_KINDS = [Kind.OPERATION_DEFINITION, Kind.FRAGMENT_DEFINITION];
export const NON_OPERATION_KINDS = Object.keys(Kind)
  .reduce((prev, v) => [...prev, Kind[v]], [])
  .filter(v => !OPERATION_KINDS.includes(v));

export function loadDocuments(documentDef: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[], options: LoadTypedefsOptions): Promise<Source[]> {
  return loadTypedefs(documentDef, { noRequire: true, filterKinds: NON_OPERATION_KINDS, ...options });
}
