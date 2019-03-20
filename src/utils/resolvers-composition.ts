import { get, set } from 'lodash';
import { IResolvers, } from 'graphql-tools';
import { chainFunctions, asArray } from './helpers';

export type ResolversCompositionFn<TResolver> = (next: TResolver) => TResolver;

export type IResolversComposerMapping<TResolvers = IResolvers> = {
  [TypeName in keyof TResolvers]: TypeName extends string ? ResolversCompositionFn<TResolvers[TypeName]> | ResolversCompositionFn<TResolvers[TypeName]>[] | {
    [FieldName in keyof TResolvers[TypeName] ]: FieldName extends string ? ResolversCompositionFn<TResolvers[TypeName]> | ResolversCompositionFn<TResolvers[TypeName]>[] : never
  } : never;
};


function resolveRelevantMappings<TSource, TContext>(resolvers: IResolvers<TSource, TContext>, path: string, allMappings: IResolversComposerMapping): string[] {
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
export function composeResolvers<TSource, TContext>(resolvers: IResolvers<TSource, TContext>, mapping: IResolversComposerMapping = {}): IResolvers {
  Object.keys(mapping).map((resolverPath: string) => {
    const composeFns = mapping[resolverPath];
    const relevantFields = resolveRelevantMappings(resolvers, resolverPath, mapping);
    relevantFields.forEach((path: string) => {
      const fns = chainFunctions([...asArray(composeFns as ResolversCompositionFn<Function>[]), () => get(resolvers, path)]);
      set(resolvers, path, fns());
    });
  });
  return resolvers;
}
