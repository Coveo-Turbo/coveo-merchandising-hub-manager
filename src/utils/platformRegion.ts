const toHostname = (platformUrl: string) => {
  try {
    return new URL(platformUrl).hostname.toLowerCase();
  } catch {
    return '';
  }
};

export const resolvePlatformRegionFromUrl = (platformUrl: string) => {
  const hostname = toHostname(platformUrl);

  if (!hostname) {
    return undefined;
  }

  if (hostname === 'platform.cloud.coveo.com') {
    return 'us';
  }

  if (hostname === 'platform-ca.cloud.coveo.com') {
    return 'ca';
  }

  if (hostname === 'platform-eu.cloud.coveo.com') {
    return 'eu';
  }

  if (hostname === 'platform-au.cloud.coveo.com') {
    return 'au';
  }

  return undefined;
};
