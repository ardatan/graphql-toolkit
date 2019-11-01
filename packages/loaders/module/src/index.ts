import { printSchema, parse, DocumentNode, isSchema } from 'graphql';
import { UniversalLoader } from '@graphql-toolkit/common';

// module:node/module#export
function extractData(
  pointer: string
): {
  modulePath: string;
  exportName?: string;
} {
  const parts = pointer.replace(/^module\:/i, '').split('#');

  if (!parts || parts.length > 2) {
    throw new Error('Schema pointer should match "module:path/to/module#export"');
  }

  return {
    modulePath: parts[0],
    exportName: parts[1],
  };
}

export class ModuleLoader implements UniversalLoader {
  loaderId() {
    return 'module-loader';
  }
  async canLoad(pointer: string) {
    return typeof pointer === 'string' && pointer.toLowerCase().startsWith('module:');
  }
  async load(pointer: string) {
    const { modulePath, exportName } = extractData(pointer);

    let thing: any;

    try {
      const imported = await import(modulePath);

      thing = imported[!exportName || exportName === 'default' ? 'default' : exportName];

      let document: DocumentNode;

      if (!thing) {
        throw new Error('Unable to import an object from module: ' + modulePath);
      }

      if (isSchema(thing)) {
        document = parse(printSchema(thing));
      } else if (typeof thing === 'string') {
        document = parse(thing);
      } else if (typeof thing === 'object' && thing.kind === 'Document') {
        document = thing;
      } else {
        throw new Error(`Imported object was not a string, DocumentNode or GraphQLSchema`);
      }

      return {
        location: pointer,
        document,
      };
    } catch (error) {
      throw new Error('Unable to load schema from module: ' + `${error && error.message ? error.message : error}`);
    }
  }
}
