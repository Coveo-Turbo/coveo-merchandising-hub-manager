import {act, renderHook, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useManagerController} from '../src/hooks/useManagerController';
import type {SessionContext} from '../src/types';

const {mockGetGlobalQueryConfig, mockCreateGlobalQueryConfig, mockUpdateGlobalQueryConfig} = vi.hoisted(() => ({
  mockGetGlobalQueryConfig: vi.fn(),
  mockCreateGlobalQueryConfig: vi.fn(),
  mockUpdateGlobalQueryConfig: vi.fn(),
}));

vi.mock('../src/services/coveoApi', () => ({
  bulkCreateListings: vi.fn(),
  bulkCreateRankingRules: vi.fn(),
  bulkDeleteListings: vi.fn(),
  bulkUpdateListings: vi.fn(),
  createContextMapping: vi.fn(),
  createGlobalProductSuggestConfig: vi.fn(),
  createGlobalQueryConfig: mockCreateGlobalQueryConfig,
  deleteContextMapping: vi.fn(),
  fetchAllListings: vi.fn(),
  fetchAllRules: vi.fn(),
  fetchTrackingIdsFromCatalogMappings: vi.fn(),
  getContextMappings: vi.fn(),
  getGlobalProductSuggestConfig: vi.fn(),
  getGlobalQueryConfig: mockGetGlobalQueryConfig,
  updateContextMapping: vi.fn(),
  updateGlobalProductSuggestConfig: vi.fn(),
  updateGlobalQueryConfig: mockUpdateGlobalQueryConfig,
}));

vi.mock('../src/services/geminiService', () => ({
  enhanceListingWithAI: vi.fn(),
}));

vi.mock('../src/services/commerceTroubleshootConsoleService', () => ({
  deployCommerceTroubleshootConsole: vi.fn(),
}));

const session: SessionContext = {
  organizationId: 'my-org',
  trackingId: 'storefront',
  trackingIds: ['storefront'],
  accessToken: 'token-123',
  platformUrl: 'https://platform.cloud.coveo.com',
  source: 'manual',
};

describe('useManagerController global config saves', () => {
  beforeEach(() => {
    mockGetGlobalQueryConfig.mockReset();
    mockCreateGlobalQueryConfig.mockReset();
    mockUpdateGlobalQueryConfig.mockReset();
  });

  it('creates a query configuration on first save when no global config exists yet', async () => {
    const notFoundError = Object.assign(new Error('Not found'), {status: 404});
    mockGetGlobalQueryConfig.mockRejectedValue(notFoundError);
    mockCreateGlobalQueryConfig.mockResolvedValue({
      trackingId: 'storefront',
      solutionType: 'search',
      isGlobal: true,
      configurationModel: {perPage: 24, additionalFields: [], sorts: []},
    });

    const {result} = renderHook(() =>
      useManagerController({
        runtime: 'standalone',
        transport: {request: vi.fn()},
        contextResolver: {
          resolve: vi.fn().mockResolvedValue(null),
          refresh: vi.fn().mockResolvedValue(session),
          disconnect: vi.fn(),
        },
      }),
    );

    await act(async () => {
      await result.current.refreshResolvedContext();
    });

    await waitFor(() => expect(result.current.session?.trackingId).toBe('storefront'));

    await act(async () => {
      await result.current.fetchGlobalConfig();
    });

    await act(async () => {
      await result.current.saveGlobalConfig();
    });

    expect(mockCreateGlobalQueryConfig).toHaveBeenCalledTimes(1);
    expect(mockUpdateGlobalQueryConfig).not.toHaveBeenCalled();
  });

  it('updates the query configuration after an existing global config has been loaded', async () => {
    mockGetGlobalQueryConfig.mockResolvedValue({
      trackingId: 'storefront',
      solutionType: 'search',
      isGlobal: true,
      configurationModel: {perPage: 24, additionalFields: ['ec_brand'], sorts: [{sortCriteria: 'relevance'}]},
    });
    mockUpdateGlobalQueryConfig.mockResolvedValue({
      trackingId: 'storefront',
      solutionType: 'search',
      isGlobal: true,
      configurationModel: {perPage: 24, additionalFields: ['ec_brand'], sorts: [{sortCriteria: 'relevance'}]},
    });

    const {result} = renderHook(() =>
      useManagerController({
        runtime: 'standalone',
        transport: {request: vi.fn()},
        contextResolver: {
          resolve: vi.fn().mockResolvedValue(null),
          refresh: vi.fn().mockResolvedValue(session),
          disconnect: vi.fn(),
        },
      }),
    );

    await act(async () => {
      await result.current.refreshResolvedContext();
    });

    await waitFor(() => expect(result.current.session?.trackingId).toBe('storefront'));

    await act(async () => {
      await result.current.fetchGlobalConfig();
    });

    await act(async () => {
      await result.current.saveGlobalConfig();
    });

    expect(mockUpdateGlobalQueryConfig).toHaveBeenCalledTimes(1);
    expect(mockCreateGlobalQueryConfig).not.toHaveBeenCalled();
  });
});
