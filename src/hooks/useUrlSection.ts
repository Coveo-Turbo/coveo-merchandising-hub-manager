import {useEffect, useState} from 'react';
import type {AppSection} from '../types';

const isSection = (value: string | null): value is AppSection =>
  value === 'listings' || value === 'global-config' || value === 'rules' || value === 'maintenance';

const readSection = (embedded: boolean): AppSection => {
  const params = new URLSearchParams(window.location.search);
  const key = embedded ? 'cmhSection' : 'section';
  const rawValue = params.get(key);
  return isSection(rawValue) ? rawValue : 'listings';
};

export const useUrlSection = (embedded: boolean) => {
  const [section, setSectionState] = useState<AppSection>(() => readSection(embedded));

  useEffect(() => {
    const syncSection = () => setSectionState(readSection(embedded));
    window.addEventListener('popstate', syncSection);
    window.addEventListener('hashchange', syncSection);
    return () => {
      window.removeEventListener('popstate', syncSection);
      window.removeEventListener('hashchange', syncSection);
    };
  }, [embedded]);

  const setSection = (nextSection: AppSection) => {
    const params = new URLSearchParams(window.location.search);
    params.set(embedded ? 'cmhSection' : 'section', nextSection);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}${window.location.hash}`);
    setSectionState(nextSection);
  };

  return [section, setSection] as const;
};
