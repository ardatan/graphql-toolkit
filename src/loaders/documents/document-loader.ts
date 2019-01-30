import { DocumentNode } from 'graphql';

export interface DocumentFile {
  filePath: string;
  content: DocumentNode;
}

export interface DocumentLoader {
  canHandle(doc: string): Promise<boolean> | boolean;
  handle(doc: string): Promise<DocumentFile[]> | DocumentFile[];
}
