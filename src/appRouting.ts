import type {AppSection} from './types';

export const getRequiredSection = (
  section: AppSection,
  hasResolvedInitialContext: boolean,
  hasSession: boolean,
): AppSection => {
  if (!hasResolvedInitialContext || hasSession || section === 'connection') {
    return section;
  }

  return 'connection';
};
