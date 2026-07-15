import {defineManifest} from '@crxjs/vite-plugin';
import {extensionPageMatches} from './hosts';

export default defineManifest({
  manifest_version: 3,
  name: 'CMH Manager',
  version: '1.4.2',
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
      matches: extensionPageMatches,
      js: ['src/extension/contentScript.tsx'],
      run_at: 'document_idle',
    },
  ],
  web_accessible_resources: [
    {
      matches: extensionPageMatches,
      resources: [],
    },
  ],
});
