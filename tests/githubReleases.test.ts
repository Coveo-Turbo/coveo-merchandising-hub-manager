import {describe, expect, it, vi} from 'vitest';
import {fetchGitHubReleases, normalizeGitHubRelease} from '../src/services/githubReleases';

describe('github release feed', () => {
  it('normalizes the release payload and selects the extension asset when present', () => {
    const normalized = normalizeGitHubRelease({
      tag_name: 'v1.3.0',
      name: 'v1.3.0',
      html_url: 'https://github.com/Coveo-Turbo/coveo-merchandising-hub-manager/releases/tag/v1.3.0',
      body: '## What\'s Changed',
      published_at: '2026-06-02T19:44:28Z',
      draft: false,
      prerelease: false,
      assets: [
        {name: 'notes.txt', browser_download_url: 'https://example.com/notes.txt'},
        {
          name: 'cmh-manager-extension.zip',
          browser_download_url: 'https://example.com/cmh-manager-extension.zip',
        },
      ],
    });

    expect(normalized).toEqual({
      tagName: 'v1.3.0',
      title: 'v1.3.0',
      htmlUrl: 'https://github.com/Coveo-Turbo/coveo-merchandising-hub-manager/releases/tag/v1.3.0',
      body: '## What\'s Changed',
      publishedAt: '2026-06-02T19:44:28Z',
      extensionDownloadUrl: 'https://example.com/cmh-manager-extension.zip',
    });
  });

  it('filters draft and prerelease versions and keeps the latest 10 published releases', async () => {
    const releases = Array.from({length: 12}, (_, index) => ({
      tag_name: `v1.${index}.0`,
      name: `v1.${index}.0`,
      html_url: `https://example.com/releases/v1.${index}.0`,
      body: `Release ${index}`,
      published_at: `2026-06-${String(index + 1).padStart(2, '0')}T00:00:00Z`,
      draft: index === 1,
      prerelease: index === 2,
      assets: [],
    }));

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(releases), {
        status: 200,
        headers: {'Content-Type': 'application/json'},
      }),
    );

    const normalized = await fetchGitHubReleases(fetchMock);

    expect(normalized).toHaveLength(10);
    expect(normalized.some((release) => release.tagName === 'v1.1.0')).toBe(false);
    expect(normalized.some((release) => release.tagName === 'v1.2.0')).toBe(false);
  });

  it('surfaces rate-limit failures with a helpful error message', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('rate limited', {status: 403}));

    await expect(fetchGitHubReleases(fetchMock)).rejects.toThrow('GitHub rate limits');
  });
});
