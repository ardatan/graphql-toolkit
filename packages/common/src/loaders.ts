import { DocumentNode, GraphQLSchema } from 'graphql';

export declare class Source {
  document: DocumentNode;
  schema?: GraphQLSchema;
  location?: string;
  constructor({ document, location, schema }: { document: DocumentNode; location?: string; schema?: GraphQLSchema });
}

export type WithList<T> = T | T[];
export type ElementOf<TList> = TList extends Array<infer TElement> ? TElement : never;
export type SchemaPointer = WithList<string>;
export type SchemaPointerSingle = ElementOf<SchemaPointer>;
export type DocumentGlobPathPointer = string;
export type DocumentPointer = WithList<DocumentGlobPathPointer>;
export type DocumentPointerSingle = ElementOf<DocumentPointer>;

export interface Loader<TPointer = string, TOptions = any> {
  loaderId(): string;
  canLoad(pointer: TPointer, options?: TOptions): Promise<boolean>;
  load(pointer: TPointer, options?: TOptions): Promise<Source | null>;
}

export type SchemaLoader<TOptions = any> = Loader<SchemaPointerSingle, TOptions>;
export type DocumentLoader<TOptions = any> = Loader<DocumentPointerSingle, TOptions>;
export type UniversalLoader<TOptions = any> = Loader<SchemaPointerSingle | DocumentPointerSingle, TOptions>;
