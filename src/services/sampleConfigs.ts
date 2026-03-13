import type {ConfigState} from '../types';

interface SampleEnv {
  readonly VITE_TOKEN_TREK?: string;
  readonly VITE_TOKEN_FASHION?: string;
  readonly VITE_TOKEN_ELECTRONICS?: string;
}

const env = import.meta.env as ImportMetaEnv & SampleEnv;

export interface SampleConfig extends Omit<ConfigState, 'accessToken' | 'trackingId'> {
  name: string;
  description?: string;
  accessToken?: string;
}

export const SAMPLE_CONFIGS: SampleConfig[] = [
  {
    name: 'Trek Bicycle (Non-Prod US)',
    description: 'US Platform - Non-Production Environment',
    organizationId: 'trekbicyclenonproduction12228vugc',
    accessToken: env.VITE_TOKEN_TREK || '',
    platformUrl: 'https://platform.cloud.coveo.com',
  },
  {
    name: 'Fashion Store (Demo CA)',
    description: 'Canada Platform - Demo Environment',
    organizationId: 'fashionstore_demo',
    accessToken: env.VITE_TOKEN_FASHION || '',
    platformUrl: 'https://platform-ca.cloud.coveo.com',
  },
  {
    name: 'Electronics EMEA (Prod EU)',
    description: 'Europe Platform - Production',
    organizationId: 'electronics_emea',
    accessToken: env.VITE_TOKEN_ELECTRONICS || '',
    platformUrl: 'https://platform-eu.cloud.coveo.com',
  },
];
