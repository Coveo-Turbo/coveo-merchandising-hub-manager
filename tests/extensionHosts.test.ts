import {describe, expect, it} from 'vitest';
import {extensionPageMatches, inferPlatformUrlFromHostname} from '../src/extension/hosts';

describe('extension hosts', () => {
  it('loads on both commerce and platform Coveo domains', () => {
    expect(extensionPageMatches).toEqual(
      expect.arrayContaining([
        'https://commerce.cloud.coveo.com/*',
        'https://commerce-ca.cloud.coveo.com/*',
        'https://commerce-eu.cloud.coveo.com/*',
        'https://commerce-au.cloud.coveo.com/*',
        'https://platform.cloud.coveo.com/*',
        'https://platform-ca.cloud.coveo.com/*',
        'https://platform-eu.cloud.coveo.com/*',
        'https://platform-au.cloud.coveo.com/*',
      ]),
    );
  });

  it('maps both commerce and platform regional hosts to the right platform base URL', () => {
    expect(inferPlatformUrlFromHostname('commerce.cloud.coveo.com')).toBe('https://platform.cloud.coveo.com');
    expect(inferPlatformUrlFromHostname('commerce-ca.cloud.coveo.com')).toBe('https://platform-ca.cloud.coveo.com');
    expect(inferPlatformUrlFromHostname('platform-eu.cloud.coveo.com')).toBe('https://platform-eu.cloud.coveo.com');
    expect(inferPlatformUrlFromHostname('platform-au.cloud.coveo.com')).toBe('https://platform-au.cloud.coveo.com');
  });
});
