import { DocumentNode, parse } from 'graphql';
import { readFileSync } from 'fs';

export async function loadFromGqlFile(filePath: string): Promise<DocumentNode> {
  const content = readFileSync(filePath, 'utf-8');

  if (content && content.trim() !== '') {
    if (/^\#.*import /i.test(content.trimLeft())) {
      const { importSchema } = await eval(`require('graphql-import')`);

      return parse(importSchema(filePath));
    } else {
      return parse(content);
    }
  }

  return null;
}
