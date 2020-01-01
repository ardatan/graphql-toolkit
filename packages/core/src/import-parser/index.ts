import { DefinitionNode, parse, ObjectTypeDefinitionNode, DocumentNode, Kind } from 'graphql';
import { groupBy, keyBy, isEqual, uniqBy, flatten } from 'lodash';
import resolveFrom from 'resolve-from';
import { loadSingleFile } from '../load-typedefs';
import { LoadSchemaOptions } from '../schema';

import { completeDefinitionPool, ValidDefinitionNode } from './definition';
import { realpathSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { Source } from '@graphql-toolkit/common';

/**
 * Describes the information from a single import line
 *
 */
export interface RawModule {
  imports: string[];
  from: string;
}

const rootFields = ['Query', 'Mutation', 'Subscription'];

const gqlExt = /\.g(raph)?ql$/;
function isGraphQLFile(f: string) {
  return gqlExt.test(f);
}

/**
 * Parse a single import line and extract imported types and schema filename
 *
 * @param importLine Import line
 * @returns Processed import line
 */
export function parseImportLine(importLine: string): RawModule {
  // Apply regex to import line
  const matches = importLine.match(/^import\s+(\*|(.*))\s+from\s+('|")(.*)('|");?$/);
  if (!matches || matches.length !== 6 || !matches[4]) {
    throw new Error(`
      Import statement is not valid: ${importLine}
      If you want to have comments starting with '# import', please use ''' instead!
      You can only have 'import' statements in the following pattern;
      # import [Type].[Field] from [File]
    `);
  }

  // Extract matches into named variables
  const [, wildcard, importsString, , from] = matches;

  // Extract imported types
  const imports = wildcard === '*' ? ['*'] : importsString.split(',').map(d => d.trim());

  // Return information about the import line
  return { imports, from };
}

/**
 * Parse a schema and analyze all import lines
 *
 * @param sdl Schema to parse
 * @returns Array with collection of imports per import line (file)
 */
export function parseSDL(sdl: string): RawModule[] {
  return sdl
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('# import ') || l.startsWith('#import '))
    .map(l => l.replace('#', '').trim())
    .map(parseImportLine);
}

/**
 * Main entry point. Recursively process all import statement in a schema
 *
 * @param filePath File path to the initial schema file
 * @returns Single bundled schema with all imported types
 */
export async function processImportSyntax(documentSource: Source, options: LoadSchemaOptions): Promise<void> {
  let document = documentSource.document;

  // Recursively process the imports, starting by importing all types from the initial schema
  await collectDefinitions(['*'], documentSource, options);

  // Post processing of the final schema (missing types, unused types, etc.)
  // Query, Mutation and Subscription should be merged
  // And should always be in the first set, to make sure they
  // are not filtered out.
  const firstTypes = flatten(options.typeDefinitions);
  const secondFirstTypes = options.typeDefinitions[0];
  const otherFirstTypes = flatten(options.typeDefinitions.slice(1));

  const firstSet = firstTypes.concat(secondFirstTypes, otherFirstTypes);
  const processedTypeNames: string[] = [];
  const mergedFirstTypes = [];
  for (const type of firstSet) {
    if ('name' in type) {
      if (!processedTypeNames.includes(type.name.value)) {
        processedTypeNames.push(type.name.value);
        mergedFirstTypes.push(type);
      } else {
        const existingType = mergedFirstTypes.find(t => t.name.value === type.name.value);

        if ('fields' in existingType) {
          (existingType as any).fields = uniqBy((existingType.fields as any).concat((type as ObjectTypeDefinitionNode).fields), 'name.value');
        }
      }
    }
  }

  (document as any).definitions = completeDefinitionPool(flatten(options.allDefinitions), firstSet, flatten(options.typeDefinitions));
}

/**
 * Parses a schema into a graphql DocumentNode.
 * If the schema is empty a DocumentNode with empty definitions will be created.
 *
 * @param sdl Schema to parse
 * @returns A graphql DocumentNode with definitions of the parsed sdl.
 */
export function getDocumentFromSDL(sdl: string): DocumentNode {
  if (isEmptySDL(sdl)) {
    return {
      kind: Kind.DOCUMENT,
      definitions: [],
    };
  } else {
    return parse(sdl, { noLocation: true });
  }
}

/**
 * Check if a schema contains any type definitions at all.
 *
 * @param sdl Schema to parse
 * @returns True if SDL only contains comments and/or whitespaces
 */
export function isEmptySDL(sdl: string): boolean {
  return (
    sdl
      .split('\n')
      .map(l => l.trim())
      .filter(l => !(l.length === 0 || l.startsWith('#'))).length === 0
  );
}

/**
 * Resolve the path of an import.
 * First it will try to find a file relative from the file the import is in, if that fails it will try to resolve it as a module so imports from packages work correctly.
 *
 * @param filePath Path the import was made from
 * @param importFrom Path given for the import
 * @returns Full resolved path to a file
 */
export function resolveModuleFilePath(filePath: string, importFrom: string): string {
  const dirName = dirname(filePath);
  if (isGraphQLFile(filePath) && isGraphQLFile(importFrom)) {
    try {
      return realpathSync(join(dirName, importFrom));
    } catch (e) {
      if (e.code === 'ENOENT') {
        return resolveFrom(dirName, importFrom);
      }
    }
  }

  return importFrom;
}

/**
 * Recursively process all schema files. Keeps track of both the filtered
 * type definitions, and all type definitions, because they might be needed
 * in post-processing (to add missing types)
 *
 * @param imports Types specified in the import statement
 * @param sdl Current schema
 * @param filePath File location for current schema
 * @param Tracking of processed schemas (for circular dependencies)
 * @param Tracking of imported type definitions per schema
 * @param Tracking of all type definitions per schema
 * @returns Both the collection of all type definitions, and the collection of imported type definitions
 */
export async function collectDefinitions(imports: string[], documentSource: Source, options: LoadSchemaOptions): Promise<void> {
  // Get TypeDefinitionNodes from current schema
  const document = documentSource.document;

  // Add all definitions to running total
  options.allDefinitions.push(filterTypeDefinitions(document.definitions));

  // Filter TypeDefinitionNodes by type and defined imports
  const currentTypeDefinitions = filterImportedDefinitions(imports, document.definitions, options.allDefinitions);

  // Add typedefinitions to running total
  options.typeDefinitions.push(currentTypeDefinitions);

  // Read imports from current file
  const rawModules = parseSDL(documentSource.rawSDL);

  // Process each file (recursively)
  await Promise.all(
    rawModules.map(async m => {
      // If it was not yet processed (in case of circular dependencies)
      const moduleFilePath = resolveModuleFilePath(resolve(options.cwd, documentSource.location), m.from);

      const processedFile = options.processedFiles.get(moduleFilePath);
      if (!processedFile || !processedFile.find(rModule => isEqual(rModule, m))) {
        // Mark this specific import line as processed for this file (for cicular dependency cases)
        options.processedFiles.set(moduleFilePath, processedFile ? processedFile.concat(m) : [m]);
        const result = await loadSingleFile(moduleFilePath, options);
        await collectDefinitions(m.imports, result, options);
      }
    })
  );
}

/**
 * Filter the types loaded from a schema, first by relevant types,
 * then by the types specified in the import statement.
 *
 * @param imports Types specified in the import statement
 * @param typeDefinitions All definitions from a schema
 * @returns Filtered collection of type definitions
 */
function filterImportedDefinitions(imports: string[], typeDefinitions: ReadonlyArray<DefinitionNode>, allDefinitions: ValidDefinitionNode[][] = []): ValidDefinitionNode[] {
  // This should do something smart with fields

  const filteredDefinitions = filterTypeDefinitions(typeDefinitions);

  if (imports.includes('*')) {
    if (imports.length === 1 && imports[0] === '*' && allDefinitions.length > 1) {
      const previousTypeDefinitions: { [key: string]: DefinitionNode } = keyBy(
        flatten(allDefinitions.slice(0, allDefinitions.length - 1)).filter(def => 'name' in def && !rootFields.includes(def.name.value)),
        def => 'name' in def && def.name.value
      );
      return typeDefinitions.filter(typeDef => typeDef.kind === 'ObjectTypeDefinition' && previousTypeDefinitions[typeDef.name.value]) as ObjectTypeDefinitionNode[];
    }
    return filteredDefinitions;
  } else {
    const importedTypes = imports.map(i => i.split('.')[0]);
    const result = filteredDefinitions.filter(d => 'name' in d && importedTypes.includes(d.name.value));
    const fieldImports = imports.filter(i => i.split('.').length > 1);
    const groupedFieldImports = groupBy(fieldImports, x => x.split('.')[0]);

    for (const rootType in groupedFieldImports) {
      const fields = groupedFieldImports[rootType].map(x => x.split('.')[1]);
      const objectTypeDefinition: any = filteredDefinitions.find(def => 'name' in def && def.name.value === rootType);

      if (objectTypeDefinition && 'fields' in objectTypeDefinition && !fields.includes('*')) {
        objectTypeDefinition.fields = objectTypeDefinition.fields.filter((f: any) => fields.includes(f.name.value) || fields.includes('*'));
      }
    }

    return result;
  }
}

/**
 * Filter relevant definitions from schema
 *
 * @param definitions All definitions from a schema
 * @returns Relevant type definitions
 */
export function filterTypeDefinitions(definitions: ReadonlyArray<DefinitionNode>): ValidDefinitionNode[] {
  return definitions.filter(d => validKinds.includes(d.kind)).map(d => d as ValidDefinitionNode);
}
const validKinds = ['DirectiveDefinition', 'ScalarTypeDefinition', 'ObjectTypeDefinition', 'ObjectTypeExtension', 'InterfaceTypeDefinition', 'EnumTypeDefinition', 'UnionTypeDefinition', 'InputObjectTypeDefinition', 'SchemaDefinition'];
