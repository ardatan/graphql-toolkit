import { buildClientSchema, printSchema, parse, DocumentNode } from 'graphql';
import { UniversalLoader } from '@graphql-toolkit/common';
import * as simplegit from 'simple-git/promise';

// git:branch:path/to/file
function extractData(
  pointer: string
): {
  ref: string;
  path: string;
} {
  const parts = pointer.replace(/^git\:/i, '').split(':');

  if (!parts || parts.length !== 2) {
    throw new Error('Schema pointer should match "git:branchName:path/to/file"');
  }

  return {
    ref: parts[0],
    path: parts[1],
  };
}

export class GitLoader implements UniversalLoader {
  loaderId() {
    return 'git-loader';
  }
  async canLoad(pointer: string) {
    return typeof pointer === 'string' && pointer.toLowerCase().startsWith('git:');
  }
  async load(pointer: string) {
    const { ref, path } = extractData(pointer);
    const git = simplegit();

    let schemaString: string;

    try {
      schemaString = await git.show([`${ref}:${path}`]);
    } catch (error) {
      throw new Error('Unable to load schema from git: ' + error);
    }

    let document: DocumentNode;

    if (/\.(gql|graphql)s?$/i.test(path)) {
      document = parse(schemaString);
    }

    if (/\.json$/i.test(path)) {
      document = parse(printSchema(buildClientSchema(JSON.parse(schemaString))));
    }

    if (!document) {
      throw new Error('Unable to build schema from git');
    }

    return {
      location: pointer,
      document,
    };
  }
}
