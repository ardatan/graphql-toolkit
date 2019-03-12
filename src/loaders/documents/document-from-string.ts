import { DocumentLoader, DocumentFile } from './document-loader';
import isValidPath from 'is-valid-path';
import { parse } from 'graphql';

export class DocumentFromString implements DocumentLoader {
  canHandle(doc: string): Promise<boolean> | boolean {
    if (isValidPath(doc)) {
      return false;
    }

    try {
      parse(doc);

      return true;
    } catch (e) {
      return false;
    }
  }

  handle(doc: string, _options?: any): Promise<DocumentFile[]> | DocumentFile[] {
    return [{ filePath: 'document.graphql', content: parse(doc) }];
  }
}
