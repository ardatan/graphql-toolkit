import { filterKind } from './filter-document-kind';
import { Source } from '@graphql-toolkit/common';
import { parse } from 'graphql';

export function documentFromString(pointer: string, filterKinds: string[] = []): Source[] {
  let content = parse(pointer);
  const found = [];
  content = filterKind(content, filterKinds);

  if (content && content.definitions && content.definitions.length > 0) {
    found.push({
      location: 'file.graphql',
      document: content,
    });
  }

  return found;
}
