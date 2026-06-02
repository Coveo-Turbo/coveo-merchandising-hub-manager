import {describe, expect, it} from 'vitest';
import {buildContextMappingsSyncPlan, validateContextMappings} from '../src/features/context-mappings/contextMappingsSync';
import type {ContextMappingsDataShape} from '../src/types';

describe('contextMappingsSync', () => {
  it('builds create, update, and delete operations from the list response shape', () => {
    const currentMappings: ContextMappingsDataShape = [
      {key: 'fitmentProducts', type: 'PRODUCT_LIST', destinations: [{attribute: 'QUERY_PIPELINE_CONTEXT'}]},
      {key: 'storeId', type: 'STRING', destinations: [{attribute: 'ML_CONTEXT'}]},
    ];
    const nextMappings: ContextMappingsDataShape = [
      {key: 'fitmentProducts', type: 'PRODUCT_LIST', destinations: [{attribute: 'QUERY_PIPELINE_CONTEXT'}]},
      {
        key: 'storeId',
        type: 'STRING',
        destinations: [{attribute: 'FIELD_ALIASES', fieldAlias: 'price_dict', fieldSource: 'price_dict.{{contextValue}}'}],
      },
      {key: 'shoppingIntent', type: 'STRING', destinations: [{attribute: 'ML_CONTEXT'}]},
    ];

    expect(buildContextMappingsSyncPlan(currentMappings, nextMappings)).toEqual([
      {
        type: 'update',
        key: 'storeId',
        mapping: {
          key: 'storeId',
          type: 'STRING',
          destinations: [
            {attribute: 'FIELD_ALIASES', fieldAlias: 'price_dict', fieldSource: 'price_dict.{{contextValue}}'},
          ],
        },
      },
      {
        type: 'create',
        mapping: {key: 'shoppingIntent', type: 'STRING', destinations: [{attribute: 'ML_CONTEXT'}]},
      },
    ]);

    expect(
      buildContextMappingsSyncPlan(nextMappings, [
        {key: 'shoppingIntent', type: 'STRING', destinations: [{attribute: 'ML_CONTEXT'}]},
      ]),
    ).toEqual([
      {type: 'delete', key: 'fitmentProducts'},
      {type: 'delete', key: 'storeId'},
    ]);
  });

  it('validates FIELD_ALIASES requirements and array payloads', () => {
    expect(validateContextMappings([])).toBeNull();
    expect(validateContextMappings({mappings: []})).toBe('Context mappings JSON must be an array.');
    expect(
      validateContextMappings([
        {
          key: 'storeId',
          type: 'STRING',
          destinations: [{attribute: 'FIELD_ALIASES', fieldAlias: 'price_dict'}],
        },
      ]),
    ).toBe('Mapping "storeId" is missing fieldAlias or fieldSource for FIELD_ALIASES destinations.');
  });
});
