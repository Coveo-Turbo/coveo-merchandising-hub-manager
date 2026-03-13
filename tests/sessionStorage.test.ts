import {beforeEach, describe, expect, it} from 'vitest';
import {createBrowserSessionStore, createStoredContextResolver} from '../src/core/sessionStorage';
import type {SessionContext} from '../src/types';

const session: SessionContext = {
  organizationId: 'my-org',
  organizationName: 'My Org',
  trackingId: 'storefront',
  trackingIds: ['storefront', 'catalog'],
  propertyName: 'Main storefront',
  locale: 'en-US',
  accessToken: 'token-123',
  platformUrl: 'https://platform.cloud.coveo.com',
  source: 'manual',
};

describe('browser session store', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('persists and restores a session context', async () => {
    const store = createBrowserSessionStore();
    await store.save(session);

    await expect(store.load()).resolves.toEqual(session);
  });

  it('clears the stored session via the resolver disconnect contract', async () => {
    const store = createBrowserSessionStore();
    const resolver = createStoredContextResolver(store);
    await store.save(session);

    await resolver.disconnect();

    await expect(resolver.resolve()).resolves.toBeNull();
  });
});
