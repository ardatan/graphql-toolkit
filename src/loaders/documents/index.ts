import { DocumentFile } from './document-loader';
import { DocumentFromString } from './document-from-string';
import { DocumentsFromGlob } from './documents-from-glob';

export { DocumentFromString } from './document-from-string';
export { DocumentsFromGlob } from './documents-from-glob';
export { DocumentLoader, DocumentFile } from './document-loader';
export { validateGraphQlDocuments } from './validate-documents';

export const loadDocuments = async (documentDef: string, documentsHandlers = [new DocumentFromString(), new DocumentsFromGlob()]): Promise<DocumentFile[]> => {
  for (const handler of documentsHandlers) {
    if (await handler.canHandle(documentDef)) {
      return handler.handle(documentDef);
    }
  }

  return [];
};
