import type {ReactNode} from 'react';
import {act, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {DocsPage} from '../src/features/docs/DocsPage';

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
    Badge: ({children}: {children: ReactNode}) => <span>{children}</span>,
    Button,
    Card: ({children, id}: {children: ReactNode; id?: string}) => <section id={id}>{children}</section>,
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
  IconExternalLink: () => <span />,
}));

describe('DocsPage', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/docs');
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/docs');
  });

  it('renders the selected article and lets users switch guides through the docs navigation', async () => {
    render(<DocsPage />);

    expect(screen.getAllByRole('link', {name: 'Architecture overview'})[0]).toBeTruthy();
    expect(screen.getAllByRole('link', {name: 'Getting started'})[0]).toBeTruthy();
    expect(screen.getAllByRole('link', {name: 'Import API'})[0]).toBeTruthy();
    expect(screen.getAllByRole('link', {name: 'Ranking rules'})[0]).toBeTruthy();
    expect(screen.getAllByRole('link', {name: 'Automation examples'})[0]).toBeTruthy();

    expect(screen.getByRole('heading', {name: 'Architecture Overview'})).toBeTruthy();
    expect(screen.getByAltText('CMH Manager end-to-end architecture overview')).toBeTruthy();

    await act(async () => {
      window.history.replaceState({}, '', '/docs#api-reference');
      window.dispatchEvent(new Event('hashchange'));
    });

    await waitFor(() => expect(screen.getByRole('heading', {name: 'API Documentation'})).toBeTruthy());

    expect(screen.getAllByText('POST /api/import')[0]).toBeTruthy();
  });

  it('rewrites repo-relative markdown links to in-page anchors when possible', () => {
    window.history.replaceState({}, '', '/docs#getting-started');
    render(<DocsPage />);

    const apiReferenceLink = screen.getAllByRole('link', {name: 'Import API reference'})[0];
    const rankingRulesLink = screen.getAllByRole('link', {name: 'Ranking Rules guide'})[0];

    expect(apiReferenceLink.getAttribute('href')).toBe('#api-reference');
    expect(rankingRulesLink.getAttribute('href')).toBe('#ranking-rules');
  });
});
