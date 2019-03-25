import { get, set } from 'lodash';
import { IResolvers, IFieldResolver, } from 'graphql-tools';
import { chainFunctions, asArray } from './helpers';

export type ResolversComposition<Resolver extends IFieldResolver<any, any> = IFieldResolver<any, any>> = (next: Resolver) => Resolver;

export type ResolversComposerMapping<Resolvers extends IResolvers = IResolvers> = {
  [TypeName in keyof Resolvers]?: {
    [FieldName in keyof Resolvers[TypeName]]: Resolvers[TypeName][FieldName] extends IFieldResolver<any, any> ? ResolversComposition<Resolvers[TypeName][FieldName]> | Array<ResolversComposition<Resolvers[TypeName][FieldName]>> : ResolversComposition | ResolversComposition[];
  };
} | {
  [path: string]: ResolversComposition | ResolversComposition[];
};

function resolveRelevantMappings<Resolvers extends IResolvers>(resolvers: Resolvers, path: string, allMappings: ResolversComposerMapping<Resolvers>): string[] {
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
export function composeResolvers<Resolvers extends IResolvers>(resolvers: Resolvers, mapping: ResolversComposerMapping<Resolvers> = {}): Resolvers {
  Object.keys(mapping).map((resolverPath: string) => {
    if (mapping[resolverPath] instanceof Array || typeof mapping[resolverPath] === 'function') {
      const composeFns = mapping[resolverPath] as ResolversComposition | ResolversComposition[];
      const relevantFields = resolveRelevantMappings(resolvers, resolverPath, mapping);
      relevantFields.forEach((path: string) => {
        const fns = chainFunctions([...asArray(composeFns), () => get(resolvers, path)]);
        set(resolvers, path, fns());
      });
    } else {
      Object.keys(mapping[resolverPath]).map(fieldName => {
        const composeFns = mapping[resolverPath][fieldName];
        const relevantFields = resolveRelevantMappings(resolvers, resolverPath + '.' + fieldName, mapping);
        relevantFields.forEach((path: string) => {
          const fns = chainFunctions([...asArray(composeFns), () => get(resolvers, path)]);
          set(resolvers, path, fns());
        });
      })
    }
  });
  return resolvers;
}
