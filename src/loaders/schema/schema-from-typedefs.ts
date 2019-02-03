import { mergeGraphQLSchemas } from '../../epoxy';
import { SchemaLoader } from './schema-loader';
import * as isGlob from 'is-glob';
import * as isValidPath from 'is-valid-path';
import { DocumentNode, parse, Source } from 'graphql';
import * as glob from 'glob';
import { readFileSync } from 'fs';
import { extractDocumentStringFromCodeFile } from '../../utils/extract-document-string-from-code-file';

export const graphQLExtensions = ['.graphql', '.graphqls', '.gql'];

function isGraphQLFile(globPath: string): boolean {
  return graphQLExtensions.some(ext => globPath.endsWith(ext));
}

function loadSchemaFile(filepath: string): string {
  const content = readFileSync(filepath, 'utf-8');

  if (content && content.trim() !== '') {
    if (/^\#.*import /i.test(content.trimLeft())) {
      const { importSchema } = require('graphql-import');

      return importSchema(filepath);
    }

    const foundDoc = extractDocumentStringFromCodeFile(new Source(content, filepath));

    if (foundDoc) {
      return foundDoc;
    }

    return content;
  } else {
    console['warn'](`Empty schema file found: "${filepath}", skipping...`);
  }

  return null;
}

export class SchemaFromTypedefs implements SchemaLoader {
  canHandle(globPath: string): boolean {
    return isGlob(globPath) || (isValidPath(globPath) && isGraphQLFile(globPath));
  }

  handle(globPath: string): DocumentNode {
    const globFiles = glob.sync(globPath, { cwd: process.cwd() });

    if (!globFiles || globFiles.length === 0) {
      throw new Error(`Unable to find matching files for glob: ${globPath} in directory: ${process.cwd()}`);
    }

    const filesContent = globFiles.map(filePath => loadSchemaFile(filePath)).filter(f => f);

    if (filesContent.length === 0) {
      throw new Error(`All found files for glob expression "${globPath}" are not valid or empty, please check it and try again!`);
    }

    return mergeGraphQLSchemas(filesContent);
  }
}
