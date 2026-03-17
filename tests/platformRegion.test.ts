import {describe, expect, it} from 'vitest';
import {resolvePlatformRegionFromUrl} from '../src/utils/platformRegion';

describe('resolvePlatformRegionFromUrl', () => {
  it('maps the supported Coveo platform hosts to deployer regions', () => {
    expect(resolvePlatformRegionFromUrl('https://platform.cloud.coveo.com')).toBe('us');
    expect(resolvePlatformRegionFromUrl('https://platform-ca.cloud.coveo.com')).toBe('ca');
    expect(resolvePlatformRegionFromUrl('https://platform-eu.cloud.coveo.com')).toBe('eu');
    expect(resolvePlatformRegionFromUrl('https://platform-au.cloud.coveo.com')).toBe('au');
  });

  it('returns undefined for unrecognized or invalid URLs', () => {
    expect(resolvePlatformRegionFromUrl('https://custom.example.com')).toBeUndefined();
    expect(resolvePlatformRegionFromUrl('not-a-url')).toBeUndefined();
  });
});
