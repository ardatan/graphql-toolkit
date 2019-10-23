import { InputValueDefinitionNode } from 'graphql';

export function mergeArguments(args1: InputValueDefinitionNode[], args2: InputValueDefinitionNode[]): InputValueDefinitionNode[] {
  return deduplicateArguments([].concat(args2, args1).filter(a => a));
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
