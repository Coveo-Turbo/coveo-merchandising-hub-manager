import type {ContextMappingDefinition, ContextMappingsDataShape} from '../../types';

export type ContextMappingSyncOperation =
  | {type: 'create'; mapping: ContextMappingDefinition}
  | {type: 'update'; key: string; mapping: ContextMappingDefinition}
  | {type: 'delete'; key: string};

const hasText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export const validateContextMappings = (value: unknown) => {
  if (!Array.isArray(value)) {
    return 'Context mappings JSON must be an array.';
  }

  const keys = new Set<string>();

  for (const [index, mapping] of value.entries()) {
    if (!mapping || Array.isArray(mapping) || typeof mapping !== 'object') {
      return `Mapping at index ${index} must be an object.`;
    }

    const key = hasText(mapping.key) ? mapping.key.trim() : '';
    if (!key) {
      return `Mapping at index ${index} is missing a key.`;
    }

    if (keys.has(key)) {
      return `Duplicate mapping key: ${key}.`;
    }
    keys.add(key);

    const destinations = Array.isArray(mapping.destinations) ? mapping.destinations : [];
    for (const destination of destinations) {
      if (
        destination &&
        !Array.isArray(destination) &&
        typeof destination === 'object' &&
        destination.attribute === 'FIELD_ALIASES' &&
        (!hasText(destination.fieldAlias) || !hasText(destination.fieldSource))
      ) {
        return `Mapping "${key}" is missing fieldAlias or fieldSource for FIELD_ALIASES destinations.`;
      }
    }
  }

  return null;
};

export const buildContextMappingsSyncPlan = (
  currentMappings: ContextMappingsDataShape,
  nextMappings: ContextMappingsDataShape,
): ContextMappingSyncOperation[] => {
  const operations: ContextMappingSyncOperation[] = [];
  const currentByKey = new Map(currentMappings.map((mapping) => [mapping.key?.trim(), mapping] as const));
  const nextByKey = new Map(nextMappings.map((mapping) => [mapping.key?.trim(), mapping] as const));

  for (const mapping of nextMappings) {
    const key = mapping.key?.trim();
    if (!key) {
      continue;
    }

    const currentMapping = currentByKey.get(key);
    if (!currentMapping) {
      operations.push({type: 'create', mapping});
      continue;
    }

    if (JSON.stringify(currentMapping) !== JSON.stringify(mapping)) {
      operations.push({type: 'update', key, mapping});
    }
  }

  for (const mapping of currentMappings) {
    const key = mapping.key?.trim();
    if (key && !nextByKey.has(key)) {
      operations.push({type: 'delete', key});
    }
  }

  return operations;
};
