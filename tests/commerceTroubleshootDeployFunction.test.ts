import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const deployTroubleshootConsoleMock = vi.fn();

vi.mock('@coveops/commerce-troubleshoot-deployer', () => ({
  deployTroubleshootConsole: deployTroubleshootConsoleMock,
}));

describe('commerce-troubleshoot-deploy function', () => {
  const originalPath = process.env.PATH;

  beforeEach(() => {
    deployTroubleshootConsoleMock.mockReset();
    process.env.PATH = '';
  });

  afterEach(() => {
    process.env.PATH = originalPath;
  });

  it('delegates non-dry-run deploys without a local coveo binary assumption', async () => {
    deployTroubleshootConsoleMock.mockResolvedValue({
      organizationId: 'my-org',
      hostedPageName: 'my-page',
      hostedPageId: 'page-123',
      deployed: true,
      diagnostics: ['[service] deployed'],
      keyInfo: {
        created: false,
        reused: true,
        source: 'managed',
      },
    });

    const {default: handler} = await import('../netlify/functions/commerce-troubleshoot-deploy');
    const response = await handler(
      new Request('http://localhost/api/commerce-troubleshoot-deploy', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          organizationId: 'my-org',
          accessToken: 'platform-token',
          platformUrl: 'https://platform-eu.cloud.coveo.com',
          trackingId: 'storefront',
          hostedPageName: 'my-page',
          dryRun: false,
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(deployTroubleshootConsoleMock).toHaveBeenCalledWith(
      {
        auth: {
          accessToken: 'platform-token',
        },
        deploy: expect.objectContaining({
          dryRun: false,
        }),
        runtimeDefaults: {
          trackingId: 'storefront',
        },
        target: {
          organizationId: 'my-org',
          hostedPageName: 'my-page',
          region: 'eu',
        },
      },
      {
        logger: expect.any(Function),
      },
    );

    await expect(response.json()).resolves.toMatchObject({
      deployed: true,
      hostedPageId: 'page-123',
      diagnostics: expect.arrayContaining([
        '[server] platformUrl=https://platform-eu.cloud.coveo.com',
        '[service] deployed',
      ]),
    });
  });

  it('forwards hostedPageId and dry-run values unchanged', async () => {
    deployTroubleshootConsoleMock.mockResolvedValue({
      organizationId: 'my-org',
      hostedPageName: 'my-page',
      hostedPageId: 'page-999',
      deployed: false,
      diagnostics: ['[service] dry-run'],
      keyInfo: {
        created: false,
        reused: false,
        source: 'provided',
      },
    });

    const {default: handler} = await import('../netlify/functions/commerce-troubleshoot-deploy');
    const response = await handler(
      new Request('http://localhost/api/commerce-troubleshoot-deploy', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          organizationId: 'my-org',
          accessToken: 'platform-token',
          platformUrl: 'https://platform.cloud.coveo.com',
          trackingId: 'storefront',
          hostedPageName: 'my-page',
          hostedPageId: 'page-999',
          dryRun: true,
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(deployTroubleshootConsoleMock).toHaveBeenCalledWith(
      {
        auth: {
          accessToken: 'platform-token',
        },
        deploy: expect.objectContaining({
          dryRun: true,
        }),
        runtimeDefaults: {
          trackingId: 'storefront',
        },
        target: {
          organizationId: 'my-org',
          hostedPageName: 'my-page',
          hostedPageId: 'page-999',
          region: 'us',
        },
      },
      {
        logger: expect.any(Function),
      },
    );

    await expect(response.json()).resolves.toMatchObject({
      deployed: false,
      hostedPageId: 'page-999',
    });
  });
});
