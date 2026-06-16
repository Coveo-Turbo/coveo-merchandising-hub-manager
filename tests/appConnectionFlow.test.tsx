import type {ButtonHTMLAttributes, ReactNode} from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {AppContent, EmbeddedLayout, StandaloneLayout} from '../src/App';
import type {ManagerController} from '../src/hooks/useManagerController';
import type {SessionContext} from '../src/types';

const mockedUseManagerController = vi.fn();

vi.mock('../src/hooks/useManagerController', () => ({
  useManagerController: mockedUseManagerController,
}));

vi.mock('../src/features/connection/ConnectionSection', () => ({
  ConnectionSection: () => <div>Connection Section</div>,
}));

vi.mock('../src/features/listings/ListingsSection', () => ({
  ListingsSection: () => <div>Listings Section</div>,
}));

vi.mock('../src/features/global-config/GlobalConfigSection', () => ({
  GlobalConfigSection: () => <div>Global Config Section</div>,
}));

vi.mock('../src/features/context-mappings/ContextMappingsSection', () => ({
  ContextMappingsSection: () => <div>Context Mappings Section</div>,
}));

vi.mock('../src/features/rules/RulesSection', () => ({
  RulesSection: () => <div>Rules Section</div>,
}));

vi.mock('../src/features/maintenance/MaintenanceSection', () => ({
  MaintenanceSection: () => <div>Maintenance Section</div>,
}));

vi.mock('@coveord/plasma-mantine', () => {
  const AppShell = ({children}: {children: ReactNode}) => <div>{children}</div>;
  AppShell.Header = ({children}: {children: ReactNode}) => <div>{children}</div>;
  AppShell.Navbar = ({children}: {children: ReactNode}) => <div>{children}</div>;
  AppShell.Main = ({children}: {children: ReactNode}) => <div>{children}</div>;

  const Tabs = ({children}: {children: ReactNode}) => <div>{children}</div>;
  Tabs.List = ({children}: {children: ReactNode}) => <div>{children}</div>;
  Tabs.Tab = ({children, value}: {children: ReactNode; value: string}) => <button data-value={value}>{children}</button>;

  return {
    Alert: ({children, title}: {children: ReactNode; title?: string}) => (
      <div>
        {title ? <div>{title}</div> : null}
        {children}
      </div>
    ),
    AppShell,
    Badge: ({children}: {children: ReactNode}) => <span>{children}</span>,
    Burger: ({...props}: ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
    Button: ({children, leftSection, loading, ...props}: ButtonHTMLAttributes<HTMLButtonElement> & {leftSection?: ReactNode; loading?: boolean}) => {
      void leftSection;
      void loading;
      return <button {...props}>{children}</button>;
    },
    Group: ({children}: {children: ReactNode}) => <div>{children}</div>,
    Header: ({children, description}: {children: ReactNode; description?: string}) => (
      <div>
        <h1>{children}</h1>
        {description ? <p>{description}</p> : null}
      </div>
    ),
    Image: ({alt}: {alt?: string}) => <img alt={alt} />,
    NavLink: ({label, onClick}: {label: string; onClick?: () => void}) => <button onClick={onClick}>{label}</button>,
    Paper: ({children}: {children: ReactNode}) => <div>{children}</div>,
    Plasmantine: ({children}: {children: ReactNode}) => <div>{children}</div>,
    Select: ({
      data = [],
      value,
      onChange,
      'aria-label': ariaLabel,
      placeholder,
    }: {
      data?: Array<{value: string; label: string}>;
      value?: string | null;
      onChange?: (value: string | null) => void;
      placeholder?: string;
      'aria-label'?: string;
    }) => (
      <select
        aria-label={ariaLabel || placeholder}
        value={value ?? ''}
        onChange={(event) => onChange?.(event.currentTarget.value || null)}
      >
        <option value="">Select</option>
        {data.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    Stack: ({children}: {children: ReactNode}) => <div>{children}</div>,
    Tabs,
    Text: ({children}: {children: ReactNode}) => <span>{children}</span>,
  };
});

vi.mock('@coveord/plasma-react-icons', () => new Proxy({}, {get: () => () => <span />})); 

const session: SessionContext = {
  organizationId: 'my-org',
  trackingId: 'storefront-a',
  trackingIds: ['storefront-a', 'storefront-b'],
  accessToken: 'token-123',
  platformUrl: 'https://platform.cloud.coveo.com',
  source: 'manual',
};

const createController = (overrides: Partial<ManagerController> = {}): ManagerController =>
  ({
    runtime: 'standalone',
    session: null,
    connectionForm: {
      organizationId: '',
      trackingId: '',
      accessToken: '',
      platformUrl: 'https://platform.cloud.coveo.com',
    },
    connectionStatus: 'disconnected',
    hasResolvedInitialContext: true,
    loading: false,
    status: null,
    troubleshootDeployForm: {hostedPageName: '', hostedPageId: '', trackingId: '', dryRun: false},
    troubleshootDeployResult: null,
    listingStep: 1,
    parsedListings: [],
    globalConfigType: 'search',
    globalConfigData: null,
    globalConfigExists: null,
    globalConfigString: '',
    contextMappingsData: [],
    contextMappingsString: '[]',
    contextMappingsValidationError: null,
    sharedSettings: null,
    pendingSortLabels: [],
    pendingSortLang: 'en',
    pendingSortLabelValue: '',
    rankingRulesData: [],
    rankingRulesJSON: '',
    rankingRulesSolutionType: 'listing',
    rankingRulesType: 'ranking',
    isDeleteConfirming: false,
    showManualConnection: false,
    devMode: false,
    availableTrackingIds: [],
    isSessionReady: false,
    qc: null,
    handleVersionClick: vi.fn(),
    handleConnectionFieldChange: vi.fn(),
    connectManually: vi.fn(),
    disconnect: vi.fn(),
    refreshResolvedContext: vi.fn(),
    switchTrackingId: vi.fn(),
    handleFileUpload: vi.fn(),
    enhanceListing: vi.fn(),
    submitListings: vi.fn(),
    fetchGlobalConfig: vi.fn(),
    saveGlobalConfig: vi.fn(),
    setGlobalConfigType: vi.fn(),
    setGlobalConfigString: vi.fn(),
    fetchContextMappings: vi.fn(),
    saveContextMappings: vi.fn(),
    setContextMappingsString: vi.fn(),
    addContextMapping: vi.fn(),
    updateContextMapping: vi.fn(),
    removeContextMapping: vi.fn(),
    loadContextMappingsFile: vi.fn(),
    exportContextMappings: vi.fn(),
    copySharedSettings: vi.fn(),
    pasteSharedSettings: vi.fn(),
    addAdditionalField: vi.fn(),
    removeAdditionalField: vi.fn(),
    setPendingSortLang: vi.fn(),
    setPendingSortLabelValue: vi.fn(),
    addPendingSortLabel: vi.fn(),
    removePendingSortLabel: vi.fn(),
    addSort: vi.fn(),
    removeSort: vi.fn(),
    updateQueryConfigField: vi.fn(),
    fetchRankingRules: vi.fn(),
    exportRankingRules: vi.fn(),
    loadRankingRulesFile: vi.fn(),
    importRankingRules: vi.fn(),
    setRankingRulesSolutionType: vi.fn(),
    setRankingRulesType: vi.fn(),
    exportAllListings: vi.fn(),
    deleteAllListings: vi.fn(),
    updateTroubleshootDeployForm: vi.fn(),
    deployTroubleshootConsole: vi.fn(),
    resetListings: vi.fn(),
    setIsDeleteConfirming: vi.fn(),
    setShowManualConnection: vi.fn(),
    loadSampleConfig: vi.fn(),
    setStatus: vi.fn(),
    ...overrides,
  }) as ManagerController;

describe('App connection flow', () => {
  beforeEach(() => {
    mockedUseManagerController.mockReset();
    window.history.replaceState({}, '', '/');
  });

  it('redirects disconnected users to the connection workspace by default', async () => {
    mockedUseManagerController.mockReturnValue(createController());

    render(
      <AppContent
        runtime="standalone"
        transport={{request: vi.fn()}}
        contextResolver={{resolve: vi.fn(), refresh: vi.fn(), disconnect: vi.fn()}}
      />,
    );

    await waitFor(() => expect(screen.getByText('Connection Section')).toBeTruthy());
    expect(new URLSearchParams(window.location.search).get('section')).toBe('connection');
  });

  it('routes the embedded open-connection CTA to the connection workspace', () => {
    const setSection = vi.fn();

    render(
      <EmbeddedLayout
        controller={createController({runtime: 'extension'})}
        section="listings"
        setSection={setSection}
      />,
    );

    fireEvent.click(screen.getByRole('button', {name: 'Open connection form'}));

    expect(setSection).toHaveBeenCalledWith('connection');
  });

  it('keeps the tracking selector available in the shell once connected', () => {
    render(
      <StandaloneLayout
        controller={createController({
          session,
          availableTrackingIds: session.trackingIds,
          isSessionReady: true,
        })}
        section="connection"
        setSection={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Tracking ID')).toBeTruthy();
  });
});
