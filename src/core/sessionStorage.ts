import type {ContextResolver, SessionStore} from './contracts';
import type {ConnectionSessionSnapshot, SessionContext} from '../types';

const SESSION_STORAGE_KEY = 'cmh-manager.connection-session.v2';

const normalizeTrackingIds = (trackingIds: string[], trackingId: string) => {
  const deduped = [...new Set(trackingIds.filter((entry) => entry.trim().length > 0))];
  return deduped.includes(trackingId) ? deduped : [...deduped, trackingId].filter(Boolean);
};

const parseSnapshot = (rawSnapshot: string): SessionContext | null => {
  try {
    const snapshot = JSON.parse(rawSnapshot) as Partial<ConnectionSessionSnapshot>;
    const organizationId = typeof snapshot.organizationId === 'string' ? snapshot.organizationId.trim() : '';
    const trackingId =
      typeof snapshot.selectedTrackingId === 'string'
        ? snapshot.selectedTrackingId.trim()
        : typeof snapshot.trackingId === 'string'
          ? snapshot.trackingId.trim()
          : '';
    const accessToken = typeof snapshot.accessToken === 'string' ? snapshot.accessToken.trim() : '';
    const platformUrl = typeof snapshot.platformUrl === 'string' ? snapshot.platformUrl.trim() : '';
    const trackingIds = Array.isArray(snapshot.trackingIds)
      ? snapshot.trackingIds.filter((entry): entry is string => typeof entry === 'string')
      : [];

    if (!organizationId || !trackingId || !accessToken || !platformUrl) {
      return null;
    }

    return {
      organizationId,
      trackingId,
      accessToken,
      platformUrl,
      trackingIds: normalizeTrackingIds(trackingIds, trackingId),
      source: snapshot.source === 'hub' ? 'hub' : 'manual',
      organizationName: typeof snapshot.organizationName === 'string' ? snapshot.organizationName : undefined,
      propertyName: typeof snapshot.propertyName === 'string' ? snapshot.propertyName : undefined,
      locale: typeof snapshot.locale === 'string' ? snapshot.locale : undefined,
    };
  } catch {
    return null;
  }
};

export const createBrowserSessionStore = (): SessionStore => ({
  async load(): Promise<SessionContext | null> {
    const rawSnapshot = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    return rawSnapshot ? parseSnapshot(rawSnapshot) : null;
  },
  async save(session: SessionContext) {
    const snapshot: ConnectionSessionSnapshot = {
      ...session,
      selectedTrackingId: session.trackingId,
    };
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(snapshot));
  },
  async clear() {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  },
});

export const createStoredContextResolver = (store: SessionStore): ContextResolver => ({
  resolve: () => store.load(),
  refresh: () => store.load(),
  disconnect: () => store.clear(),
});
