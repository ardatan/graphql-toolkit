import { NamedTypeNode } from 'graphql/language/ast';
import { Config } from '.';

function alreadyExists(arr: ReadonlyArray<NamedTypeNode>, other: NamedTypeNode): boolean {
  return !!arr.find(i => i.name.value === other.name.value);
}

export function mergeNamedTypeArray(first: ReadonlyArray<NamedTypeNode>, second: ReadonlyArray<NamedTypeNode>, config: Config): NamedTypeNode[] {
  const result = [...second, ...first.filter(d => !alreadyExists(second, d))];
  if (config && config.sort) {
    result.sort((a, b) => {
      if (typeof config.sort === 'function') {
        return config.sort(a.name.value, b.name.value);
      } else {
        return a.name.value.localeCompare(b.name.value);
      }
    });
  }
  return result;
}
