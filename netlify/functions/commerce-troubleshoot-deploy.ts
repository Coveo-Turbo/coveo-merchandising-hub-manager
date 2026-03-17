import os from 'node:os';
import path from 'node:path';
import type {CommerceTroubleshootDeployRequest} from '../../src/types';
import {resolvePlatformRegionFromUrl} from '../../src/utils/platformRegion';

const jsonHeaders = {'Content-Type': 'application/json'};

const toString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });

const readRequestPayload = async (request: Request): Promise<CommerceTroubleshootDeployRequest> => {
  const payload = (await request.json()) as Partial<CommerceTroubleshootDeployRequest>;

  return {
    organizationId: toString(payload.organizationId),
    accessToken: toString(payload.accessToken),
    platformUrl: toString(payload.platformUrl),
    trackingId: toString(payload.trackingId),
    hostedPageName: toString(payload.hostedPageName),
    ...(toString(payload.hostedPageId) ? {hostedPageId: toString(payload.hostedPageId)} : {}),
    ...(typeof payload.dryRun === 'boolean' ? {dryRun: payload.dryRun} : {}),
  };
};

const validatePayload = (payload: CommerceTroubleshootDeployRequest) => {
  const missingFields = [
    !payload.organizationId && 'organizationId',
    !payload.accessToken && 'accessToken',
    !payload.platformUrl && 'platformUrl',
    !payload.trackingId && 'trackingId',
    !payload.hostedPageName && 'hostedPageName',
  ].filter(Boolean);

  return missingFields;
};

const loadDeployModule = async () => {
  const loaded = (await import('@coveops/commerce-troubleshoot-deployer')) as {
    deployTroubleshootConsole?: (request: unknown, options?: {logger?: (message: string) => void}) => Promise<unknown>;
  };

  if (typeof loaded.deployTroubleshootConsole !== 'function') {
    throw new Error('Invalid @coveops/commerce-troubleshoot-deployer package: deployTroubleshootConsole export is missing.');
  }

  return loaded.deployTroubleshootConsole;
};

export default async (request: Request) => {
  if (request.method !== 'POST') {
    return jsonResponse({error: 'Method not allowed. Use POST.'}, 405);
  }

  try {
    const payload = await readRequestPayload(request);
    const missingFields = validatePayload(payload);
    if (missingFields.length > 0) {
      return jsonResponse(
        {
          error: `Missing required parameters: ${missingFields.join(', ')}`,
        },
        400,
      );
    }

    const diagnostics = [
      `[server] platformUrl=${payload.platformUrl}`,
    ];
    const region = resolvePlatformRegionFromUrl(payload.platformUrl);
    if (region) {
      diagnostics.push(`[server] derived region "${region}" from platformUrl.`);
    } else {
      diagnostics.push('[server] platformUrl did not map to a known hosted deploy region; default deployer resolution will be used.');
    }

    const deployTroubleshootConsole = await loadDeployModule();
    const result = (await deployTroubleshootConsole(
      {
        auth: {
          accessToken: payload.accessToken,
        },
        deploy: {
          dryRun: Boolean(payload.dryRun),
          outputRootDir: path.join(os.tmpdir(), 'cmh-manager', 'commerce-troubleshoot-console'),
        },
        runtimeDefaults: {
          trackingId: payload.trackingId,
        },
        target: {
          organizationId: payload.organizationId,
          hostedPageName: payload.hostedPageName,
          ...(payload.hostedPageId ? {hostedPageId: payload.hostedPageId} : {}),
          ...(region ? {region} : {}),
        },
      },
      {
        logger: (message) => console.log(message),
      },
    )) as {
      organizationId: string;
      hostedPageName: string;
      hostedPageId?: string;
      deployed: boolean;
      diagnostics?: string[];
      keyInfo: {
        created: boolean;
        reused: boolean;
        source: 'managed' | 'provided';
        engineKeyId?: string;
        cmhKeyId?: string;
      };
    };

    return jsonResponse({
      organizationId: result.organizationId,
      hostedPageName: result.hostedPageName,
      ...(result.hostedPageId ? {hostedPageId: result.hostedPageId} : {}),
      deployed: result.deployed,
      diagnostics: [...diagnostics, ...(result.diagnostics ?? [])],
      keyInfo: result.keyInfo,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse(
      {
        error: message || 'Failed to deploy the Commerce Troubleshoot Console.',
      },
      500,
    );
  }
};
