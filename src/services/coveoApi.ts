import type {ApiTransport} from '../core/contracts';
import {createBrowserApiTransport} from '../core/apiTransport';
import type {
  BulkCreateRulesResult,
  CommerceQueryConfigurationRequestModel,
  CommerceQueryConfigurationResponseModel,
  CommercePageModelPublicListingPageResponseModel,
  ContextMappingsDataShape,
  DetailedListingPageResponseModel,
  GlobalConfigDataShape,
  JsonObject,
  MerchandisingHubRulePayload,
  PublicListingPageRequestModel,
  PublicListingPageResponseModel,
  QueryConfigSolutionType,
  RankingRuleModel,
  SessionContext,
} from '../types';

const MAX_TRACKING_MAPPING_DEPTH = 6;

const getBaseUrl = (session: SessionContext) => session.platformUrl.replace(/\/$/, '');

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const ensureTransport = (transport?: ApiTransport) => transport ?? createBrowserApiTransport();

const extractErrorMessage = (rawBody: string) => {
  try {
    const parsed = JSON.parse(rawBody) as {message?: string; type?: string};
    if (parsed.message && parsed.type) {
      return `${parsed.type}: ${parsed.message}`;
    }
    if (parsed.message) {
      return parsed.message;
    }
  } catch {
    return rawBody || 'Unknown error';
  }

  return rawBody || 'Unknown error';
};

const requestText = async (
  session: SessionContext,
  path: string,
  init: {
    transport?: ApiTransport;
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: string;
    headers?: Record<string, string>;
    cache?: RequestCache;
  } = {},
) => {
  const transport = ensureTransport(init.transport);
  const response = await transport.request({
    url: `${getBaseUrl(session)}${path}`,
    method: init.method,
    body: init.body,
    cache: init.cache,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      Accept: 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    const error = new Error(extractErrorMessage(response.body)) as Error & {status?: number};
    error.status = response.status;
    throw error;
  }

  return response.body;
};

const requestJson = async <T>(
  session: SessionContext,
  path: string,
  init: {
    transport?: ApiTransport;
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: string;
    headers?: Record<string, string>;
    cache?: RequestCache;
  } = {},
): Promise<T> => {
  const body = await requestText(session, path, init);
  return body ? (JSON.parse(body) as T) : ({} as T);
};

const collectTrackingIds = (payload: unknown, trackingIds: Set<string>, depth = 0) => {
  if (depth > MAX_TRACKING_MAPPING_DEPTH || payload === null || payload === undefined) {
    return;
  }

  if (Array.isArray(payload)) {
    payload.forEach((entry) => collectTrackingIds(entry, trackingIds, depth + 1));
    return;
  }

  if (!isRecord(payload)) {
    return;
  }

  const directTrackingIdCandidates = [payload.trackingId, payload.trackingID];
  for (const candidate of directTrackingIdCandidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      trackingIds.add(candidate.trim());
    }
  }

  Object.values(payload).forEach((value) => {
    if (Array.isArray(value) || isRecord(value)) {
      collectTrackingIds(value, trackingIds, depth + 1);
    }
  });
};

const postJson = <T>(
  session: SessionContext,
  path: string,
  body: unknown,
  transport?: ApiTransport,
  method: 'POST' | 'PUT' = 'POST',
) =>
  requestJson<T>(session, path, {
    transport,
    method,
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'},
  });

const deleteJson = <T>(session: SessionContext, path: string, transport?: ApiTransport) =>
  requestJson<T>(session, path, {
    transport,
    method: 'DELETE',
  });

const getContextMappingsBasePath = (session: SessionContext) =>
  `/rest/organizations/${session.organizationId}/commerce/v2/tracking-ids/${encodeURIComponent(
    session.trackingId,
  )}/context-mappings`;

const getGlobalQueryConfigPath = (session: SessionContext, solutionType: QueryConfigSolutionType) =>
  `/rest/organizations/${session.organizationId}/commerce/v2/configurations/query?trackingId=${encodeURIComponent(
    session.trackingId,
  )}&solutionType=${encodeURIComponent(solutionType)}&isGlobal=true`;

const isQueryConfigurationResponseModel = (value: unknown): value is CommerceQueryConfigurationResponseModel =>
  isRecord(value) &&
  typeof value.trackingId === 'string' &&
  typeof value.solutionType === 'string' &&
  value.isGlobal === true &&
  isRecord(value.configurationModel);

const normalizeGlobalQueryConfigResponse = (payload: unknown): CommerceQueryConfigurationResponseModel | null => {
  if (isQueryConfigurationResponseModel(payload)) {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.find(isQueryConfigurationResponseModel) ?? null;
  }

  if (!isRecord(payload)) {
    return null;
  }

  const collection = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.configurations)
      ? payload.configurations
      : null;

  return collection?.find(isQueryConfigurationResponseModel) ?? null;
};

export interface RankingRulesResponse {
  page: number;
  perPage: number;
  totalCount: number;
  items: RankingRuleModel[];
}

export const fetchTrackingIdsFromCatalogMappings = async (
  session: SessionContext,
  transport?: ApiTransport,
): Promise<string[]> => {
  const payload = await requestJson<unknown>(
    session,
    `/rest/organizations/${session.organizationId}/trackingidcatalogmappings`,
    {transport, cache: 'no-store'},
  );

  const trackingIds = new Set<string>();
  collectTrackingIds(payload, trackingIds);
  return [...trackingIds].sort((left, right) => left.localeCompare(right));
};

const chunkArray = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

export const bulkCreateListings = async (
  session: SessionContext,
  listings: PublicListingPageRequestModel[],
  transport?: ApiTransport,
) => {
  const results: unknown[] = [];
  for (const chunk of chunkArray(listings, 50)) {
    results.push(
      await postJson<unknown>(
        session,
        `/rest/organizations/${session.organizationId}/commerce/v2/listings/pages/bulk-create`,
        chunk,
        transport,
      ),
    );
  }
  return results;
};

export const bulkUpdateListings = async (
  session: SessionContext,
  listings: PublicListingPageRequestModel[],
  transport?: ApiTransport,
) => {
  const results: unknown[] = [];
  for (const chunk of chunkArray(listings, 50)) {
    results.push(
      await postJson<unknown>(
        session,
        `/rest/organizations/${session.organizationId}/commerce/v2/listings/pages/bulk-update`,
        chunk,
        transport,
        'PUT',
      ),
    );
  }
  return results;
};

export const fetchAllListings = async (
  session: SessionContext,
  transport?: ApiTransport,
): Promise<PublicListingPageResponseModel[]> => {
  let page = 0;
  let hasMore = true;
  const items: PublicListingPageResponseModel[] = [];

  while (hasMore) {
    const response = await requestJson<CommercePageModelPublicListingPageResponseModel>(
      session,
      `/rest/organizations/${session.organizationId}/commerce/v2/listings/pages?trackingId=${encodeURIComponent(
        session.trackingId,
      )}&page=${page}&perPage=100`,
      {transport, cache: 'no-store'},
    );

    if (!response.items || response.items.length === 0) {
      hasMore = false;
    } else {
      items.push(...response.items);
      hasMore = page < response.totalPages - 1;
      page += 1;
    }
  }

  return items;
};

export const fetchListingById = async (
  session: SessionContext,
  listingId: string,
  transport?: ApiTransport,
): Promise<DetailedListingPageResponseModel> =>
  requestJson<DetailedListingPageResponseModel>(
    session,
    `/rest/organizations/${session.organizationId}/commerce/v2/listings/pages/${listingId}?trackingId=${encodeURIComponent(
      session.trackingId,
    )}`,
    {transport, cache: 'no-store'},
  );

export const bulkDeleteListings = async (session: SessionContext, ids: string[], transport?: ApiTransport) => {
  for (const chunk of chunkArray(ids, 50)) {
    await postJson<unknown>(
      session,
      `/rest/organizations/${session.organizationId}/commerce/v2/listings/pages/bulk-delete`,
      chunk,
      transport,
    );
  }
};

export const getGlobalQueryConfig = async (
  session: SessionContext,
  solutionType: QueryConfigSolutionType,
  transport?: ApiTransport,
) => {
  const payload = await requestJson<unknown>(
    session,
    getGlobalQueryConfigPath(session, solutionType),
    {transport},
  );

  const normalized = normalizeGlobalQueryConfigResponse(payload);
  if (!normalized) {
    const error = new Error('NOT_FOUND: Query configuration not found.') as Error & {status?: number};
    error.status = 404;
    throw error;
  }

  return normalized;
};

export const createGlobalQueryConfig = async (
  session: SessionContext,
  data: CommerceQueryConfigurationRequestModel,
  transport?: ApiTransport,
) =>
  postJson<CommerceQueryConfigurationResponseModel>(
    session,
    `/rest/organizations/${session.organizationId}/commerce/v2/configurations/query`,
    data,
    transport,
  );

export const updateGlobalQueryConfig = async (
  session: SessionContext,
  data: CommerceQueryConfigurationRequestModel,
  transport?: ApiTransport,
) =>
  postJson<CommerceQueryConfigurationResponseModel>(
    session,
    `/rest/organizations/${session.organizationId}/commerce/v2/configurations/query`,
    data,
    transport,
    'PUT',
  );

export const getGlobalProductSuggestConfig = async (session: SessionContext, transport?: ApiTransport) =>
  requestJson<GlobalConfigDataShape>(
    session,
    `/rest/organizations/${session.organizationId}/commerce/v2/configurations/productSuggest?trackingId=${encodeURIComponent(
      session.trackingId,
    )}`,
    {transport},
  );

export const updateGlobalProductSuggestConfig = async (
  session: SessionContext,
  data: JsonObject,
  transport?: ApiTransport,
) =>
  postJson<GlobalConfigDataShape>(
    session,
    `/rest/organizations/${session.organizationId}/commerce/v2/configurations/productSuggest?trackingId=${encodeURIComponent(
      session.trackingId,
    )}`,
    data,
    transport,
    'PUT',
  );

export const createGlobalProductSuggestConfig = async (
  session: SessionContext,
  data: JsonObject,
  transport?: ApiTransport,
) =>
  postJson<GlobalConfigDataShape>(
    session,
    `/rest/organizations/${session.organizationId}/commerce/v2/configurations/productSuggest`,
    data,
    transport,
  );

export const getContextMappings = async (session: SessionContext, transport?: ApiTransport) =>
  requestJson<ContextMappingsDataShape>(
    session,
    getContextMappingsBasePath(session),
    {transport, cache: 'no-store'},
  );

export const createContextMapping = async (
  session: SessionContext,
  data: ContextMappingsDataShape[number],
  transport?: ApiTransport,
) =>
  postJson<ContextMappingsDataShape[number]>(
    session,
    getContextMappingsBasePath(session),
    data,
    transport,
  );

export const updateContextMapping = async (
  session: SessionContext,
  key: string,
  data: ContextMappingsDataShape[number],
  transport?: ApiTransport,
) =>
  postJson<ContextMappingsDataShape[number]>(
    session,
    `${getContextMappingsBasePath(session)}/${encodeURIComponent(key)}`,
    data,
    transport,
    'PUT',
  );

export const deleteContextMapping = async (session: SessionContext, key: string, transport?: ApiTransport) =>
  deleteJson<unknown>(session, `${getContextMappingsBasePath(session)}/${encodeURIComponent(key)}`, transport);

export const fetchAllRules = async (
  session: SessionContext,
  solutionType: 'listing' | 'search',
  ruleType: 'ranking' | 'filter',
  transport?: ApiTransport,
): Promise<RankingRuleModel[]> => {
  const actions =
    ruleType === 'ranking'
      ? ['boost', 'bury', 'pin', 'reservedPosition', 'spotlightContent']
      : ['include', 'exclude', 'onlyShow'];
  const actionQuery = actions.map((action) => `actions=${encodeURIComponent(action)}`).join('&');
  let page = 0;
  const perPage = 100;
  const items: RankingRuleModel[] = [];
  let hasMore = true;

  while (hasMore) {
    const response = await requestJson<RankingRulesResponse>(
      session,
      `/rest/organizations/${session.organizationId}/commerce/private/rules?trackingId=${encodeURIComponent(
        session.trackingId,
      )}&solutionType=${solutionType}&page=${page}&perPage=${perPage}&${actionQuery}`,
      {transport, cache: 'no-store'},
    );

    if (!response.items || response.items.length === 0) {
      hasMore = false;
    } else {
      items.push(...response.items);
      hasMore = (page + 1) * perPage < response.totalCount;
      page += 1;
    }
  }

  return items;
};

export const fetchAllRankingRules = (
  session: SessionContext,
  solutionType: 'listing' | 'search',
  transport?: ApiTransport,
) => fetchAllRules(session, solutionType, 'ranking', transport);

export const createRankingRule = async (
  session: SessionContext,
  rulePayload: MerchandisingHubRulePayload,
  solutionType: 'listing' | 'search',
  transport?: ApiTransport,
) =>
  postJson<unknown>(
    session,
    `/rest/organizations/${session.organizationId}/commerce/private/rules`,
    {
      ...rulePayload,
      solutionType,
    },
    transport,
  );

export const bulkCreateRankingRules = async (
  session: SessionContext,
  rules: MerchandisingHubRulePayload[],
  solutionType: 'listing' | 'search',
  transport?: ApiTransport,
): Promise<BulkCreateRulesResult> => {
  const success: unknown[] = [];
  const errors: Array<{rule: string; error: string}> = [];

  for (const rulePayload of rules) {
    try {
      success.push(await createRankingRule(session, rulePayload, solutionType, transport));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push({
        rule: rulePayload.rule.name,
        error: errorMessage,
      });
    }
  }

  return {success, errors};
};
