import { UniversalLoader, parseGraphQLSDL, parseGraphQLJSON, SingleFileOptions } from '@graphql-toolkit/common';
import simplegit from 'simple-git/promise';
import { GraphQLTagPluckOptions, gqlPluckFromCodeString } from '@graphql-toolkit/graphql-tag-pluck';

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

type GitLoaderOptions = SingleFileOptions & { pluckConfig: GraphQLTagPluckOptions };

export class GitLoader implements UniversalLoader {
  loaderId() {
    return 'git-loader';
  }
  async canLoad(pointer: string) {
    return typeof pointer === 'string' && pointer.toLowerCase().startsWith('git:');
  }
  async load(pointer: string, options: GitLoaderOptions) {
    const { ref, path } = extractData(pointer);
    const git = simplegit();

    let content: string;

    try {
      content = await git.show([`${ref}:${path}`]);
    } catch (error) {
      throw new Error('Unable to load schema from git: ' + error);
    }

    if (/\.(gql|graphql)s?$/i.test(path)) {
      return parseGraphQLSDL(pointer, content, options);
    }

    if (/\.json$/i.test(path)) {
      return parseGraphQLJSON(pointer, content, options);
    }

    const rawSDL = await gqlPluckFromCodeString(pointer, content, options.pluckConfig);
    if (rawSDL) {
      return {
        location: pointer,
        rawSDL,
      };
    }

    throw new Error(`Invalid file extension: ${path}`);
  }
}
