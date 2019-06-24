import { Config } from './merge-typedefs';
import { FieldDefinitionNode, InputValueDefinitionNode, TypeNode, NameNode } from 'graphql';
import { extractType, isWrappingTypeNode, isListTypeNode, isNonNullTypeNode, printTypeNode } from './utils';
import { mergeDirectives } from './directives';
import { isNotEqual } from '../../utils/helpers';

function fieldAlreadyExists(fieldsArr: ReadonlyArray<any>, otherField: any): boolean {
  const result: FieldDefinitionNode | null = fieldsArr.find(field => field.name.value === otherField.name.value);

  if (result) {
    const t1 = extractType(result.type);
    const t2 = extractType(otherField.type);

    if (t1.name.value !== t2.name.value) {
      throw new Error(`Field "${otherField.name.value}" already defined with a different type. Declared as "${t1.name.value}", but you tried to override with "${t2.name.value}"`);
    }
  }

  return !!result;
}

export function mergeFields<T extends FieldDefinitionNode | InputValueDefinitionNode>(type: { name: NameNode }, f1: ReadonlyArray<T>, f2: ReadonlyArray<T>, config?: Config): T[] {
  const result: T[] = [...f2];

  for (const field of f1) {
    if (fieldAlreadyExists(result, field)) {
      const existing: any = result.find((f: any) => f.name.value === (field as any).name.value);

      if (config && config.throwOnConflict) {
        preventConflicts(type, existing, field);
      }

      existing['directives'] = mergeDirectives(field['directives'], existing['directives'], config);
    } else {
      result.push(field);
    }
  }

  return result;
}

function preventConflicts(type: { name: NameNode }, a: FieldDefinitionNode | InputValueDefinitionNode, b: FieldDefinitionNode | InputValueDefinitionNode) {
  const aType = printTypeNode(a.type);
  const bType = printTypeNode(b.type);

  if (isNotEqual(aType, bType)) {
    if (safeChangeForFieldType(a.type, b.type) === false) {
      throw new Error(`Field '${type.name.value}.${a.name.value}' changed type from '${aType}' to '${bType}'`);
    }
  }
}

function safeChangeForFieldType(oldType: TypeNode, newType: TypeNode): boolean {
  // both are named
  if (!isWrappingTypeNode(oldType) && !isWrappingTypeNode(newType)) {
    return oldType.toString() === newType.toString();
  }

  // new is non-null
  if (isNonNullTypeNode(newType)) {
    // I don't think it's a breaking change but `merge-graphql-schemas` needs it...
    if (!isNonNullTypeNode(oldType)) {
      return false;
    }

    const ofType = isNonNullTypeNode(oldType) ? oldType.type : oldType;

    return safeChangeForFieldType(ofType, newType.type);
  }

  // old is list
  if (isListTypeNode(oldType)) {
    return (isListTypeNode(newType) && safeChangeForFieldType(oldType.type, newType.type)) || (isNonNullTypeNode(newType) && safeChangeForFieldType(oldType, newType.type));
  }

  return false;
}
