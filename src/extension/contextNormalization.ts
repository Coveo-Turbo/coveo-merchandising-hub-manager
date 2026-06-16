import type {
  HubContextFieldSource,
  HubContextScope,
  HubContextSnapshot,
  SessionContext,
} from '../types';
import {inferPlatformUrlFromHostname} from './hosts';

export interface HubLocationSnapshot {
  pathname: string;
  search: string;
  hash: string;
  hostname: string;
}

export interface NormalizedHubContext {
  organizationId?: string;
  organizationName?: string;
  propertyName?: string;
  locale?: string;
  accessToken?: string;
  platformUrl?: string;
  contextScope: HubContextScope;
  explicitPropertyContext: boolean;
  explicitTrackingId?: string;
  candidateTrackingIds: string[];
  sourceHints: {
    trackingId?: HubContextFieldSource;
    propertyName?: HubContextFieldSource;
  };
}

const trimToUndefined = (value?: string) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const uniqueTrackingIds = (...groups: Array<Array<string | undefined> | undefined>) => {
  const trackingIds = new Set<string>();

  groups.forEach((group) => {
    group?.forEach((entry) => {
      const trimmed = trimToUndefined(entry);
      if (trimmed) {
        trackingIds.add(trimmed);
      }
    });
  });

  return [...trackingIds];
};

const parseHashRoute = (hash: string) => (hash.startsWith('#') ? hash.slice(1) : hash);

const parseHashSearchParams = (hash: string) => {
  const route = parseHashRoute(hash);
  const queryIndex = route.indexOf('?');
  return new URLSearchParams(queryIndex >= 0 ? route.slice(queryIndex + 1) : '');
};

export const parseOrgIdFromLocation = ({pathname, hash}: Pick<HubLocationSnapshot, 'pathname' | 'hash'>) => {
  const hashMatch = parseHashRoute(hash).match(/^\/([^/?]+)/);
  if (hashMatch?.[1]) {
    return decodeURIComponent(hashMatch[1]);
  }

  const pathMatch = pathname.match(/\/organizations\/([^/?]+)/);
  return pathMatch?.[1] ? decodeURIComponent(pathMatch[1]) : undefined;
};

export const parseTrackingIdFromLocation = ({
  pathname,
  search,
  hash,
}: Pick<HubLocationSnapshot, 'pathname' | 'search' | 'hash'>) => {
  const searchParams = new URLSearchParams(search);
  const directQueryTrackingId = trimToUndefined(searchParams.get('trackingId') || undefined);
  if (directQueryTrackingId) {
    return directQueryTrackingId;
  }

  const hashSearchTrackingId = trimToUndefined(parseHashSearchParams(hash).get('trackingId') || undefined);
  if (hashSearchTrackingId) {
    return hashSearchTrackingId;
  }

  const routeTrackingId =
    pathname.match(/\/tracking-ids\/([^/?]+)/)?.[1] ||
    parseHashRoute(hash).match(/\/tracking-ids\/([^/?]+)/)?.[1] ||
    pathname.match(/\/properties\/([^/?]+)/)?.[1] ||
    parseHashRoute(hash).match(/\/properties\/([^/?]+)/)?.[1];

  return routeTrackingId ? decodeURIComponent(routeTrackingId) : undefined;
};

export const getHubLocationScope = (location: HubLocationSnapshot): HubContextScope => {
  const organizationId = parseOrgIdFromLocation(location);
  if (!organizationId) {
    return 'unknown';
  }

  return parseTrackingIdFromLocation(location) ? 'property' : 'organization';
};

export const normalizeHubContextSnapshot = (
  snapshot: HubContextSnapshot,
  location: HubLocationSnapshot,
): NormalizedHubContext => {
  const locationOrganizationId = trimToUndefined(parseOrgIdFromLocation(location));
  const snapshotOrganizationId = trimToUndefined(snapshot.organizationId);
  const organizationId = locationOrganizationId || snapshotOrganizationId;
  const organizationMatches = !locationOrganizationId || !snapshotOrganizationId || locationOrganizationId === snapshotOrganizationId;

  const explicitTrackingIdFromLocation = trimToUndefined(parseTrackingIdFromLocation(location));
  const explicitTrackingIdFromSnapshot =
    organizationMatches && snapshot.propertyContextVerified ? trimToUndefined(snapshot.trackingId) : undefined;
  const explicitTrackingId = explicitTrackingIdFromLocation || explicitTrackingIdFromSnapshot;
  const explicitPropertyContext = Boolean(
    explicitTrackingId ||
      (organizationMatches && snapshot.propertyContextVerified) ||
      (organizationMatches && trimToUndefined(snapshot.propertyName) && snapshot.contextScope === 'property'),
  );

  const contextScope =
    explicitPropertyContext || getHubLocationScope(location) === 'property'
      ? 'property'
      : organizationId
        ? 'organization'
        : snapshot.contextScope || 'unknown';

  const candidateTrackingIds = explicitPropertyContext
    ? uniqueTrackingIds(
        [explicitTrackingIdFromLocation],
        [explicitTrackingIdFromSnapshot],
        organizationMatches ? snapshot.trackingIds : undefined,
        organizationMatches ? [snapshot.trackingId] : undefined,
      )
    : uniqueTrackingIds(
        organizationMatches ? snapshot.trackingIds : undefined,
        organizationMatches ? [snapshot.trackingId] : undefined,
      );

  return {
    organizationId,
    organizationName: trimToUndefined(snapshot.organizationName),
    propertyName: explicitPropertyContext ? trimToUndefined(snapshot.propertyName) : undefined,
    locale: trimToUndefined(snapshot.locale),
    accessToken: trimToUndefined(snapshot.accessToken),
    platformUrl: trimToUndefined(snapshot.platformUrl) || inferPlatformUrlFromHostname(location.hostname),
    contextScope,
    explicitPropertyContext,
    explicitTrackingId,
    candidateTrackingIds,
    sourceHints: {
      trackingId: explicitTrackingIdFromLocation ? 'location' : snapshot.trackingIdSource,
      propertyName: explicitPropertyContext ? snapshot.propertyNameSource : undefined,
    },
  };
};

export const resolveSessionFromHubContextSnapshot = (
  snapshot: HubContextSnapshot,
  location: HubLocationSnapshot,
): SessionContext | null => {
  const normalized = normalizeHubContextSnapshot(snapshot, location);
  if (!normalized.organizationId || !normalized.accessToken || !normalized.platformUrl) {
    return null;
  }

  const trackingId = normalized.explicitTrackingId || normalized.candidateTrackingIds[0];
  if (!trackingId) {
    return null;
  }

  return {
    organizationId: normalized.organizationId,
    organizationName: normalized.organizationName,
    trackingId,
    trackingIds: uniqueTrackingIds([trackingId], normalized.candidateTrackingIds),
    propertyName: normalized.propertyName,
    locale: normalized.locale,
    accessToken: normalized.accessToken,
    platformUrl: normalized.platformUrl,
    source: 'hub',
  };
};
