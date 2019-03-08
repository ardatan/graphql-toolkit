import { mergeTypeDefs } from '../../epoxy';
import { SchemaLoader } from './schema-loader';
import * as isGlob from 'is-glob';
import * as isValidPath from 'is-valid-path';
import { DocumentNode, parse, Source, Kind } from 'graphql';
import * as glob from 'glob';
import { readFileSync } from 'fs';
import { extractDocumentStringFromCodeFile, ExtractOptions } from '../../utils/extract-document-string-from-code-file';

const GQL_EXTENSIONS = ['.graphql', '.graphqls', '.gql'];
const INVALID_SCHEMA_KINDS: string[] = [Kind.OPERATION_DEFINITION, Kind.FRAGMENT_DEFINITION];

export function isGraphQLFile(globPath: string): boolean {
  return GQL_EXTENSIONS.some(ext => globPath.endsWith(ext));
}

function loadSchemaFile(filepath: string, options?: ExtractOptions): string {
  const content = readFileSync(filepath, 'utf-8');

  if (content && content.trim() !== '') {
    if (/^\#.*import /i.test(content.trimLeft())) {
      const { importSchema } = require('graphql-import');

      return importSchema(filepath);
    }

    const foundDoc = extractDocumentStringFromCodeFile(new Source(content, filepath), options);

    if (foundDoc) {
      return foundDoc;
    }

    if (isGraphQLFile(filepath)) {
      return content;
    }
  } else {
    console['warn'](`Empty schema file found: "${filepath}", skipping...`);
  }

  return null;
}

export class SchemaFromTypedefs implements SchemaLoader {
  canHandle(globOrValidPath: string): boolean {
    return isGlob(globOrValidPath) || isValidPath(globOrValidPath);
  }

  handle(globPath: string, options?: ExtractOptions): DocumentNode {
    const globFiles = glob.sync(globPath, { cwd: process.cwd() });

    if (!globFiles || globFiles.length === 0) {
      throw new Error(`Unable to find matching files for glob: ${globPath} in directory: ${process.cwd()}`);
    }

    const filesContent = globFiles
      .map(filePath => ({ filePath, content: loadSchemaFile(filePath, options) }))
      .filter(file => {
        if (!file.content) {
          return false;
        }

        const node = parse(file.content);
        const invalidSchemaDefinitions = node.definitions.filter(def => INVALID_SCHEMA_KINDS.includes(def.kind));

        if (invalidSchemaDefinitions.length === 0) {
          return true;
        } else {
          console['warn'](`File "${file.filePath}" was filtered because it contains an invalid GraphQL schema definition!`);

          return false;
        }
      });

    if (filesContent.length === 0) {
      throw new Error(`All found files for glob expression "${globPath}" are not valid or empty, please check it and try again!`);
    }

    return mergeTypeDefs(filesContent.map(f => f.content));
  }
}
