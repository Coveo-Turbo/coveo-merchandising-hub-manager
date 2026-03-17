import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  deployCommerceTroubleshootConsole,
  resolveCommerceTroubleshootDeployUrl,
} from '../src/services/commerceTroubleshootConsoleService';
import type {CommerceTroubleshootDeployRequest} from '../src/types';

const sampleRequest: CommerceTroubleshootDeployRequest = {
  organizationId: 'my-org',
  accessToken: 'my-token',
  platformUrl: 'https://platform.cloud.coveo.com',
  trackingId: 'storefront',
  hostedPageName: 'commerce-troubleshoot-console',
};

describe('commerceTroubleshootConsoleService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the same-origin endpoint when no external API base is configured', () => {
    expect(resolveCommerceTroubleshootDeployUrl('', 'https:')).toBe('/api/commerce-troubleshoot-deploy');
  });

  it('uses the configured external API base when present', () => {
    expect(resolveCommerceTroubleshootDeployUrl('https://cmh-manager.netlify.app', 'chrome-extension:')).toBe(
      'https://cmh-manager.netlify.app/api/commerce-troubleshoot-deploy',
    );
  });

  it('throws a helpful error for extension builds without an API base URL', () => {
    expect(() => resolveCommerceTroubleshootDeployUrl('', 'chrome-extension:')).toThrow(
      'VITE_CMH_API_BASE_URL is not configured',
    );
  });

  it('posts the request payload and returns the backend result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          organizationId: 'my-org',
          hostedPageName: 'commerce-troubleshoot-console',
          hostedPageId: 'page-123',
          deployed: true,
          diagnostics: ['done'],
          keyInfo: {
            created: false,
            reused: true,
            source: 'managed',
          },
        }),
        {
          status: 200,
          headers: {'Content-Type': 'application/json'},
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(deployCommerceTroubleshootConsole(sampleRequest)).resolves.toMatchObject({
      hostedPageId: 'page-123',
      deployed: true,
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/commerce-troubleshoot-deploy', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(sampleRequest),
    });
  });

  it('surfaces backend JSON error payloads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({error: 'coveo CLI is unavailable on this backend runtime.'}), {
          status: 500,
          headers: {'Content-Type': 'application/json'},
        }),
      ),
    );

    await expect(deployCommerceTroubleshootConsole(sampleRequest)).rejects.toThrow(
      'coveo CLI is unavailable on this backend runtime.',
    );
  });
});
