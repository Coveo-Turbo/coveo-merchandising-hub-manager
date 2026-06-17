const trimTrailingSlash = (value: string) => value.replace(/\/$/, '');
const repositoryUrl = 'https://github.com/Coveo-Turbo/coveo-merchandising-hub-manager';

export const getApiBaseUrl = () => {
  const configured = import.meta.env.VITE_CMH_API_BASE_URL?.trim();
  if (configured) {
    return trimTrailingSlash(configured);
  }

  return '';
};

export const getGeminiApiKey = () => import.meta.env.VITE_GEMINI_API_KEY?.trim() ?? '';
export const getRepositoryUrl = () => repositoryUrl;
export const getReleasesPageUrl = () => `${repositoryUrl}/releases`;
export const getLatestExtensionDownloadUrl = () => `${getReleasesPageUrl()}/latest/download/cmh-manager-extension.zip`;
export const getStandaloneDocsUrl = () => {
  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}/docs` : `${repositoryUrl}#readme`;
};
export const getStandaloneUpdatesUrl = () => {
  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}/updates` : getReleasesPageUrl();
};
