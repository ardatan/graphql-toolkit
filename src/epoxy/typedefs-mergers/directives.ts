import { ArgumentNode, DirectiveNode } from 'graphql/language/ast';
import { DirectiveDefinitionNode, ListValueNode, NameNode, print } from 'graphql';

function directiveAlreadyExists(directivesArr: ReadonlyArray<DirectiveNode>, otherDirective: DirectiveNode): boolean {
  return !!directivesArr.find(directive => directive.name.value === otherDirective.name.value);
}

function nameAlreadyExists(name: NameNode, namesArr: ReadonlyArray<NameNode>): boolean {
  return namesArr.some(({ value }) => value === name.value);
}

function mergeArguments(a1: ArgumentNode[], a2: ArgumentNode[]): ArgumentNode[] {
  const result: ArgumentNode[] = [...a2];

  for (const argument of a1) {
    const existingIndex = result.findIndex(a => a.name.value === argument.name.value);

    if (existingIndex > -1) {
      const existingArg = result[existingIndex];

      if (existingArg.value.kind === 'ListValue') {
        const source = (existingArg.value as any).values;
        const target = (argument.value as ListValueNode).values;

        // merge values of two lists
        (existingArg.value as any).values = deduplicateLists(source, target, (targetVal, source) => {
          const value = (targetVal as any).value;
          return !value || !source.some((sourceVal: any) => sourceVal.value === value);
        });
      } else {
        (existingArg as any).value = argument.value;
      }
    } else {
      result.push(argument);
    }
  }

  return result;
}

export function mergeDirectives(d1: ReadonlyArray<DirectiveNode>, d2: ReadonlyArray<DirectiveNode>): DirectiveNode[] {
  const result = [...d2];

  for (const directive of d1) {
    if (directiveAlreadyExists(result, directive)) {
      const existingDirectiveIndex = result.findIndex(d => d.name.value === directive.name.value);
      const existingDirective = result[existingDirectiveIndex];
      (result[existingDirectiveIndex] as any).arguments = mergeArguments(existingDirective.arguments as any, directive.arguments as any);
    } else {
      result.push(directive);
    }
  }

  return result;
}

function validateInputs(node: DirectiveDefinitionNode, existingNode: DirectiveDefinitionNode): void | never {
  const printedNode = print(node);
  const printedExistingNode = print(existingNode);
  const leaveInputs = new RegExp('(directive @w*d*)|( on .*$)', 'g');
  const sameArguments = printedNode.replace(leaveInputs, '') === printedExistingNode.replace(leaveInputs, '');

  if (!sameArguments) {
    throw new Error(`Unable to merge GraphQL directive "${node.name.value}". \nExisting directive:  \n\t${printedExistingNode} \nReceived directive: \n\t${printedNode}`);
  }
}

export function mergeDirective(node: DirectiveDefinitionNode, existingNode?: DirectiveDefinitionNode): DirectiveDefinitionNode {
  if (existingNode) {
    validateInputs(node, existingNode);

    return {
      ...node,
      locations: [...existingNode.locations, ...node.locations.filter(name => !nameAlreadyExists(name, existingNode.locations))],
    };
  }

  return node;
}

function deduplicateLists<T>(source: readonly T[], target: readonly T[], filterFn: (val: T, source: readonly T[]) => boolean): T[] {
  return source.concat(target.filter(val => filterFn(val, source)));
}
