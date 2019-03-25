import { get, set } from 'lodash';
import { IResolvers, IFieldResolver, } from 'graphql-tools';
import { chainFunctions, asArray } from './helpers';

export type ResolversComposition<Resolver extends ((...args: any[]) => any) = IFieldResolver<any, any>> = (next: Resolver) => Resolver;

export type ResolversComposerMapping<Resolvers extends { [key: string]: any } = IResolvers> = {
  [TypeName in string]?: TypeName extends keyof Resolvers ? {
    [FieldName in keyof Resolvers[TypeName]]?: ResolversComposition<Resolvers[TypeName][FieldName] & ((...args: any[]) => any)> | Array<ResolversComposition<Resolvers[TypeName][FieldName] & Resolvers[TypeName][FieldName] & ((...args: any[]) => any)>>
  } : any
};

function resolveRelevantMappings<Resolvers>(resolvers: Resolvers, path: string, allMappings: ResolversComposerMapping<Resolvers>): string[] {
  const splitted = path.split('.');

  if (splitted.length === 2) {
    const typeName = splitted[0];
    const fieldName = splitted[1];

    if (fieldName === '*') {
      return Object.keys(resolvers[typeName])
        .map(field => resolveRelevantMappings(resolvers, `${typeName}.${field}`, allMappings))
        .flat()
        .filter(mapItem => !allMappings[mapItem]);
    } else {
      const paths = [];
      if ('subscribe' in resolvers[typeName][fieldName]) {
        paths.push(path + '.subscribe');
      }
      if ('resolve' in resolvers[typeName][fieldName]) {
        paths.push(path + '.resolve');
      }
      if (typeof resolvers[typeName][fieldName] === 'function') {
        paths.push(path);
      }
      return paths;
    }
  } else if (splitted.length === 1) {
    const typeName = splitted[0];
    return Object.keys(resolvers[typeName]).map(
      fieldName => resolveRelevantMappings(resolvers, `${typeName}.${fieldName}`, allMappings)
    ).flat();
  }

  return [];
}

/**
 * Wraps the resolvers object with the resolvers composition objects.
 * Implemented as a simple and basic middleware mechanism.
 *
 * @param resolvers - resolvers object
 * @param mapping - resolvers composition mapping
 * @hidden
 */
export function composeResolvers<Resolvers>(resolvers: Resolvers, mapping: ResolversComposerMapping<Resolvers> = {}): Resolvers {
  Object.keys(mapping).map((resolverPath: string) => {
    const composeFns = mapping[resolverPath];
    const relevantFields = resolveRelevantMappings(resolvers, resolverPath, mapping);
    relevantFields.forEach((path: string) => {
      const fns = chainFunctions([...asArray(composeFns), () => get(resolvers, path)]);
      set(resolvers as any, path, fns());
    });
  });
  return resolvers;
}
