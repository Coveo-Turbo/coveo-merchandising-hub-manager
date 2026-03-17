import {defineManifest} from '@crxjs/vite-plugin';

const commerceMatches = [
  'https://commerce.cloud.coveo.com/*',
  'https://commerce-ca.cloud.coveo.com/*',
  'https://commerce-eu.cloud.coveo.com/*',
  'https://commerce-au.cloud.coveo.com/*',
];

export default defineManifest({
  manifest_version: 3,
  name: 'CMH Manager',
  version: '1.2.2',
  description: 'Blend CMH Manager into Coveo Merchandising Hub while keeping the standalone web app available.',
  permissions: ['storage', 'tabs'],
  host_permissions: [
    'https://platform.cloud.coveo.com/*',
    'https://platform-ca.cloud.coveo.com/*',
    'https://platform-eu.cloud.coveo.com/*',
    'https://platform-au.cloud.coveo.com/*',
  ],
  background: {
    service_worker: 'src/extension/background.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: commerceMatches,
      js: ['src/extension/contentScript.tsx'],
      run_at: 'document_idle',
    },
  ],
  web_accessible_resources: [
    {
      matches: commerceMatches,
      resources: [],
    },
  ],
});
