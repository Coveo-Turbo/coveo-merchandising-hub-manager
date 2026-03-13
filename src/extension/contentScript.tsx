/// <reference types="chrome" />
/// <reference types="@crxjs/vite-plugin/client" />

import {createRoot, type Root} from 'react-dom/client';
import App from '../App';
import {createExtensionApiTransport} from '../core/apiTransport';
import type {ContextResolver} from '../core/contracts';
import type {ExtensionSessionMessage, ExtensionTabMessage} from '../core/extensionProtocol';
import type {EmbeddedAppearance, HubContextSnapshot, SessionContext} from '../types';
import pageBridgeScript from './pageBridge.ts?script&module';
import coreStyles from '@mantine/core/styles.css?inline';
import datesStyles from '@mantine/dates/styles.css?inline';
import appStyles from '../index.css?inline';
import embeddedStyles from './embedded.css?inline';
import {captureEmbeddedAppearance, findSidebarRoot, resolveEmbeddedHostInsets} from './layout';

const NAV_BUTTON_ID = 'cmh-manager-extension-nav';
const HOST_ID = 'cmh-manager-extension-host';
const ROOT_CLASS = 'cmh-manager-embedded-root';
const CONTEXT_MESSAGE_TYPE = 'CMH_MANAGER_CONTEXT';
const REFRESH_MESSAGE_TYPE = 'CMH_MANAGER_REQUEST_REFRESH';

let activeContext: SessionContext | null = null;
let activeRoot: Root | null = null;
let activeAppearance: EmbeddedAppearance | null = null;
let refreshWaiters: Array<(value: SessionContext | null) => void> = [];

const transport = createExtensionApiTransport();

const inferPlatformUrl = (hostname: string) => {
  if (hostname.includes('commerce-ca.')) {
    return 'https://platform-ca.cloud.coveo.com';
  }
  if (hostname.includes('commerce-eu.')) {
    return 'https://platform-eu.cloud.coveo.com';
  }
  if (hostname.includes('commerce-au.')) {
    return 'https://platform-au.cloud.coveo.com';
  }
  return 'https://platform.cloud.coveo.com';
};

const getSearchParams = () => new URLSearchParams(window.location.search);

const isManagerOpen = () => getSearchParams().get('cmhManager') === '1';

const updateSearchParams = (mutate: (params: URLSearchParams) => void) => {
  const params = getSearchParams();
  mutate(params);
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  window.history.replaceState({}, '', nextUrl);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

const openManager = () => {
  updateSearchParams((params) => {
    params.set('cmhManager', '1');
    if (!params.has('cmhSection')) {
      params.set('cmhSection', 'listings');
    }
  });
};

const closeManager = () => {
  updateSearchParams((params) => {
    params.delete('cmhManager');
    params.delete('cmhSection');
  });
  unmountManager();
};

const applyHostLayout = (host: HTMLElement) => {
  const bounds = resolveEmbeddedHostInsets();
  const appearance = captureEmbeddedAppearance();

  host.style.position = 'fixed';
  host.style.top = `${bounds.top}px`;
  host.style.left = `${bounds.left}px`;
  host.style.right = `${bounds.right}px`;
  host.style.bottom = `${bounds.bottom}px`;
  host.style.zIndex = '40';
  host.style.overflow = 'auto';
  host.style.boxSizing = 'border-box';
  host.style.boxShadow = '-1px 0 0 rgba(15, 23, 42, 0.08)';
  host.style.setProperty('--cmh-manager-embedded-background', appearance.backgroundColor || '#f5f6f8');
  host.style.setProperty('--cmh-manager-embedded-font-family', appearance.fontFamily || 'inherit');

  activeAppearance = appearance;
};

const injectBridge = () => {
  if (document.querySelector(`script[data-cmh-bridge="true"]`)) {
    return;
  }

  const script = document.createElement('script');
  script.type = 'module';
  script.dataset.cmhBridge = 'true';
  script.src = chrome.runtime.getURL(pageBridgeScript);
  (document.head || document.documentElement).appendChild(script);
};

const requestBridgeRefresh = () => {
  window.postMessage({type: REFRESH_MESSAGE_TYPE}, window.location.origin);
};

const normalizeContext = (snapshot: HubContextSnapshot): SessionContext | null => {
  const accessToken = snapshot.accessToken?.trim();
  const organizationId = snapshot.organizationId?.trim();
  const trackingId = snapshot.trackingId?.trim();

  if (!accessToken || !organizationId) {
    return null;
  }

  const platformUrl = snapshot.platformUrl?.trim() || inferPlatformUrl(window.location.hostname);
  const trackingIds = snapshot.trackingIds?.filter((entry) => entry.trim().length > 0) ?? [];
  const resolvedTrackingId = trackingId || trackingIds[0];

  if (!resolvedTrackingId) {
    return null;
  }

  return {
    organizationId,
    organizationName: snapshot.organizationName,
    trackingId: resolvedTrackingId,
    trackingIds: [...new Set([resolvedTrackingId, ...trackingIds])],
    propertyName: snapshot.propertyName,
    locale: snapshot.locale,
    accessToken,
    platformUrl,
    source: 'hub',
  };
};

const storeContext = async (context: SessionContext | null) => {
  activeContext = context;
  const message: ExtensionSessionMessage = {
    type: context ? 'SET_SESSION_CONTEXT' : 'CLEAR_SESSION_CONTEXT',
    payload: context,
  };
  await chrome.runtime.sendMessage(message);
  refreshWaiters.forEach((resolve) => resolve(context));
  refreshWaiters = [];
};

const extensionContextResolver: ContextResolver = {
  async resolve() {
    if (activeContext) {
      return activeContext;
    }

    const response = (await chrome.runtime.sendMessage({type: 'GET_SESSION_CONTEXT'} satisfies ExtensionSessionMessage)) as SessionContext | null;
    activeContext = response;
    return response;
  },
  async refresh() {
    requestBridgeRefresh();
    return new Promise<SessionContext | null>((resolve) => {
      const timeout = window.setTimeout(async () => {
        const response = (await chrome.runtime.sendMessage({type: 'GET_SESSION_CONTEXT'} satisfies ExtensionSessionMessage)) as SessionContext | null;
        resolve(response);
      }, 1000);

      refreshWaiters.push((context) => {
        window.clearTimeout(timeout);
        resolve(context);
      });
    });
  },
  async disconnect() {
    await storeContext(null);
  },
};

const createNavButton = () => {
  const button = document.createElement('button');
  button.id = NAV_BUTTON_ID;
  button.type = 'button';
  button.textContent = 'CMH Manager';
  button.style.width = '100%';
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.padding = '12px 16px';
  button.style.borderRadius = '10px';
  button.style.border = 'none';
  button.style.cursor = 'pointer';
  button.style.color = 'white';
  button.style.fontWeight = '600';
  button.style.background = 'transparent';
  button.style.marginTop = '8px';
  button.addEventListener('click', openManager);
  return button;
};

const updateNavButtonState = () => {
  const button = document.getElementById(NAV_BUTTON_ID) as HTMLButtonElement | null;
  if (!button) {
    return;
  }

  button.style.background = isManagerOpen() ? '#5c2ee5' : 'transparent';
};

const injectNavButton = () => {
  const sidebar = findSidebarRoot();
  if (!sidebar) {
    return;
  }

  if (!document.getElementById(NAV_BUTTON_ID)) {
    sidebar.appendChild(createNavButton());
  }

  updateNavButtonState();
};

const mountManager = () => {
  if (activeRoot) {
    const host = document.getElementById(HOST_ID);
    if (host) {
      applyHostLayout(host);
    }
    return;
  }

  const host = document.createElement('div');
  host.id = HOST_ID;
  applyHostLayout(host);
  const shadowRoot = host.attachShadow({mode: 'open'});

  const style = document.createElement('style');
  style.textContent = `${coreStyles}\n${datesStyles}\n${appStyles}\n${embeddedStyles}`;
  shadowRoot.appendChild(style);

  const rootElement = document.createElement('div');
  rootElement.className = ROOT_CLASS;
  shadowRoot.appendChild(rootElement);
  document.body.appendChild(host);

  activeRoot = createRoot(rootElement);
  activeRoot.render(
    <App
      runtime="extension"
      transport={transport}
      contextResolver={extensionContextResolver}
      onExitEmbedded={closeManager}
      embeddedAppearance={activeAppearance || undefined}
    />,
  );
};

function unmountManager() {
  activeRoot?.unmount();
  activeRoot = null;
  activeAppearance = null;
  document.getElementById(HOST_ID)?.remove();
}

const syncManagerMount = () => {
  injectNavButton();
  updateNavButtonState();
  if (isManagerOpen()) {
    mountManager();
  } else {
    unmountManager();
  }
};

window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || event.data.type !== CONTEXT_MESSAGE_TYPE) {
    return;
  }

  const nextContext = normalizeContext(event.data.payload as HubContextSnapshot);
  void storeContext(nextContext);
});

chrome.runtime.onMessage.addListener((message: ExtensionTabMessage) => {
  if (message.type === 'REQUEST_PAGE_CONTEXT_REFRESH') {
    requestBridgeRefresh();
  }
});

window.addEventListener('hashchange', syncManagerMount);
window.addEventListener('popstate', syncManagerMount);
window.addEventListener('resize', () => {
  const host = document.getElementById(HOST_ID);
  if (host) {
    applyHostLayout(host);
  }
});

window.addEventListener('scroll', () => {
  const host = document.getElementById(HOST_ID);
  if (host) {
    applyHostLayout(host);
  }
});

const observer = new MutationObserver(() => {
  injectNavButton();
  const host = document.getElementById(HOST_ID);
  if (host) {
    applyHostLayout(host);
  }
});

injectBridge();
requestBridgeRefresh();
syncManagerMount();
observer.observe(document.body, {childList: true, subtree: true});
