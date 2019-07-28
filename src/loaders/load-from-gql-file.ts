import { DocumentNode, parse } from 'graphql';
import { readFileSync } from 'fs';

export async function loadFromGqlFile(filePath: string): Promise<DocumentNode> {
  const content = readFileSync(filePath, 'utf-8').trim();

  if (content && content !== '') {
    if (/^\#.*import /i.test(content.trimLeft())) {
      const { importSchema } = await eval(`require('graphql-import')`);
      const importedSchema = importSchema(filePath);

      return parse(importedSchema);
    } else {
      return parse(content);
    }
  }

  return null;
}
