import { DocumentLoader, DocumentFile } from './document-loader';
import { parse, Source, DocumentNode, Kind } from 'graphql';
import isGlob from 'is-glob';
import glob from 'glob';
import { existsSync, readFileSync } from 'fs';
import { extname } from 'path';
import isValidPath from 'is-valid-path';
import { extractDocumentStringFromCodeFile, ExtractOptions } from '../../utils/extract-document-string-from-code-file';

const VALID_DOCUMENT_KINDS: string[] = [Kind.OPERATION_DEFINITION, Kind.FRAGMENT_DEFINITION];
const GQL_EXTENSIONS: string[] = ['.graphql', '.graphqls', '.gql'];

export class DocumentsFromGlob implements DocumentLoader {
  canHandle(doc: string): Promise<boolean> | boolean {
    return isGlob(doc) || isValidPath(doc);
  }

  documentsFromGlobs(documentGlob: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      glob(documentGlob, (err, files) => {
        if (err) {
          reject(err);
        }

        if (!files || files.length === 0) {
          console['warn'](`No files matched for glob expression: ${documentGlob}`);
        }

        resolve(files);
      });
    });
  }

  async loadFileContent(filePath: string, options?: ExtractOptions): Promise<DocumentNode | null> {
    if (existsSync(filePath)) {
      const fileContent = readFileSync(filePath, 'utf8');
      const fileExt = extname(filePath);

      if (!fileContent || fileContent.trim() === '') {
        console['warn'](`Empty file found: "${filePath}", skipping...`);

        return null;
      }

      if (GQL_EXTENSIONS.includes(fileExt)) {
        return parse(new Source(fileContent, filePath));
      }

      const foundDoc = await extractDocumentStringFromCodeFile(new Source(fileContent, filePath), options);

      if (foundDoc) {
        return parse(new Source(foundDoc, filePath));
      } else {
        return null;
      }
    } else {
      throw new Error(`Failed to load a document. Document file ${filePath} does not exists.`);
    }
  }

  async loadDocumentsSources(filePaths: string[], options?: ExtractOptions): Promise<DocumentFile[]> {
    const sources$ = Promise.all(
      filePaths
      .map(async filePath => ({ filePath, content: await this.loadFileContent(filePath, options) }))
    );
    return (await sources$)
      .filter(result => {
        if (!result.content) {
          return false;
        }

        const invalidDefinitions = result.content.definitions.filter(definition => !VALID_DOCUMENT_KINDS.includes(definition.kind));

        if (invalidDefinitions.length === 0) {
          return true;
        } else {
          console['warn'](`File "${result.filePath}" was filtered because it contains an invalid GraphQL document definition!`);

          return false;
        }
      });
  }

  async handle(doc: string, options?: ExtractOptions): Promise<DocumentFile[]> {
    const foundDocumentsPaths = await this.documentsFromGlobs(doc);

    return this.loadDocumentsSources(foundDocumentsPaths, options);
  }
}
