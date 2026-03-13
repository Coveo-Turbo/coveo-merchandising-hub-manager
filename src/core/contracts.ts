import type {HubContextSnapshot, SessionContext} from '../types';

export interface ApiTransportRequest {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  cache?: RequestCache;
}

export interface ApiTransportResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

export interface ApiTransport {
  request(request: ApiTransportRequest): Promise<ApiTransportResponse>;
}

export interface ContextResolver {
  resolve(): Promise<SessionContext | null>;
  refresh(): Promise<SessionContext | null>;
  disconnect(): Promise<void>;
}

export interface SessionStore {
  load(): Promise<SessionContext | null>;
  save(session: SessionContext): Promise<void>;
  clear(): Promise<void>;
}

export interface HubBridgeMessage {
  type: 'CMH_MANAGER_CONTEXT';
  payload: HubContextSnapshot;
}
