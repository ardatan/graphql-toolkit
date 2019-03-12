import { DocumentNode } from 'graphql';

export interface DocumentFile {
  filePath: string;
  content: DocumentNode;
}

export interface DocumentLoader<TOptions = any> {
  canHandle(doc: string): Promise<boolean> | boolean;
  handle(doc: string, options?: TOptions): Promise<DocumentFile[]> | DocumentFile[];
}
