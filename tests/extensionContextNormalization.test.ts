import {describe, expect, it} from 'vitest';
import {normalizeHubContextSnapshot, resolveSessionFromHubContextSnapshot} from '../src/extension/contextNormalization';
import type {HubContextSnapshot} from '../src/types';

const location = (overrides: Partial<{pathname: string; search: string; hash: string; hostname: string}> = {}) => ({
  pathname: '/organizations/my-org',
  search: '',
  hash: '#/my-org/merchandising-hub',
  hostname: 'platform.cloud.coveo.com',
  ...overrides,
});

const baseSnapshot = (overrides: Partial<HubContextSnapshot> = {}): HubContextSnapshot => ({
  organizationId: 'my-org',
  accessToken: 'token-123',
  platformUrl: 'https://platform.cloud.coveo.com',
  contextScope: 'organization',
  propertyContextVerified: false,
  ...overrides,
});

describe('extension context normalization', () => {
  it('drops stale property fields on organization overview pages and auto-picks the first candidate tracking ID', () => {
    const snapshot = baseSnapshot({
      trackingId: 'stale-property',
      trackingIds: ['storefront-a', 'storefront-b'],
      propertyName: 'Stale property',
    });

    const normalized = normalizeHubContextSnapshot(snapshot, location());
    const session = resolveSessionFromHubContextSnapshot(snapshot, location());

    expect(normalized.contextScope).toBe('organization');
    expect(normalized.explicitPropertyContext).toBe(false);
    expect(normalized.propertyName).toBeUndefined();
    expect(normalized.candidateTrackingIds).toEqual(['storefront-a', 'storefront-b', 'stale-property']);
    expect(session?.trackingId).toBe('storefront-a');
  });

  it('prefers explicit current-page property context over stale stored tracking state', () => {
    const snapshot = baseSnapshot({
      trackingId: 'fresh-property',
      trackingIds: ['stale-property', 'fresh-property'],
      propertyName: 'Fresh property',
      contextScope: 'property',
      propertyContextVerified: true,
      trackingIdSource: 'request',
      propertyNameSource: 'dom',
    });

    const session = resolveSessionFromHubContextSnapshot(
      snapshot,
      location({search: '?trackingId=route-property'}),
    );

    expect(session?.trackingId).toBe('route-property');
    expect(session?.trackingIds).toEqual(['route-property', 'fresh-property', 'stale-property']);
  });

  it('clears stale property metadata when the organization changes', () => {
    const snapshot = baseSnapshot({
      organizationId: 'old-org',
      trackingId: 'old-property',
      trackingIds: ['old-property'],
      propertyName: 'Old property',
      contextScope: 'property',
      propertyContextVerified: true,
    });

    const normalized = normalizeHubContextSnapshot(snapshot, location({pathname: '/organizations/new-org', hash: '#/new-org'}));
    const session = resolveSessionFromHubContextSnapshot(snapshot, location({pathname: '/organizations/new-org', hash: '#/new-org'}));

    expect(normalized.organizationId).toBe('new-org');
    expect(normalized.propertyName).toBeUndefined();
    expect(normalized.candidateTrackingIds).toEqual([]);
    expect(session).toBeNull();
  });

  it('returns no session when the current page provides no trustworthy tracking ID candidates', () => {
    const snapshot = baseSnapshot();

    expect(resolveSessionFromHubContextSnapshot(snapshot, location())).toBeNull();
  });

  it('auto-picks the first current candidate tracking ID when no explicit property tracking ID is proven', () => {
    const snapshot = baseSnapshot({
      trackingIds: ['alpha', 'beta'],
    });

    const session = resolveSessionFromHubContextSnapshot(snapshot, location());

    expect(session?.trackingId).toBe('alpha');
    expect(session?.trackingIds).toEqual(['alpha', 'beta']);
  });
});
