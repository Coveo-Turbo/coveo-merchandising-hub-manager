import {describe, expect, it, vi} from 'vitest';
import {
  createContextMapping,
  createGlobalQueryConfig,
  deleteContextMapping,
  getContextMappings,
  getGlobalQueryConfig,
  updateContextMapping,
  updateGlobalQueryConfig,
} from '../src/services/coveoApi';
import type {ApiTransport} from '../src/core/contracts';
import type {
  CommerceQueryConfigurationRequestModel,
  ContextMappingDefinition,
  SessionContext,
} from '../src/types';

const session: SessionContext = {
  organizationId: 'my-org',
  trackingId: 'storefront',
  trackingIds: ['storefront'],
  accessToken: 'token-123',
  platformUrl: 'https://platform.cloud.coveo.com',
  source: 'manual',
};

describe('coveoApi context mappings', () => {
  it('fetches context mappings for the active organization and tracking ID', async () => {
    const payload: ContextMappingDefinition[] = [
      {key: 'language', type: 'STRING', destinations: [{attribute: 'QUERY_PIPELINE_CONTEXT'}]},
    ];
    const request = vi.fn().mockResolvedValue({
      ok: true,
      body: JSON.stringify(payload),
    });
    const transport: ApiTransport = {request};

    await expect(getContextMappings(session, transport)).resolves.toEqual(payload);

    const fetchArgs = request.mock.calls[0][0];
    expect(fetchArgs.url).toBe(
      'https://platform.cloud.coveo.com/rest/organizations/my-org/commerce/v2/tracking-ids/storefront/context-mappings',
    );
    expect(fetchArgs.method).toBeUndefined();
    expect(fetchArgs.body).toBeUndefined();
    expect(fetchArgs.cache).toBe('no-store');
    expect(fetchArgs.headers.Accept).toBe('application/json');
    expect(fetchArgs.headers.Authorization).toMatch(/^Bearer\s+/);
  });

  it('creates context mappings with a POST request', async () => {
    const payload: ContextMappingDefinition = {
      key: 'device',
      type: 'STRING',
      destinations: [{attribute: 'ML_CONTEXT'}],
    };
    const request = vi.fn().mockResolvedValue({
      ok: true,
      body: JSON.stringify(payload),
    });
    const transport: ApiTransport = {request};

    await expect(createContextMapping(session, payload, transport)).resolves.toEqual(payload);

    const createArgs = request.mock.calls[0][0];
    expect(createArgs.url).toBe(
      'https://platform.cloud.coveo.com/rest/organizations/my-org/commerce/v2/tracking-ids/storefront/context-mappings',
    );
    expect(createArgs.method).toBe('POST');
    expect(createArgs.body).toBe(JSON.stringify(payload));
    expect(createArgs.headers['Content-Type']).toBe('application/json');
  });

  it('updates context mappings with a PUT request by key', async () => {
    const payload: ContextMappingDefinition = {
      key: 'device',
      type: 'STRING',
      destinations: [{attribute: 'ML_CONTEXT'}],
    };
    const request = vi.fn().mockResolvedValue({
      ok: true,
      body: JSON.stringify(payload),
    });
    const transport: ApiTransport = {request};

    await expect(updateContextMapping(session, 'device', payload, transport)).resolves.toEqual(payload);

    const updateArgs = request.mock.calls[0][0];
    expect(updateArgs.url).toBe(
      'https://platform.cloud.coveo.com/rest/organizations/my-org/commerce/v2/tracking-ids/storefront/context-mappings/device',
    );
    expect(updateArgs.method).toBe('PUT');
    expect(updateArgs.body).toBe(JSON.stringify(payload));
    expect(updateArgs.headers['Content-Type']).toBe('application/json');
  });

  it('deletes context mappings with a DELETE request by key', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      body: '',
    });
    const transport: ApiTransport = {request};

    await expect(deleteContextMapping(session, 'device', transport)).resolves.toEqual({});

    const deleteArgs = request.mock.calls[0][0];
    expect(deleteArgs.url).toBe(
      'https://platform.cloud.coveo.com/rest/organizations/my-org/commerce/v2/tracking-ids/storefront/context-mappings/device',
    );
    expect(deleteArgs.method).toBe('DELETE');
    expect(deleteArgs.body).toBeUndefined();
  });
});

describe('coveoApi query configurations', () => {
  it('fetches the global query configuration for a solution through the unified endpoint', async () => {
    const queryConfig = {
      trackingId: 'storefront',
      solutionType: 'search',
      isGlobal: true,
      configurationModel: {
        perPage: 24,
        additionalFields: ['ec_brand'],
        sorts: [{sortCriteria: 'relevance'}],
      },
    };
    const request = vi.fn().mockResolvedValue({
      ok: true,
      body: JSON.stringify({items: [queryConfig]}),
    });
    const transport: ApiTransport = {request};

    await expect(getGlobalQueryConfig(session, 'search', transport)).resolves.toEqual(queryConfig);

    const fetchArgs = request.mock.calls[0][0];
    expect(fetchArgs.url).toBe(
      'https://platform.cloud.coveo.com/rest/organizations/my-org/commerce/v2/configurations/query?trackingId=storefront&solutionType=search&isGlobal=true',
    );
    expect(fetchArgs.method).toBeUndefined();
    expect(fetchArgs.body).toBeUndefined();
  });

  it('treats a plain GET response object as the configuration model for the active solution', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      body: JSON.stringify({
        additionalFields: ['ec_name'],
        facets: {
          enableIndexFacetOrdering: true,
          freezeFacetOrder: false,
          facets: [],
        },
        perPage: 12,
        sorts: [{sortCriteria: 'relevance'}],
        grouping: {type: 'none'},
      }),
    });
    const transport: ApiTransport = {request};

    await expect(getGlobalQueryConfig(session, 'search', transport)).resolves.toEqual({
      trackingId: 'storefront',
      solutionType: 'search',
      isGlobal: true,
      configurationModel: {
        additionalFields: ['ec_name'],
        facets: {
          enableIndexFacetOrdering: true,
          freezeFacetOrder: false,
          facets: [],
        },
        perPage: 12,
        sorts: [{sortCriteria: 'relevance'}],
        grouping: {type: 'none'},
      },
    });
  });

  it('creates the first global query configuration with POST', async () => {
    const payload: CommerceQueryConfigurationRequestModel = {
      trackingId: 'storefront',
      solutionType: 'listing',
      isGlobal: true,
      configurationModel: {
        perPage: 24,
        additionalFields: ['ec_brand'],
        sorts: [{sortCriteria: 'relevance'}],
      },
    };
    const request = vi.fn().mockResolvedValue({
      ok: true,
      body: JSON.stringify(payload),
    });
    const transport: ApiTransport = {request};

    await expect(createGlobalQueryConfig(session, payload, transport)).resolves.toEqual(payload);

    const createArgs = request.mock.calls[0][0];
    expect(createArgs.url).toBe('https://platform.cloud.coveo.com/rest/organizations/my-org/commerce/v2/configurations/query');
    expect(createArgs.method).toBe('POST');
    expect(createArgs.body).toBe(JSON.stringify(payload));
    expect(createArgs.headers['Content-Type']).toBe('application/json');
  });

  it('normalizes a create response that returns configuration instead of configurationModel', async () => {
    const payload: CommerceQueryConfigurationRequestModel = {
      trackingId: 'storefront',
      solutionType: 'listing',
      isGlobal: true,
      configurationModel: {
        perPage: 24,
        additionalFields: ['ec_brand'],
        sorts: [{sortCriteria: 'relevance'}],
      },
    };
    const request = vi.fn().mockResolvedValue({
      ok: true,
      body: JSON.stringify({
        id: 'query-config-2',
        trackingId: 'storefront',
        solutionType: 'listing',
        isGlobal: true,
        configuration: {
          perPage: 36,
          additionalFields: ['ec_brand'],
          sorts: [{sortCriteria: 'relevance'}],
        },
      }),
    });
    const transport: ApiTransport = {request};

    await expect(createGlobalQueryConfig(session, payload, transport)).resolves.toEqual({
      id: 'query-config-2',
      trackingId: 'storefront',
      solutionType: 'listing',
      isGlobal: true,
      configurationModel: {
        perPage: 36,
        additionalFields: ['ec_brand'],
        sorts: [{sortCriteria: 'relevance'}],
      },
    });
  });

  it('normalizes a create response that returns the raw configuration object', async () => {
    const payload: CommerceQueryConfigurationRequestModel = {
      trackingId: 'storefront',
      solutionType: 'listing',
      isGlobal: true,
      configurationModel: {
        perPage: 24,
        additionalFields: ['ec_brand'],
        sorts: [{sortCriteria: 'relevance'}],
      },
    };
    const request = vi.fn().mockResolvedValue({
      ok: true,
      body: JSON.stringify({
        perPage: 36,
        additionalFields: ['ec_name'],
        sorts: [{sortCriteria: 'relevance'}],
      }),
    });
    const transport: ApiTransport = {request};

    await expect(createGlobalQueryConfig(session, payload, transport)).resolves.toEqual({
      trackingId: 'storefront',
      solutionType: 'listing',
      isGlobal: true,
      configurationModel: {
        perPage: 36,
        additionalFields: ['ec_name'],
        sorts: [{sortCriteria: 'relevance'}],
      },
    });
  });

  it('updates an existing global query configuration with PUT', async () => {
    const payload: CommerceQueryConfigurationRequestModel = {
      trackingId: 'storefront',
      solutionType: 'recommendation',
      isGlobal: true,
      configurationModel: {
        perPage: 5,
        additionalFields: ['ec_brand'],
      },
    };
    const request = vi.fn().mockResolvedValue({
      ok: true,
      body: JSON.stringify(payload),
    });
    const transport: ApiTransport = {request};

    await expect(updateGlobalQueryConfig(session, payload, transport)).resolves.toEqual(payload);

    const updateArgs = request.mock.calls[0][0];
    expect(updateArgs.url).toBe('https://platform.cloud.coveo.com/rest/organizations/my-org/commerce/v2/configurations/query');
    expect(updateArgs.method).toBe('PUT');
    expect(updateArgs.body).toBe(JSON.stringify(payload));
    expect(updateArgs.headers['Content-Type']).toBe('application/json');
  });
});
