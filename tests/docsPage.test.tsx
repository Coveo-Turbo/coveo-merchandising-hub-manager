import type {ReactNode} from 'react';
import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
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
  it('renders the docs index and markdown content from repo sources', () => {
    const {container} = render(<DocsPage />);

    expect(screen.getAllByRole('link', {name: 'Getting started'})[0]).toBeTruthy();
    expect(screen.getAllByRole('link', {name: 'Import API'})[0]).toBeTruthy();
    expect(screen.getAllByRole('link', {name: 'Ranking rules'})[0]).toBeTruthy();
    expect(screen.getAllByRole('link', {name: 'Automation examples'})[0]).toBeTruthy();

    expect(screen.getByRole('heading', {name: 'API Documentation'})).toBeTruthy();
    expect(screen.getAllByText('POST /api/import')[0]).toBeTruthy();
    expect(container.querySelector('table')).not.toBeNull();
    expect(container.querySelector('pre')).not.toBeNull();
  });

  it('rewrites repo-relative markdown links to in-page anchors when possible', () => {
    render(<DocsPage />);

    const apiReferenceLink = screen.getAllByRole('link', {name: 'Import API reference'})[0];
    const rankingRulesLink = screen.getAllByRole('link', {name: 'Ranking Rules guide'})[0];

    expect(apiReferenceLink.getAttribute('href')).toBe('#api-reference');
    expect(rankingRulesLink.getAttribute('href')).toBe('#ranking-rules');
  });
});
