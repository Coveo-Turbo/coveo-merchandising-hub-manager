import {getReleasesPageUrl} from '../core/env';

const extensionAssetName = 'cmh-manager-extension.zip';
const releasesApiUrl = 'https://api.github.com/repos/Coveo-Turbo/coveo-merchandising-hub-manager/releases?per_page=20';

interface GitHubReleaseAssetResponse {
  name: string;
  browser_download_url: string;
}

interface GitHubReleaseResponse {
  tag_name: string;
  name: string | null;
  html_url: string;
  body: string | null;
  published_at: string | null;
  draft: boolean;
  prerelease: boolean;
  assets: GitHubReleaseAssetResponse[];
}

export interface ReleaseNote {
  tagName: string;
  title: string;
  htmlUrl: string;
  body: string;
  publishedAt: string | null;
  extensionDownloadUrl: string | null;
}

export const normalizeGitHubRelease = (release: GitHubReleaseResponse): ReleaseNote => {
  const extensionAsset = release.assets.find((asset) => asset.name === extensionAssetName);

  return {
    tagName: release.tag_name,
    title: release.name?.trim() || release.tag_name,
    htmlUrl: release.html_url,
    body: release.body?.trim() || 'No release notes were generated for this version.',
    publishedAt: release.published_at,
    extensionDownloadUrl: extensionAsset?.browser_download_url ?? null,
  };
};

export const fetchGitHubReleases = async (fetchImpl: typeof fetch = fetch) => {
  const response = await fetchImpl(releasesApiUrl, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    const isRateLimit = response.status === 403 || response.status === 429;
    throw new Error(
      isRateLimit
        ? 'GitHub rate limits are preventing CMH Manager from loading release notes right now.'
        : `Unable to load GitHub releases (HTTP ${response.status}).`,
    );
  }

  const releases = (await response.json()) as GitHubReleaseResponse[];

  return releases.filter((release) => !release.draft && !release.prerelease).slice(0, 10).map(normalizeGitHubRelease);
};

export const getReleaseFeedFallbackUrl = () => getReleasesPageUrl();
