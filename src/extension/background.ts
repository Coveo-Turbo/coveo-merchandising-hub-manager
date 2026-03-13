/// <reference types="chrome" />

import type {ExtensionMessage, ExtensionRuntimeResponse, ExtensionTabMessage} from '../core/extensionProtocol';

const getSessionKey = (tabId: number) => `cmh-manager:tab:${tabId}`;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getTabId = (message: ExtensionMessage, sender: chrome.runtime.MessageSender) =>
  ('tabId' in message ? message.tabId : undefined) ?? sender.tab?.id ?? null;

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  void (async () => {
    switch (message.type) {
      case 'API_REQUEST': {
        try {
          const response = await fetch(message.request.url, {
            method: message.request.method,
            headers: message.request.headers,
            body: message.request.body,
            cache: message.request.cache,
          });

          const payload: ExtensionRuntimeResponse = {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: await response.text(),
          };

          sendResponse(payload);
        } catch (error) {
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown proxy error',
          });
        }
        return;
      }
      case 'SET_SESSION_CONTEXT': {
        const tabId = getTabId(message, sender);
        if (tabId !== null) {
          await chrome.storage.session.set({[getSessionKey(tabId)]: message.payload ?? null});
        }
        sendResponse(message.payload ?? null);
        return;
      }
      case 'GET_SESSION_CONTEXT': {
        const tabId = getTabId(message, sender);
        if (tabId === null) {
          sendResponse(null);
          return;
        }
        const stored = await chrome.storage.session.get(getSessionKey(tabId));
        sendResponse((stored[getSessionKey(tabId)] as ExtensionRuntimeResponse) ?? null);
        return;
      }
      case 'CLEAR_SESSION_CONTEXT': {
        const tabId = getTabId(message, sender);
        if (tabId !== null) {
          await chrome.storage.session.remove(getSessionKey(tabId));
        }
        sendResponse(null);
        return;
      }
      case 'REFRESH_SESSION_CONTEXT': {
        const tabId = getTabId(message, sender);
        if (tabId !== null) {
          const tabMessage: ExtensionTabMessage = {type: 'REQUEST_PAGE_CONTEXT_REFRESH'};
          try {
            await chrome.tabs.sendMessage(tabId, tabMessage);
            await wait(250);
          } catch {
            // Ignore if the content script is not ready.
          }

          const stored = await chrome.storage.session.get(getSessionKey(tabId));
          sendResponse((stored[getSessionKey(tabId)] as ExtensionRuntimeResponse) ?? null);
          return;
        }
        sendResponse(null);
        return;
      }
    }
  })();

  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void chrome.storage.session.remove(getSessionKey(tabId));
});
