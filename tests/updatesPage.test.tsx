import type {ReactNode} from 'react';
import {render, screen, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {UpdatesPage} from '../src/features/updates/UpdatesPage';

const {mockFetchGitHubReleases} = vi.hoisted(() => ({
  mockFetchGitHubReleases: vi.fn(),
}));

vi.mock('../src/services/githubReleases', () => ({
  fetchGitHubReleases: mockFetchGitHubReleases,
  getReleaseFeedFallbackUrl: () => 'https://github.com/Coveo-Turbo/coveo-merchandising-hub-manager/releases',
}));

vi.mock('@coveord/plasma-mantine', () => {
  const Button = ({
    children,
    component,
    href,
  }: {
    children: ReactNode;
    component?: string;
    href?: string;
  }) =>
    component === 'a' ? <a href={href}>{children}</a> : <button>{children}</button>;

  return {
    Alert: ({children, title}: {children: ReactNode; title?: string}) => (
      <div>
        {title ? <div>{title}</div> : null}
        {children}
      </div>
    ),
    Badge: ({children}: {children: ReactNode}) => <span>{children}</span>,
    Button,
    Card: ({children}: {children: ReactNode}) => <section>{children}</section>,
    Group: ({children}: {children: ReactNode}) => <div>{children}</div>,
    Header: ({children, description}: {children: ReactNode; description?: string}) => (
      <div>
        <h1>{children}</h1>
        {description ? <p>{description}</p> : null}
      </div>
    ),
    Stack: ({children}: {children: ReactNode}) => <div>{children}</div>,
    Text: ({children}: {children: ReactNode}) => <span>{children}</span>,
  };
});

vi.mock('@coveord/plasma-react-icons', () => ({
  IconAlertTriangle: () => <span />,
  IconDownload: () => <span />,
  IconExternalLink: () => <span />,
}));

describe('UpdatesPage', () => {
  it('renders release notes from the GitHub release feed', async () => {
    mockFetchGitHubReleases.mockResolvedValue([
      {
        tagName: 'v1.3.0',
        title: 'v1.3.0',
        htmlUrl: 'https://github.com/Coveo-Turbo/coveo-merchandising-hub-manager/releases/tag/v1.3.0',
        body: '## What changed\n\n- Added docs',
        publishedAt: '2026-06-02T19:44:28Z',
        extensionDownloadUrl: 'https://example.com/cmh-manager-extension.zip',
      },
    ]);

    render(<UpdatesPage />);

    await waitFor(() => expect(screen.getByText('v1.3.0')).toBeTruthy());

    expect(screen.getByText('Latest')).toBeTruthy();
    expect(screen.getByRole('link', {name: 'Download extension'}).getAttribute('href')).toBe(
      'https://example.com/cmh-manager-extension.zip',
    );
    expect(screen.getByText('What changed')).toBeTruthy();
  });

  it('shows the GitHub fallback state when release loading fails', async () => {
    mockFetchGitHubReleases.mockRejectedValue(new Error('GitHub rate limits are preventing CMH Manager from loading release notes right now.'));

    render(<UpdatesPage />);

    await waitFor(() => expect(screen.getByText('Release notes unavailable')).toBeTruthy());

    expect(screen.getByRole('link', {name: 'View releases on GitHub'}).getAttribute('href')).toBe(
      'https://github.com/Coveo-Turbo/coveo-merchandising-hub-manager/releases',
    );
  });
});
