import {useEffect, useRef} from 'react';
import {useDisclosure} from '@mantine/hooks';

import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';

import {
  Alert,
  AppShell,
  Badge,
  Burger,
  Button,
  Group,
  Header as PlasmaHeader,
  Image,
  NavLink,
  Paper,
  Plasmantine,
  Select,
  Stack,
  Tabs,
  Text,
} from '@coveord/plasma-mantine';
import {
  IconCode,
  IconDownload,
  IconLayoutList,
  IconLogout,
  IconRefreshAlert,
  IconSettings,
  IconSparkles,
  IconX,
} from '@coveord/plasma-react-icons';
import type {ApiTransport, ContextResolver, SessionStore} from './core/contracts';
import {getRequiredSection} from './appRouting';
import {getLatestExtensionDownloadUrl, getStandaloneDocsUrl, getStandaloneUpdatesUrl} from './core/env';
import {ConnectionSection} from './features/connection/ConnectionSection';
import {ContextMappingsSection} from './features/context-mappings/ContextMappingsSection';
import {DocsPage} from './features/docs/DocsPage';
import {GlobalConfigSection} from './features/global-config/GlobalConfigSection';
import {ListingsSection} from './features/listings/ListingsSection';
import {MaintenanceSection} from './features/maintenance/MaintenanceSection';
import {RulesSection} from './features/rules/RulesSection';
import {UpdatesPage} from './features/updates/UpdatesPage';
import {useAppPage} from './hooks/useAppPage';
import {useManagerController} from './hooks/useManagerController';
import {useUrlSection} from './hooks/useUrlSection';
import type {AppPage, AppSection, EmbeddedAppearance} from './types';

export interface AppProps {
  runtime: 'standalone' | 'extension';
  transport: ApiTransport;
  contextResolver: ContextResolver;
  sessionStore?: SessionStore;
  onExitEmbedded?: () => void;
  embeddedAppearance?: EmbeddedAppearance;
}

const navItems: Array<{id: AppSection; label: string; icon: typeof IconLayoutList}> = [
  {id: 'connection', label: 'Connection', icon: IconRefreshAlert},
  {id: 'listings', label: 'Listings', icon: IconLayoutList},
  {id: 'global-config', label: 'Global Config', icon: IconCode},
  {id: 'context-mappings', label: 'Context Mappings', icon: IconRefreshAlert},
  {id: 'rules', label: 'Rules', icon: IconSparkles},
  {id: 'maintenance', label: 'Maintenance', icon: IconSettings},
];

const renderSection = (section: AppSection, controller: ReturnType<typeof useManagerController>) => {
  switch (section) {
    case 'connection':
      return <ConnectionSection controller={controller} />;
    case 'global-config':
      return <GlobalConfigSection controller={controller} />;
    case 'context-mappings':
      return <ContextMappingsSection controller={controller} />;
    case 'rules':
      return <RulesSection controller={controller} />;
    case 'maintenance':
      return <MaintenanceSection controller={controller} />;
    case 'listings':
    default:
      return <ListingsSection controller={controller} />;
  }
};

const renderStatusAlert = (controller: ReturnType<typeof useManagerController>) =>
  controller.status ? (
    <Alert
      color={controller.status.type === 'success' ? 'teal' : controller.status.type === 'error' ? 'red' : 'blue'}
      variant="light"
      title={controller.status.type === 'success' ? 'Success' : controller.status.type === 'error' ? 'Error' : 'Info'}
      withCloseButton
      onClose={() => controller.setStatus(null)}
    >
      {controller.status.message}
    </Alert>
  ) : null;

const getEmbeddedSessionTone = (controller: ReturnType<typeof useManagerController>) => {
  if (!controller.session) {
    return {
      badgeColor: 'gray',
      badgeLabel: 'Not connected',
      background: 'gray.0',
      message:
        sectionlessConnectionMessage,
    };
  }

  if (controller.session.source === 'hub') {
    return {
      badgeColor: 'violet',
      badgeLabel: 'Connected to Hub',
      background: 'violet.0',
      message: `Using the current Hub session for ${controller.session.organizationName || controller.session.organizationId} and ${
        controller.session.propertyName || controller.session.trackingId
      }.`,
    };
  }

  return {
    badgeColor: 'teal',
    badgeLabel: 'Manual session',
    background: 'teal.0',
    message: `Using manually provided credentials for ${controller.session.organizationName || controller.session.organizationId} and ${
      controller.session.propertyName || controller.session.trackingId
    }.`,
  };
};

const sectionlessConnectionMessage =
  'Refresh Hub context to reuse the current page session, or open the connection workspace to connect manually.';

const embeddedBoldWeight = 'var(--coveo-fw-bold, 600)';
const extensionReleaseDownloadUrl = getLatestExtensionDownloadUrl();

const embeddedTabsStyles = {
  root: {
    '--tabs-color': 'var(--mantine-color-violet-filled)',
  },
  list: {
    gap: '1.5rem',
  },
  tab: {
    paddingTop: 0,
    paddingInline: 0,
    paddingBottom: '0.75rem',
    fontWeight: embeddedBoldWeight,
    borderRadius: 0,
  },
  tabLabel: {
    whiteSpace: 'nowrap',
  },
};

const StandalonePageLinks = ({page, setPage}: {page: AppPage; setPage: (page: AppPage) => void}) => (
  <Group gap="sm" wrap="wrap">
    <Button variant={page === 'docs' ? 'filled' : 'light'} color="violet" onClick={() => setPage('docs')}>
      Docs
    </Button>
    <Button variant={page === 'updates' ? 'filled' : 'light'} color="violet" onClick={() => setPage('updates')}>
      What&apos;s new
    </Button>
  </Group>
);

export const StandaloneLayout = ({
  controller,
  page,
  setPage,
  section,
  setSection,
  onExitEmbedded,
}: {
  controller: ReturnType<typeof useManagerController>;
  page: AppPage;
  setPage: (page: AppPage) => void;
  section: AppSection;
  setSection: (section: AppSection) => void;
  onExitEmbedded?: () => void;
}) => {
  const [mobileNavOpened, {close: closeMobileNav, toggle: toggleMobileNav}] = useDisclosure(false);
  const hasTrackingSelector = Boolean(controller.session && controller.availableTrackingIds.length > 0);
  const hasExtensionDownload = !onExitEmbedded;
  const hasUtilityActions = hasTrackingSelector || hasExtensionDownload || Boolean(controller.session) || Boolean(onExitEmbedded);
  const mobileHeaderHeight = hasUtilityActions ? 248 : 200;

  const trackingSelect = (
    <Select
      aria-label="Tracking ID"
      data={controller.availableTrackingIds.map((trackingId) => ({value: trackingId, label: trackingId}))}
      value={controller.session?.trackingId ?? null}
      onChange={(value) => value && void controller.switchTrackingId(value)}
      allowDeselect={false}
      placeholder="Select tracking ID"
    />
  );

  return (
    <AppShell
      header={{height: {base: mobileHeaderHeight, sm: 128}}}
      navbar={{width: 280, breakpoint: 'sm', collapsed: {mobile: !mobileNavOpened}}}
      padding={{base: 'md', sm: 'lg'}}
    >
      <AppShell.Header>
        <Stack h="100%" px="lg" py="sm" gap="xs" justify="center">
          <Group justify="space-between" wrap="nowrap" gap="md">
            <Group gap="md" wrap="nowrap" style={{minWidth: 0, flex: 1}}>
              <Burger hiddenFrom="sm" opened={mobileNavOpened} onClick={toggleMobileNav} size="sm" aria-label="Toggle navigation" />
              <Image src="/coveo-logo.svg" alt="Coveo" h={32} w={32} fit="contain" style={{flexShrink: 0}} />
              <Stack gap={0} style={{minWidth: 0}}>
                <Text fw={700} style={{minWidth: 0, lineHeight: 1.2}}>
                  Coveo Merchandising Hub Manager
                </Text>
                <Text
                  size="xs"
                  c="dimmed"
                  style={{cursor: 'pointer', lineHeight: 1.2, userSelect: 'none'}}
                  onClick={controller.handleVersionClick}
                  title="Click five times to toggle developer mode"
                >
                  Version {__APP_VERSION__}
                </Text>
              </Stack>
            </Group>

            <Group gap="sm" wrap="nowrap" visibleFrom="sm">
              {hasExtensionDownload && (
                <Button
                  component="a"
                  href={extensionReleaseDownloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  variant="light"
                  color="violet"
                  leftSection={<IconDownload size={16} />}
                >
                  Download extension
                </Button>
              )}
              {hasTrackingSelector && (
                <Group gap="xs" wrap="nowrap">
                  <Text size="sm" c="dimmed">
                    Tracking ID
                  </Text>
                  <div style={{width: '18rem'}}>{trackingSelect}</div>
                </Group>
              )}
              {controller.session && (
                <Button variant="default" leftSection={<IconLogout size={16} />} onClick={() => void controller.disconnect()}>
                  Disconnect
                </Button>
              )}
              {onExitEmbedded && (
                <Button variant="light" color="gray" leftSection={<IconX size={16} />} onClick={onExitEmbedded}>
                  Return to Hub
                </Button>
              )}
            </Group>
          </Group>

          {hasUtilityActions && (
            <Stack hiddenFrom="sm" gap="xs">
              {hasTrackingSelector && (
                <Stack gap={4}>
                  <Text size="sm" c="dimmed">
                    Tracking ID
                  </Text>
                  {trackingSelect}
                </Stack>
              )}

              {(controller.session || onExitEmbedded) && (
                <Group grow>
                  {controller.session && (
                    <Button variant="default" leftSection={<IconLogout size={16} />} onClick={() => void controller.disconnect()}>
                      Disconnect
                    </Button>
                  )}
                  {onExitEmbedded && (
                    <Button variant="light" color="gray" leftSection={<IconX size={16} />} onClick={onExitEmbedded}>
                      Return to Hub
                    </Button>
                  )}
                </Group>
              )}

              {hasExtensionDownload && (
                <Button
                  component="a"
                  href={extensionReleaseDownloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  variant="light"
                  color="violet"
                  leftSection={<IconDownload size={16} />}
                >
                  Download extension
                </Button>
              )}
            </Stack>
          )}

          <StandalonePageLinks page={page} setPage={setPage} />
        </Stack>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap="xs">
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              label={item.label}
              leftSection={<item.icon size={20} />}
              active={page === 'manager' && section === item.id}
              onClick={() => {
                setPage('manager');
                setSection(item.id);
                closeMobileNav();
              }}
            />
          ))}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Stack gap="lg">
          {renderStatusAlert(controller)}
          {page === 'manager' ? (
            <>
              <PlasmaHeader
                variant="secondary"
                description={
                  controller.session
                    ? `${controller.session.organizationName || controller.session.organizationId} · ${controller.session.propertyName || controller.session.trackingId}`
                    : 'Connect manually to start managing a commerce organization.'
                }
              >
                {navItems.find((item) => item.id === section)?.label || 'CMH Manager'}
              </PlasmaHeader>

              {renderSection(section, controller)}
            </>
          ) : page === 'docs' ? (
            <DocsPage />
          ) : (
            <UpdatesPage />
          )}
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
};

export const EmbeddedLayout = ({
  controller,
  section,
  setSection,
  onExitEmbedded,
}: {
  controller: ReturnType<typeof useManagerController>;
  section: AppSection;
  setSection: (section: AppSection) => void;
  onExitEmbedded?: () => void;
}) => {
  const sessionTone = getEmbeddedSessionTone(controller);
  const embeddedTrackingSelect = controller.session && controller.availableTrackingIds.length > 0 ? (
    <Select
      aria-label="Tracking ID"
      data={controller.availableTrackingIds.map((trackingId) => ({value: trackingId, label: trackingId}))}
      value={controller.session.trackingId}
      onChange={(value) => value && void controller.switchTrackingId(value)}
      allowDeselect={false}
      placeholder="Select tracking ID"
    />
  ) : null;
  const docsUrl = getStandaloneDocsUrl();
  const updatesUrl = getStandaloneUpdatesUrl();

  return (
    <Stack gap="md" p="md">
      <Paper withBorder radius="lg" p="lg" shadow="sm">
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Stack gap={4}>
              <Text size="xs" c="dimmed" tt="uppercase" style={{fontWeight: embeddedBoldWeight}}>
                Embedded In Merchandising Hub
              </Text>
              <Text size="lg" style={{fontWeight: embeddedBoldWeight}}>
                CMH Manager
              </Text>
              <Text c="dimmed" size="sm">
                Manage listings, shared configuration, rules, and maintenance without leaving Merchandising Hub.
              </Text>
            </Stack>

            {onExitEmbedded && (
              <Button variant="light" color="gray" leftSection={<IconX size={16} />} onClick={onExitEmbedded}>
                Back to Hub
              </Button>
            )}
          </Group>

          <Paper withBorder radius="md" p="md" bg={sessionTone.background}>
            <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
              <Stack gap={6} style={{flex: 1, minWidth: '320px'}}>
                <Group gap="xs" wrap="wrap">
                  <Badge color={sessionTone.badgeColor} variant="light">
                    {sessionTone.badgeLabel}
                  </Badge>
                  {controller.session && <Badge variant="outline">{controller.session.organizationName || controller.session.organizationId}</Badge>}
                  {controller.session && <Badge variant="outline">{controller.session.propertyName || controller.session.trackingId}</Badge>}
                </Group>
                <Text size="sm">{sessionTone.message}</Text>
              </Stack>

              <Group gap="sm" wrap="wrap">
                {embeddedTrackingSelect ? <div style={{minWidth: '16rem'}}>{embeddedTrackingSelect}</div> : null}
                <Button component="a" href={docsUrl} target="_blank" rel="noreferrer" variant="default">
                  Docs
                </Button>
                <Button component="a" href={updatesUrl} target="_blank" rel="noreferrer" variant="default">
                  What&apos;s new
                </Button>
                <Button
                  variant="light"
                  color="violet"
                  leftSection={<IconRefreshAlert size={16} />}
                  onClick={() => void controller.refreshResolvedContext()}
                  loading={controller.loading}
                >
                  Refresh Hub context
                </Button>
                {controller.session ? (
                  <Button variant="default" leftSection={<IconLogout size={16} />} onClick={() => void controller.disconnect()}>
                    Disconnect
                  </Button>
                ) : section !== 'connection' ? (
                  <Button variant="default" onClick={() => setSection('connection')}>
                    Open connection form
                  </Button>
                ) : null}
              </Group>
            </Group>
          </Paper>

          <Tabs
            value={section}
            onChange={(value) => value && setSection(value as AppSection)}
            variant="default"
            color="violet"
            styles={embeddedTabsStyles}
          >
            <Tabs.List justify="flex-start">
              {navItems.map((item) => (
                <Tabs.Tab key={item.id} value={item.id}>
                  {item.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
        </Stack>
      </Paper>

      {renderStatusAlert(controller)}

      {renderSection(section, controller)}
    </Stack>
  );
};

export const AppContent = ({runtime, transport, contextResolver, sessionStore, onExitEmbedded}: AppProps) => {
  const controller = useManagerController({runtime, transport, contextResolver, sessionStore});
  const [page, setPage] = useAppPage();
  const [section, setSection] = useUrlSection(runtime === 'extension');
  const lastAutoLoadedGlobalConfigRef = useRef<string | null>(null);
  const lastAutoLoadedContextMappingsRef = useRef<string | null>(null);
  const fetchGlobalConfigRef = useRef(controller.fetchGlobalConfig);
  const fetchContextMappingsRef = useRef(controller.fetchContextMappings);
  const globalConfigType = controller.globalConfigType;
  const sessionOrganizationId = controller.session?.organizationId;
  const sessionTrackingId = controller.session?.trackingId;
  const sessionAccessToken = controller.session?.accessToken;
  const sessionPlatformUrl = controller.session?.platformUrl;

  useEffect(() => {
    const requiredSection = getRequiredSection(
      section,
      controller.hasResolvedInitialContext,
      Boolean(controller.session),
      page,
    );
    if (requiredSection === section) {
      return;
    }

    setSection(requiredSection);
  }, [controller.hasResolvedInitialContext, controller.session, page, section, setSection]);

  useEffect(() => {
    fetchGlobalConfigRef.current = controller.fetchGlobalConfig;
  }, [controller.fetchGlobalConfig]);

  useEffect(() => {
    fetchContextMappingsRef.current = controller.fetchContextMappings;
  }, [controller.fetchContextMappings]);

  useEffect(() => {
    if (
      page !== 'manager' ||
      section !== 'global-config' ||
      !sessionOrganizationId ||
      !sessionTrackingId ||
      !sessionAccessToken ||
      !sessionPlatformUrl
    ) {
      lastAutoLoadedGlobalConfigRef.current = null;
      return;
    }

    const autoLoadKey = [
      globalConfigType,
      sessionOrganizationId,
      sessionTrackingId,
      sessionAccessToken,
      sessionPlatformUrl,
    ].join('::');

    if (lastAutoLoadedGlobalConfigRef.current === autoLoadKey) {
      return;
    }

    lastAutoLoadedGlobalConfigRef.current = autoLoadKey;
    void fetchGlobalConfigRef.current();
  }, [
    page,
    section,
    globalConfigType,
    sessionOrganizationId,
    sessionTrackingId,
    sessionAccessToken,
    sessionPlatformUrl,
  ]);

  useEffect(() => {
    if (
      page !== 'manager' ||
      section !== 'context-mappings' ||
      !sessionOrganizationId ||
      !sessionTrackingId ||
      !sessionAccessToken ||
      !sessionPlatformUrl
    ) {
      lastAutoLoadedContextMappingsRef.current = null;
      return;
    }

    const autoLoadKey = [sessionOrganizationId, sessionTrackingId, sessionAccessToken, sessionPlatformUrl].join('::');

    if (lastAutoLoadedContextMappingsRef.current === autoLoadKey) {
      return;
    }

    lastAutoLoadedContextMappingsRef.current = autoLoadKey;
    void fetchContextMappingsRef.current();
  }, [page, section, sessionOrganizationId, sessionTrackingId, sessionAccessToken, sessionPlatformUrl]);

  return runtime === 'extension' ? (
    <EmbeddedLayout controller={controller} section={section} setSection={setSection} onExitEmbedded={onExitEmbedded} />
  ) : (
    <StandaloneLayout
      controller={controller}
      page={page}
      setPage={setPage}
      section={section}
      setSection={setSection}
      onExitEmbedded={onExitEmbedded}
    />
  );
};

const App = ({runtime, embeddedAppearance, ...props}: AppProps) => (
  <Plasmantine
    theme={{
      primaryColor: 'violet',
      fontSmoothing: true,
      ...(runtime === 'extension'
        ? {
            fontFamily: embeddedAppearance?.fontFamily,
            fontSizes: {
              xs: '0.75rem',
              sm: '0.8125rem',
              md: '0.875rem',
              lg: '0.9375rem',
              xl: '1rem',
            },
            headings: {
              fontFamily: embeddedAppearance?.fontFamily,
              sizes: {
                h1: {fontSize: '1.25rem'},
                h2: {fontSize: '1.125rem'},
                h3: {fontSize: '1rem'},
                h4: {fontSize: '0.9375rem'},
                h5: {fontSize: '0.875rem'},
                h6: {fontSize: '0.8125rem'},
              },
            },
          }
        : {}),
    }}
  >
    <AppContent runtime={runtime} embeddedAppearance={embeddedAppearance} {...props} />
  </Plasmantine>
);

export default App;
