import { DocumentNode, parse, Source } from 'graphql';

export async function loadFromGqlFile(filePath: string, skipGraphQLImport = false): Promise<DocumentNode> {
  const { readFileSync } = eval(`require('fs')`);
  const content = readFileSync(filePath, 'utf-8').trim();

  if (content && content !== '') {
    if (!skipGraphQLImport && /^\#.*import /i.test(content.trimLeft())) {
      const { importSchema } = eval(`require('graphql-import')`);
      const importedSchema = importSchema(filePath);

      return parse(importedSchema);
    } else {
      return parse(new Source(content, filePath));
    }
  }

  return null;
}
