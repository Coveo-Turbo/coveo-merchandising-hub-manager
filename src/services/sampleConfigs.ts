
import type { ConfigState } from '../types';

export interface SampleConfig extends Omit<ConfigState, 'accessToken' | 'trackingId'> {
    name: string;
    description?: string;
    accessToken?: string;
}

export const SAMPLE_CONFIGS: SampleConfig[] = [
    {
        name: "Trek Bicycle (Non-Prod US)",
        description: "US Platform - Non-Production Environment",
        organizationId: "trekbicyclenonproduction12228vugc",
        // Access tokens should be stored in .env.local using VITE_ prefix
        // Fixed: Use process.env instead of import.meta.env to match project type definitions
        accessToken: process.env.VITE_TOKEN_TREK || "", 
        platformUrl: "https://platform.cloud.coveo.com"
    },
    {
        name: "Fashion Store (Demo CA)",
        description: "Canada Platform - Demo Environment",
        organizationId: "fashionstore_demo",
        accessToken: process.env.VITE_TOKEN_FASHION || "",
        platformUrl: "https://platform-ca.cloud.coveo.com"
    },
    {
        name: "Electronics EMEA (Prod EU)",
        description: "Europe Platform - Production",
        organizationId: "electronics_emea",
        accessToken: process.env.VITE_TOKEN_ELECTRONICS || "",
        platformUrl: "https://platform-eu.cloud.coveo.com"
    }
];
