import type {ApiTransport, ApiTransportRequest, ApiTransportResponse} from './contracts';
import type {ExtensionApiMessage, ExtensionErrorResponse} from './extensionProtocol';

const serializeHeaders = (headers: Headers) =>
  Object.fromEntries(Array.from(headers.entries()).map(([key, value]) => [key, value]));

export const createBrowserApiTransport = (): ApiTransport => ({
  async request(request: ApiTransportRequest): Promise<ApiTransportResponse> {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      cache: request.cache,
    });

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: serializeHeaders(response.headers),
      body: await response.text(),
    };
  },
});

const isExtensionErrorResponse = (value: unknown): value is ExtensionErrorResponse =>
  typeof value === 'object' && value !== null && 'ok' in value && (value as ExtensionErrorResponse).ok === false;

export const createExtensionApiTransport = (): ApiTransport => ({
  async request(request: ApiTransportRequest): Promise<ApiTransportResponse> {
    if (!('chrome' in globalThis) || !chrome.runtime?.id) {
      throw new Error('Chrome runtime is unavailable for extension transport.');
    }

    const payload: ExtensionApiMessage = {type: 'API_REQUEST', request};
    const response = (await chrome.runtime.sendMessage(payload)) as ApiTransportResponse | ExtensionErrorResponse;

    if (isExtensionErrorResponse(response)) {
      throw new Error(response.error);
    }

    return response;
  },
});
