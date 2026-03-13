const trimTrailingSlash = (value: string) => value.replace(/\/$/, '');

export const getApiBaseUrl = () => {
  const configured = import.meta.env.VITE_CMH_API_BASE_URL?.trim();
  if (configured) {
    return trimTrailingSlash(configured);
  }

  return '';
};

export const getGeminiApiKey = () => import.meta.env.VITE_GEMINI_API_KEY?.trim() ?? '';
