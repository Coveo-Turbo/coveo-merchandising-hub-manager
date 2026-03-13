import type {ApiTransportRequest, ApiTransportResponse} from './contracts';
import type {SessionContext} from '../types';

export interface ExtensionSessionMessage {
  type: 'GET_SESSION_CONTEXT' | 'SET_SESSION_CONTEXT' | 'CLEAR_SESSION_CONTEXT' | 'REFRESH_SESSION_CONTEXT';
  tabId?: number;
  payload?: SessionContext | null;
}

export interface ExtensionApiMessage {
  type: 'API_REQUEST';
  request: ApiTransportRequest;
}

export interface ExtensionTabMessage {
  type: 'REQUEST_PAGE_CONTEXT_REFRESH';
}

export interface ExtensionErrorResponse {
  ok: false;
  error: string;
}

export type ExtensionMessage = ExtensionSessionMessage | ExtensionApiMessage;
export type ExtensionRuntimeResponse = ApiTransportResponse | SessionContext | null | ExtensionErrorResponse;
