export const extensionPageMatches = [
  'https://commerce.cloud.coveo.com/*',
  'https://commerce-ca.cloud.coveo.com/*',
  'https://commerce-eu.cloud.coveo.com/*',
  'https://commerce-au.cloud.coveo.com/*',
  'https://platform.cloud.coveo.com/*',
  'https://platform-ca.cloud.coveo.com/*',
  'https://platform-eu.cloud.coveo.com/*',
  'https://platform-au.cloud.coveo.com/*',
];

export const inferPlatformUrlFromHostname = (hostname: string) => {
  if (hostname.includes('-ca.')) {
    return 'https://platform-ca.cloud.coveo.com';
  }
  if (hostname.includes('-eu.')) {
    return 'https://platform-eu.cloud.coveo.com';
  }
  if (hostname.includes('-au.')) {
    return 'https://platform-au.cloud.coveo.com';
  }
  return 'https://platform.cloud.coveo.com';
};
