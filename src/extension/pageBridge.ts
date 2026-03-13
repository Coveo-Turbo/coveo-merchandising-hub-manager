import type {HubContextSnapshot} from '../types';

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

const inferPlatformUrl = () => {
  const hostname = window.location.hostname;
  if (hostname.includes('commerce-ca.')) {
    return 'https://platform-ca.cloud.coveo.com';
  }
  if (hostname.includes('commerce-eu.')) {
    return 'https://platform-eu.cloud.coveo.com';
  }
  if (hostname.includes('commerce-au.')) {
    return 'https://platform-au.cloud.coveo.com';
  }
  return 'https://platform.cloud.coveo.com';
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

const mergeSnapshot = (partial: HubContextSnapshot) => {
  window.__CMH_CAPTURED_CONTEXT__ = {
    ...window.__CMH_CAPTURED_CONTEXT__,
    ...partial,
    trackingIds: partial.trackingIds ?? window.__CMH_CAPTURED_CONTEXT__?.trackingIds,
  };
  window.sessionStorage.setItem(STORAGE_CAPTURE_KEY, JSON.stringify(window.__CMH_CAPTURED_CONTEXT__));
};

const parseOrgIdFromLocation = () => {
  const hashMatch = window.location.hash.match(/#\/([^/?]+)/);
  if (hashMatch?.[1]) {
    return hashMatch[1];
  }

  const pathMatch = window.location.pathname.match(/\/organizations\/([^/?]+)/);
  return pathMatch?.[1];
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
      platformUrl,
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
  const liveSnapshot: HubContextSnapshot = {
    platformUrl: inferPlatformUrl(),
    organizationId: parseOrgIdFromLocation(),
    organizationName: readLabelValue('organization:'),
    propertyName: readLabelValue('property:'),
    locale: readLabelValue('locale:'),
  };

  return {
    ...persistedSnapshot,
    ...storageSnapshot,
    ...liveSnapshot,
    trackingIds: storageSnapshot.trackingIds ?? persistedSnapshot.trackingIds,
  };
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
