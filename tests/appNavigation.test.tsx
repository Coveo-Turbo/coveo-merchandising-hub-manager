import type {ImgHTMLAttributes, ReactNode} from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import App from '../src/App';

const {mockUseManagerController} = vi.hoisted(() => ({
  mockUseManagerController: vi.fn(),
}));

vi.mock('../src/hooks/useManagerController', () => ({
  useManagerController: mockUseManagerController,
}));

vi.mock('../src/core/env', () => ({
  getLatestExtensionDownloadUrl: () => 'https://example.com/download.zip',
  getStandaloneDocsUrl: () => 'https://cmh.example.com/docs',
  getStandaloneUpdatesUrl: () => 'https://cmh.example.com/updates',
}));

vi.mock('../src/features/listings/ListingsSection', () => ({
  ListingsSection: () => <div>Listings section</div>,
}));

vi.mock('../src/features/global-config/GlobalConfigSection', () => ({
  GlobalConfigSection: () => <div>Global Config section</div>,
}));

vi.mock('../src/features/context-mappings/ContextMappingsSection', () => ({
  ContextMappingsSection: () => <div>Context Mappings section</div>,
}));

vi.mock('../src/features/rules/RulesSection', () => ({
  RulesSection: () => <div>Rules section</div>,
}));

vi.mock('../src/features/maintenance/MaintenanceSection', () => ({
  MaintenanceSection: () => <div>Maintenance section</div>,
}));

vi.mock('../src/features/docs/DocsPage', () => ({
  DocsPage: () => <div>Docs page</div>,
}));

vi.mock('../src/features/updates/UpdatesPage', () => ({
  UpdatesPage: () => <div>Updates page</div>,
}));

vi.mock('@coveord/plasma-mantine', () => {
  const AppShell = ({children}: {children: ReactNode}) => <div>{children}</div>;
  AppShell.Header = ({children}: {children: ReactNode}) => <header>{children}</header>;
  AppShell.Navbar = ({children}: {children: ReactNode}) => <nav>{children}</nav>;
  AppShell.Main = ({children}: {children: ReactNode}) => <main>{children}</main>;

  const Button = ({
    children,
    component,
    href,
    onClick,
  }: {
    children: ReactNode;
    component?: string;
    href?: string;
    onClick?: () => void;
  }) =>
    component === 'a' ? (
      <a href={href} onClick={onClick}>
        {children}
      </a>
    ) : (
      <button onClick={onClick}>{children}</button>
    );

  const NavLink = ({label, onClick, active}: {label: string; onClick?: () => void; active?: boolean}) => (
    <button aria-pressed={active} onClick={onClick}>
      {label}
    </button>
  );

  const Tabs = ({children}: {children: ReactNode}) => <div>{children}</div>;
  Tabs.List = ({children}: {children: ReactNode}) => <div>{children}</div>;
  Tabs.Tab = ({children, value, onClick}: {children: ReactNode; value?: string; onClick?: () => void}) => (
    <button data-value={value} onClick={onClick}>
      {children}
    </button>
  );

  return {
    Alert: ({children, title}: {children: ReactNode; title?: string}) => (
      <div>
        {title ? <div>{title}</div> : null}
        {children}
      </div>
    ),
    AppShell,
    Badge: ({children}: {children: ReactNode}) => <span>{children}</span>,
    Burger: ({onClick}: {onClick?: () => void}) => <button onClick={onClick}>Toggle navigation</button>,
    Button,
    Group: ({children}: {children: ReactNode}) => <div>{children}</div>,
    Header: ({children, description}: {children: ReactNode; description?: string}) => (
      <div>
        <h1>{children}</h1>
        {description ? <p>{description}</p> : null}
      </div>
    ),
    Image: ({alt, src}: ImgHTMLAttributes<HTMLImageElement>) => <img alt={alt} src={src} />,
    NavLink,
    Paper: ({children}: {children: ReactNode}) => <div>{children}</div>,
    Plasmantine: ({children}: {children: ReactNode}) => <>{children}</>,
    Select: ({
      value,
      onChange,
      data,
      'aria-label': ariaLabel,
    }: {
      value?: string | null;
      onChange?: (value: string) => void;
      data?: Array<{value: string; label: string}>;
      'aria-label'?: string;
    }) => (
      <select aria-label={ariaLabel} value={value ?? ''} onChange={(event) => onChange?.(event.currentTarget.value)}>
        {(data ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    Stack: ({children}: {children: ReactNode}) => <div>{children}</div>,
    Tabs,
    Text: ({children, onClick}: {children: ReactNode; onClick?: () => void}) => <span onClick={onClick}>{children}</span>,
  };
});

vi.mock('@coveord/plasma-react-icons', () => ({
  IconCode: () => <span />,
  IconDownload: () => <span />,
  IconLayoutList: () => <span />,
  IconLogout: () => <span />,
  IconRefreshAlert: () => <span />,
  IconSettings: () => <span />,
  IconSparkles: () => <span />,
  IconX: () => <span />,
}));

const baseController = () => ({
  session: null,
  availableTrackingIds: [],
  status: null,
  loading: false,
  globalConfigType: 'search',
  fetchGlobalConfig: vi.fn(),
  fetchContextMappings: vi.fn(),
  setStatus: vi.fn(),
  handleVersionClick: vi.fn(),
  switchTrackingId: vi.fn(),
  disconnect: vi.fn(),
  refreshResolvedContext: vi.fn(),
});

describe('app navigation', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    vi.stubGlobal('__APP_VERSION__', '1.3.0');
    mockUseManagerController.mockReturnValue(baseController());
  });

  it('loads the manager on / and navigates to /docs from the top nav button', () => {
    render(
      <App
        runtime="standalone"
        transport={{request: vi.fn()}}
        contextResolver={{resolve: vi.fn(), refresh: vi.fn(), disconnect: vi.fn()}}
      />,
    );

    expect(screen.getByText('Listings section')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', {name: 'Docs'}));

    expect(window.location.pathname).toBe('/docs');
    expect(screen.getByText('Docs page')).toBeTruthy();
  });

  it('renders the docs page directly when the pathname is /docs', () => {
    window.history.replaceState({}, '', '/docs');

    render(
      <App
        runtime="standalone"
        transport={{request: vi.fn()}}
        contextResolver={{resolve: vi.fn(), refresh: vi.fn(), disconnect: vi.fn()}}
      />,
    );

    expect(screen.getByText('Docs page')).toBeTruthy();
  });

  it('uses standalone docs and updates URLs for the embedded top actions', () => {
    render(
      <App
        runtime="extension"
        transport={{request: vi.fn()}}
        contextResolver={{resolve: vi.fn(), refresh: vi.fn(), disconnect: vi.fn()}}
        onExitEmbedded={vi.fn()}
      />,
    );

    const docsLink = screen.getByRole('link', {name: 'Docs'});
    const updatesLink = screen.getByRole('link', {name: "What's new"});

    expect(docsLink.getAttribute('href')).toBe('https://cmh.example.com/docs');
    expect(updatesLink.getAttribute('href')).toBe('https://cmh.example.com/updates');
  });
});
