import { EnumValueDefinitionNode } from 'graphql/language/ast';
import { mergeDirectives, Config } from '.';

export function mergeEnumValues(first: ReadonlyArray<EnumValueDefinitionNode>, second: ReadonlyArray<EnumValueDefinitionNode>, config: Config): EnumValueDefinitionNode[] {
  const enumValueMap = new Map<string, EnumValueDefinitionNode>();
  for (const firstValue of first) {
    enumValueMap.set(firstValue.name.value, firstValue);
  }
  for (const secondValue of second) {
    const enumValue = secondValue.name.value;
    if (enumValueMap.has(enumValue)) {
      const firstValue: any = enumValueMap.get(enumValue);
      firstValue.description = secondValue.description || firstValue.description;
      firstValue.directives = mergeDirectives(secondValue.directives, firstValue.directives);
    } else {
      enumValueMap.set(enumValue, secondValue);
    }
  }
  const result = [...enumValueMap.values()];
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
