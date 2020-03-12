import { parse, Kind, Source as GraphQLSource, DefinitionNode } from 'graphql';
import {
  Source,
  printSchemaWithDirectives,
  fixSchemaAst,
  SingleFileOptions,
  Loader,
  compareStrings,
} from '@graphql-toolkit/common';
import { printWithComments, resetComments } from '@graphql-toolkit/schema-merging';
import { normalizePointers } from './utils/pointers';
import { filterKind } from './filter-document-kind';
import { RawModule, processImportSyntax, isEmptySDL } from './import-parser';
import { prepareOptions } from './load-typedefs/options';
import { collectSources } from './load-typedefs/collect-sources';
import { useLimit } from './utils/helpers';

const CONCURRENCY_LIMIT = 100;

export type LoadTypedefsOptions<ExtraConfig = { [key: string]: any }> = SingleFileOptions &
  ExtraConfig & {
    processedFiles?: Map<string, RawModule[]>;
    cache?: { [key: string]: Source };
    loaders: Loader[];
    filterKinds?: string[];
    ignore?: string | string[];
    sort?: boolean;
    skipGraphQLImport?: boolean;
    forceGraphQLImport?: boolean;
    fs?: typeof import('fs');
    path?: typeof import('path');
    os?: typeof import('os');
  };

export type UnnormalizedTypeDefPointer = { [key: string]: any } | string;

export async function loadTypedefs<AdditionalConfig = {}>(
  pointerOrPointers: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[],
  options: LoadTypedefsOptions<Partial<AdditionalConfig>>
): Promise<Source[]> {
  const pointerOptionMap = normalizePointers(pointerOrPointers);
  const globOptions: any = {};

  await prepareOptions<AdditionalConfig>(options);

  const sources = await collectSources({
    pointerOptionMap,
    options,
  });

  const validSources: Source[] = [];
  const definitionsCacheForImport: DefinitionNode[][] = [];

  // If we have few k of files it may be an issue
  const limit = useLimit(CONCURRENCY_LIMIT);

  await Promise.all(
    sources.map(partialSource =>
      limit(async () => {
        if (partialSource) {
          const specificOptions = {
            ...options,
            ...(partialSource.location in pointerOptionMap ? globOptions : pointerOptionMap[partialSource.location]),
          };
          const source: Source = { ...partialSource };

          if (source.schema) {
            source.schema = fixSchemaAst(source.schema, specificOptions);
            source.rawSDL = printSchemaWithDirectives(source.schema, specificOptions);
          }

          if (source.rawSDL) {
            source.document = isEmptySDL(source.rawSDL)
              ? {
                  kind: Kind.DOCUMENT,
                  definitions: [],
                }
              : parse(new GraphQLSource(source.rawSDL, source.location), specificOptions);
          }

          if (source.document) {
            if (options.filterKinds) {
              source.document = filterKind(source.document, specificOptions.filterKinds);
            }

            if (!source.rawSDL) {
              source.rawSDL = printWithComments(source.document);
              resetComments();
            }

            if (
              specificOptions.forceGraphQLImport ||
              (!specificOptions.skipGraphQLImport && /^\#.*import /i.test(source.rawSDL.trimLeft()))
            ) {
              source.document = {
                kind: Kind.DOCUMENT,
                definitions: await processImportSyntax(source, specificOptions, definitionsCacheForImport),
              };
            }

            if (source.document.definitions && source.document.definitions.length > 0) {
              validSources.push(source);
            }
          }
        }
      })
    )
  );

  const pointerList = Object.keys(pointerOptionMap);

  if (pointerList.length > 0 && validSources.length === 0) {
    throw new Error(`
      Unable to find any GraphQL type definitions for the following pointers: 
        ${pointerList.map(
          p => `
          - ${p}
          `
        )}`);
  }

  return options.sort
    ? validSources.sort((left, right) => compareStrings(left.location, right.location))
    : validSources;
}
