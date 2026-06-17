import type {HubContextSnapshot} from '../types';
import {
  getHubLocationScope,
  parseOrgIdFromLocation,
  parseTrackingIdFromLocation,
} from './contextNormalization';
import {inferPlatformUrlFromHostname} from './hosts';

declare global {
  interface Window {
    __CMH_CAPTURED_CONTEXT__?: HubContextSnapshot;
  }
}

const STORAGE_CAPTURE_KEY = 'cmh-manager.bridge.context.v1';
const MESSAGE_TYPE = 'CMH_MANAGER_CONTEXT';
const REFRESH_MESSAGE_TYPE = 'CMH_MANAGER_REQUEST_REFRESH';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const readJson = (value: string) => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
};

const readLabelValue = (labelText: string) => {
  const normalizedLabel = labelText.toLowerCase();
  const elements = Array.from(document.querySelectorAll<HTMLElement>('body *'));
  const labelElement = elements.find((element) => element.textContent?.trim().toLowerCase() === normalizedLabel);
  if (!labelElement) {
    return undefined;
  }

  const siblingText = labelElement.nextElementSibling?.textContent?.trim();
  if (siblingText) {
    return siblingText;
  }

  const parentSiblingText = labelElement.parentElement?.nextElementSibling?.textContent?.trim();
  return parentSiblingText || undefined;
};

const currentLocationState = () => ({
  pathname: window.location.pathname,
  search: window.location.search,
  hash: window.location.hash,
  hostname: window.location.hostname,
});

const mergeSnapshot = (partial: HubContextSnapshot) => {
  const previousSnapshot = window.__CMH_CAPTURED_CONTEXT__;
  const currentOrgId = parseOrgIdFromLocation(currentLocationState());
  const previousOrgId = previousSnapshot?.organizationId;
  const nextOrgId = partial.organizationId ?? currentOrgId ?? previousOrgId;
  const orgChanged = Boolean(currentOrgId && previousOrgId && currentOrgId !== previousOrgId);
  const baseSnapshot = orgChanged ? {} : previousSnapshot;
  const mergedTrackingIds = [
    ...(baseSnapshot?.trackingIds ?? []),
    ...(partial.trackingIds ?? []),
  ].filter((entry, index, array) => entry.trim().length > 0 && array.indexOf(entry) === index);

  window.__CMH_CAPTURED_CONTEXT__ = {
    ...baseSnapshot,
    ...partial,
    ...(nextOrgId ? {organizationId: nextOrgId} : {}),
    trackingIds: mergedTrackingIds,
    capturedAt: partial.capturedAt ?? Date.now(),
  };

  if (window.__CMH_CAPTURED_CONTEXT__?.contextScope !== 'property') {
    window.__CMH_CAPTURED_CONTEXT__ = {
      ...window.__CMH_CAPTURED_CONTEXT__,
      trackingId: undefined,
      propertyName: undefined,
      trackingIdSource: undefined,
      propertyNameSource: undefined,
      propertyContextVerified: false,
    };
  }

  window.sessionStorage.setItem(STORAGE_CAPTURE_KEY, JSON.stringify(window.__CMH_CAPTURED_CONTEXT__));
};

const recursiveHarvest = (value: unknown, snapshot: HubContextSnapshot, depth = 0) => {
  if (depth > 6 || value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => recursiveHarvest(entry, snapshot, depth + 1));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  const organizationId = value.organizationId;
  if (typeof organizationId === 'string' && organizationId.trim().length > 0) {
    snapshot.organizationId = organizationId.trim();
  }

  const trackingId = value.trackingId;
  if (typeof trackingId === 'string' && trackingId.trim().length > 0) {
    snapshot.trackingId = trackingId.trim();
  }

  const accessToken = value.accessToken;
  if (typeof accessToken === 'string' && accessToken.trim().length > 0) {
    snapshot.accessToken = accessToken.trim();
  }

  const locale = value.locale;
  if (typeof locale === 'string' && locale.trim().length > 0) {
    snapshot.locale = locale.trim();
  }

  const propertyName = value.propertyName;
  if (typeof propertyName === 'string' && propertyName.trim().length > 0) {
    snapshot.propertyName = propertyName.trim();
  }

  const tokenCandidate = value.token;
  if (!snapshot.accessToken && typeof tokenCandidate === 'string' && tokenCandidate.trim().length > 20) {
    snapshot.accessToken = tokenCandidate.trim();
  }

  const trackingIds = value.trackingIds;
  if (Array.isArray(trackingIds) && trackingIds.every((entry) => typeof entry === 'string')) {
    snapshot.trackingIds = trackingIds.filter((entry): entry is string => entry.trim().length > 0);
  }

  const contextScope = value.contextScope;
  if (contextScope === 'unknown' || contextScope === 'organization' || contextScope === 'property') {
    snapshot.contextScope = contextScope;
  }

  if (typeof value.propertyContextVerified === 'boolean') {
    snapshot.propertyContextVerified = value.propertyContextVerified;
  }

  const trackingIdSource = value.trackingIdSource;
  if (
    trackingIdSource === 'location' ||
    trackingIdSource === 'dom' ||
    trackingIdSource === 'request' ||
    trackingIdSource === 'storage' ||
    trackingIdSource === 'persisted'
  ) {
    snapshot.trackingIdSource = trackingIdSource;
  }

  const propertyNameSource = value.propertyNameSource;
  if (
    propertyNameSource === 'location' ||
    propertyNameSource === 'dom' ||
    propertyNameSource === 'request' ||
    propertyNameSource === 'storage' ||
    propertyNameSource === 'persisted'
  ) {
    snapshot.propertyNameSource = propertyNameSource;
  }

  Object.values(value).forEach((entry) => recursiveHarvest(entry, snapshot, depth + 1));
};

const scanStorage = (): HubContextSnapshot => {
  const snapshot: HubContextSnapshot = {};

  [window.localStorage, window.sessionStorage].forEach((storage) => {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) {
        continue;
      }

      const rawValue = storage.getItem(key);
      if (!rawValue) {
        continue;
      }

      recursiveHarvest(readJson(rawValue), snapshot);
    }
  });

  if (snapshot.trackingId && !snapshot.trackingIdSource) {
    snapshot.trackingIdSource = 'storage';
  }

  if (snapshot.propertyName && !snapshot.propertyNameSource) {
    snapshot.propertyNameSource = 'storage';
  }

  return snapshot;
};

const captureFromRequest = (urlLike: string, init?: RequestInit | XMLHttpRequest) => {
  try {
    const url = new URL(urlLike, window.location.origin);
    if (!url.pathname.includes('/rest/organizations/')) {
      return;
    }

    const organizationId = url.pathname.match(/\/rest\/organizations\/([^/]+)/)?.[1];
    const trackingId = url.searchParams.get('trackingId') || undefined;
    const platformUrl = `${url.protocol}//${url.host}`;

    const partial: HubContextSnapshot = {
      organizationId,
      trackingId,
      trackingIds: trackingId ? [trackingId] : undefined,
      platformUrl,
      contextScope: trackingId ? 'property' : 'organization',
      propertyContextVerified: Boolean(trackingId),
      trackingIdSource: trackingId ? 'request' : undefined,
      capturedAt: Date.now(),
    };

    if (init && 'headers' in init && init.headers) {
      const headers = new Headers(init.headers as HeadersInit);
      const authorization = headers.get('Authorization') || headers.get('authorization');
      if (authorization?.startsWith('Bearer ')) {
        partial.accessToken = authorization.slice('Bearer '.length);
      }
    }

    mergeSnapshot(partial);
  } catch {
    // Ignore invalid URLs.
  }
};

const patchFetch = () => {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    captureFromRequest(url, init);
    return originalFetch(input, init);
  };
};

const patchXhr = () => {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = (function open(
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ) {
    (this as XMLHttpRequest & {__cmhUrl?: string}).__cmhUrl = typeof url === 'string' ? url : url.toString();
    return originalOpen.call(this, method, url, async ?? true, username, password);
  }) as typeof XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.setRequestHeader = function setRequestHeader(header, value) {
    if (header.toLowerCase() === 'authorization') {
      const url = (this as XMLHttpRequest & {__cmhUrl?: string}).__cmhUrl;
      if (url) {
        captureFromRequest(url, {
          headers: {
            Authorization: value,
          },
        } as RequestInit);
      }
    }
    return originalSetRequestHeader.call(this, header, value);
  };
};

const buildSnapshot = (): HubContextSnapshot => {
  const storageSnapshot = scanStorage();
  const storedSnapshot = readJson(window.sessionStorage.getItem(STORAGE_CAPTURE_KEY) || '{}');
  const persistedSnapshot = isRecord(storedSnapshot) ? (storedSnapshot as HubContextSnapshot) : {};
  const liveLocation = currentLocationState();
  const liveOrganizationId = parseOrgIdFromLocation(liveLocation);
  const liveTrackingId = parseTrackingIdFromLocation(liveLocation);
  const liveSnapshot: HubContextSnapshot = {
    platformUrl: inferPlatformUrlFromHostname(window.location.hostname),
    organizationId: liveOrganizationId,
    organizationName: readLabelValue('organization:'),
    propertyName: readLabelValue('property:'),
    locale: readLabelValue('locale:'),
    trackingId: liveTrackingId,
    contextScope: getHubLocationScope(liveLocation),
    propertyContextVerified: Boolean(liveTrackingId || readLabelValue('property:')),
    trackingIdSource: liveTrackingId ? 'location' : undefined,
    propertyNameSource: readLabelValue('property:') ? 'dom' : undefined,
    capturedAt: Date.now(),
  };

  const sanitizeSnapshotForCurrentOrg = (snapshot: HubContextSnapshot) => {
    if (!liveOrganizationId || !snapshot.organizationId || snapshot.organizationId === liveOrganizationId) {
      return snapshot;
    }

    return {
      accessToken: snapshot.accessToken,
      platformUrl: snapshot.platformUrl,
      locale: snapshot.locale,
      organizationId: liveOrganizationId,
      contextScope: 'organization' as const,
      propertyContextVerified: false,
    };
  };

  const sanitizedPersistedSnapshot = sanitizeSnapshotForCurrentOrg(persistedSnapshot);
  const sanitizedStorageSnapshot = sanitizeSnapshotForCurrentOrg(storageSnapshot);
  const trackingIds = [
    ...(sanitizedStorageSnapshot.trackingIds ?? []),
    ...(sanitizedPersistedSnapshot.trackingIds ?? []),
    sanitizedStorageSnapshot.trackingId,
    sanitizedPersistedSnapshot.trackingId,
    liveTrackingId,
  ].filter((entry, index, array): entry is string => typeof entry === 'string' && entry.trim().length > 0 && array.indexOf(entry) === index);

  const mergedSnapshot = {
    ...sanitizedPersistedSnapshot,
    ...sanitizedStorageSnapshot,
    ...liveSnapshot,
    trackingIds,
  };

  if (mergedSnapshot.contextScope !== 'property') {
    return {
      ...mergedSnapshot,
      trackingId: undefined,
      propertyName: undefined,
      trackingIdSource: undefined,
      propertyNameSource: undefined,
      propertyContextVerified: false,
    };
  }

  return mergedSnapshot;
};

const emitSnapshot = () => {
  const snapshot = buildSnapshot();
  mergeSnapshot(snapshot);
  window.postMessage({type: MESSAGE_TYPE, payload: snapshot}, window.location.origin);
};

patchFetch();
patchXhr();
emitSnapshot();

window.addEventListener('message', (event) => {
  if (event.source !== window || !isRecord(event.data)) {
    return;
  }

  if (event.data.type === REFRESH_MESSAGE_TYPE) {
    emitSnapshot();
  }
});
