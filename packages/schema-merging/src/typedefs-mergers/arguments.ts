import { InputValueDefinitionNode } from 'graphql';
import { Config } from '.';

export function mergeArguments(args1: InputValueDefinitionNode[], args2: InputValueDefinitionNode[], config: Config): InputValueDefinitionNode[] {
  const result = deduplicateArguments([].concat(args2, args1).filter(a => a));
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

function deduplicateArguments(args: ReadonlyArray<InputValueDefinitionNode>): InputValueDefinitionNode[] {
  return args.reduce<InputValueDefinitionNode[]>((acc, current) => {
    const dup = acc.find(arg => arg.name.value === current.name.value);

    if (!dup) {
      return acc.concat([current]);
    }

    return acc;
  }, []);
}
