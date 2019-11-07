import { EnumValueDefinitionNode } from 'graphql/language/ast';
import { mergeDirectives } from '.';

export function mergeEnumValues(first: ReadonlyArray<EnumValueDefinitionNode>, second: ReadonlyArray<EnumValueDefinitionNode>): EnumValueDefinitionNode[] {
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
  return [...enumValueMap.values()];
}
