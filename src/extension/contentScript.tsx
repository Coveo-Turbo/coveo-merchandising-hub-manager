/// <reference types="chrome" />
/// <reference types="@crxjs/vite-plugin/client" />

import {createRoot, type Root} from 'react-dom/client';
import App from '../App';
import {createExtensionApiTransport} from '../core/apiTransport';
import type {ContextResolver} from '../core/contracts';
import type {ExtensionSessionMessage, ExtensionTabMessage} from '../core/extensionProtocol';
import type {EmbeddedAppearance, HubContextSnapshot, SessionContext} from '../types';
import {resolveSessionFromHubContextSnapshot} from './contextNormalization';
import pageBridgeScript from './pageBridge.ts?script&module';
import coreStyles from '@mantine/core/styles.css?inline';
import datesStyles from '@mantine/dates/styles.css?inline';
import appStyles from '../index.css?inline';
import embeddedStyles from './embedded.css?inline';
import {captureEmbeddedAppearance, findSidebarRoot, resolveEmbeddedHostInsets} from './layout';
import {shouldDeactivateManagerFromTarget, syncManagerNavItem} from './navigation';

const HOST_ID = 'cmh-manager-extension-host';
const ROOT_CLASS = 'cmh-manager-embedded-root';
const CONTEXT_MESSAGE_TYPE = 'CMH_MANAGER_CONTEXT';
const REFRESH_MESSAGE_TYPE = 'CMH_MANAGER_REQUEST_REFRESH';

let activeContext: SessionContext | null = null;
let activeRoot: Root | null = null;
let activeAppearance: EmbeddedAppearance | null = null;
let refreshWaiters: Array<(value: SessionContext | null) => void> = [];
let activeSidebar: HTMLElement | null = null;

const transport = createExtensionApiTransport();

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
      params.set('cmhSection', 'connection');
    }
  });
};

const getManagerHref = () => {
  const params = getSearchParams();
  params.set('cmhManager', '1');
  if (!params.has('cmhSection')) {
    params.set('cmhSection', 'connection');
  }

  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
};

const closeManager = () => {
  updateSearchParams((params) => {
    params.delete('cmhManager');
    params.delete('cmhSection');
  });
  unmountManager();
};

const applyHostInsets = (host: HTMLElement) => {
  const bounds = resolveEmbeddedHostInsets();
  host.style.position = 'fixed';
  host.style.top = `${bounds.top}px`;
  host.style.left = `${bounds.left}px`;
  host.style.right = `${bounds.right}px`;
  host.style.bottom = `${bounds.bottom}px`;
  host.style.zIndex = '40';
  host.style.overflow = 'auto';
  host.style.boxSizing = 'border-box';
  host.style.boxShadow = '-1px 0 0 rgba(15, 23, 42, 0.08)';
};

const applyHostLayout = (host: HTMLElement) => {
  const appearance = captureEmbeddedAppearance();
  host.style.setProperty('--cmh-manager-embedded-background', appearance.backgroundColor || '#f5f6f8');
  host.style.setProperty('--cmh-manager-embedded-font-family', appearance.fontFamily || 'inherit');
  activeAppearance = appearance;
  applyHostInsets(host);
};

let pendingInsetsFrameId: number | null = null;
const scheduleHostInsets = () => {
  if (pendingInsetsFrameId !== null) {
    return;
  }
  pendingInsetsFrameId = requestAnimationFrame(() => {
    pendingInsetsFrameId = null;
    const host = document.getElementById(HOST_ID);
    if (host) {
      applyHostInsets(host);
    }
  });
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

const handleSidebarClick = (event: Event) => {
  if (!isManagerOpen() || !activeSidebar) {
    return;
  }

  if (shouldDeactivateManagerFromTarget(activeSidebar, event.target)) {
    closeManager();
  }
};

const handleSidebarKeydown = (event: KeyboardEvent) => {
  if ((event.key !== 'Enter' && event.key !== ' ') || !isManagerOpen() || !activeSidebar) {
    return;
  }

  if (shouldDeactivateManagerFromTarget(activeSidebar, event.target)) {
    closeManager();
  }
};

const ensureSidebarListeners = (sidebar: HTMLElement) => {
  if (activeSidebar === sidebar) {
    return;
  }

  if (activeSidebar) {
    activeSidebar.removeEventListener('click', handleSidebarClick, true);
    activeSidebar.removeEventListener('keydown', handleSidebarKeydown, true);
  }

  activeSidebar = sidebar;
  activeSidebar.addEventListener('click', handleSidebarClick, true);
  activeSidebar.addEventListener('keydown', handleSidebarKeydown, true);
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

const injectNavButton = () => {
  const sidebar = findSidebarRoot();
  if (!sidebar) {
    return;
  }

  ensureSidebarListeners(sidebar);
  syncManagerNavItem(sidebar, {
    active: isManagerOpen(),
    href: getManagerHref(),
    onActivate: () => openManager(),
  });
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

  const nextContext = resolveSessionFromHubContextSnapshot(event.data.payload as HubContextSnapshot, {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    hostname: window.location.hostname,
  });
  void storeContext(nextContext);
});

chrome.runtime.onMessage.addListener((message: ExtensionTabMessage) => {
  if (message.type === 'REQUEST_PAGE_CONTEXT_REFRESH') {
    requestBridgeRefresh();
  }
});

window.addEventListener('hashchange', syncManagerMount);
window.addEventListener('popstate', syncManagerMount);
window.addEventListener('resize', scheduleHostInsets);
window.addEventListener('scroll', scheduleHostInsets);

let pendingMutationFrameId: number | null = null;
const observer = new MutationObserver(() => {
  injectNavButton();
  if (pendingMutationFrameId !== null) {
    return;
  }
  pendingMutationFrameId = requestAnimationFrame(() => {
    pendingMutationFrameId = null;
    const host = document.getElementById(HOST_ID);
    if (host) {
      applyHostInsets(host);
    }
  });
});

injectBridge();
requestBridgeRefresh();
syncManagerMount();
observer.observe(document.body, {childList: true, subtree: true});
