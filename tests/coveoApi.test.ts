import {describe, expect, it, vi} from 'vitest';
import {getContextMappings, updateContextMappings} from '../src/services/coveoApi';
import type {ApiTransport} from '../src/core/contracts';
import type {SessionContext} from '../src/types';

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
    const request = vi.fn().mockResolvedValue({
      ok: true,
      body: JSON.stringify({
        mappings: [{key: 'language', type: 'STRING', destinations: [{attribute: 'QUERY_PIPELINE_CONTEXT'}]}],
      }),
    });
    const transport: ApiTransport = {request};

    await expect(getContextMappings(session, transport)).resolves.toEqual({
      mappings: [{key: 'language', type: 'STRING', destinations: [{attribute: 'QUERY_PIPELINE_CONTEXT'}]}],
    });

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

  it('updates context mappings with a PUT request', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      body: JSON.stringify({
        mappings: [{key: 'device', type: 'STRING', destinations: [{attribute: 'ML_CONTEXT'}]}],
      }),
    });
    const transport: ApiTransport = {request};
    const payload = {mappings: [{key: 'device', type: 'STRING', destinations: [{attribute: 'ML_CONTEXT'}]}]};

    await expect(updateContextMappings(session, payload, transport)).resolves.toEqual(payload);

    const updateArgs = request.mock.calls[0][0];
    expect(updateArgs.url).toBe(
      'https://platform.cloud.coveo.com/rest/organizations/my-org/commerce/v2/tracking-ids/storefront/context-mappings',
    );
    expect(updateArgs.method).toBe('PUT');
    expect(updateArgs.body).toBe(JSON.stringify(payload));
    expect(updateArgs.cache).toBeUndefined();
    expect(updateArgs.headers.Accept).toBe('application/json');
    expect(updateArgs.headers.Authorization).toMatch(/^Bearer\s+/);
    expect(updateArgs.headers['Content-Type']).toBe('application/json');
  });
});
