import type {AppPage, AppSection} from './types';

const normalizePathname = (pathname: string) => {
  const normalized = pathname.replace(/\/+$/, '');
  return normalized || '/';
};

export const resolveAppPage = (pathname: string): AppPage => {
  const normalized = normalizePathname(pathname);

  if (normalized === '/docs') {
    return 'docs';
  }

  if (normalized === '/updates') {
    return 'updates';
  }

  return 'manager';
};

export const getAppPagePath = (page: AppPage) => (page === 'manager' ? '/' : `/${page}`);

export const getRequiredSection = (
  section: AppSection,
  hasResolvedInitialContext: boolean,
  hasSession: boolean,
  page: AppPage = 'manager',
): AppSection => {
  if (page !== 'manager' || !hasResolvedInitialContext || hasSession || section === 'connection') {
    return section;
  }

  return 'connection';
};
