import {useEffect, useState} from 'react';
import {getAppPagePath, resolveAppPage} from '../appRouting';
import type {AppPage} from '../types';

const readPage = (): AppPage => resolveAppPage(window.location.pathname);

export const useAppPage = () => {
  const [page, setPageState] = useState<AppPage>(() => readPage());

  useEffect(() => {
    const syncPage = () => setPageState(readPage());
    window.addEventListener('popstate', syncPage);
    return () => window.removeEventListener('popstate', syncPage);
  }, []);

  const setPage = (nextPage: AppPage) => {
    const nextPath = getAppPagePath(nextPage);
    window.history.pushState({}, '', nextPath);
    setPageState(nextPage);
  };

  return [page, setPage] as const;
};
