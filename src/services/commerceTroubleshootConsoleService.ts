import {getApiBaseUrl} from '../core/env';
import type {CommerceTroubleshootDeployRequest, CommerceTroubleshootDeployResult} from '../types';

const DEPLOY_ENDPOINT_PATH = '/api/commerce-troubleshoot-deploy';

const parseErrorMessage = async (response: Response) => {
  const rawBody = await response.text();

  try {
    const parsed = JSON.parse(rawBody) as {error?: string; message?: string};
    if (parsed.error) {
      return parsed.error;
    }
    if (parsed.message) {
      return parsed.message;
    }
  } catch {
    // Keep the raw text body when the backend did not return JSON.
  }

  return rawBody || response.statusText || 'Unknown error';
};

export const resolveCommerceTroubleshootDeployUrl = (apiBaseUrl = getApiBaseUrl(), protocol = window.location.protocol) => {
  if (apiBaseUrl) {
    return `${apiBaseUrl}${DEPLOY_ENDPOINT_PATH}`;
  }

  if (protocol.startsWith('chrome-extension')) {
    throw new Error(
      'Commerce Troubleshoot deploy is unavailable because VITE_CMH_API_BASE_URL is not configured for the extension build.',
    );
  }

  return DEPLOY_ENDPOINT_PATH;
};

export const deployCommerceTroubleshootConsole = async (
  request: CommerceTroubleshootDeployRequest,
): Promise<CommerceTroubleshootDeployResult> => {
  const response = await fetch(resolveCommerceTroubleshootDeployUrl(), {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as CommerceTroubleshootDeployResult;
};
