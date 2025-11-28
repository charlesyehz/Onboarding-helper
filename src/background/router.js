import { buildRoutePayload } from "../shared/routes.js";

const routeCache = new Map();

function cacheRoute(tabId, payload) {
  if (payload) {
    routeCache.set(tabId, payload);
  } else {
    routeCache.delete(tabId);
  }
}

function notifyTab(tabId, payload) {
  chrome.tabs.sendMessage(
    tabId,
    { type: "ROUTE_UPDATED", payload },
    () => chrome.runtime.lastError
  );
}

function handleRouteUpdate(tabId, url) {
  if (!url) return;
  const payload = buildRoutePayload(url);
  cacheRoute(tabId, payload);
  notifyTab(tabId, payload);
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    handleRouteUpdate(tabId, changeInfo.url);
    return;
  }

  if (changeInfo.status === "complete" && tab.url) {
    handleRouteUpdate(tabId, tab.url);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => routeCache.delete(tabId));

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "REQUEST_ROUTE_SNAPSHOT") {
    const requestedTabId =
      message.payload?.tabId ?? sender?.tab?.id ?? sender?.tabId;
    const snapshot =
      (typeof requestedTabId === "number" && routeCache.get(requestedTabId)) ||
      null;
    sendResponse(snapshot);
    return true;
  }
  return false;
});

chrome.tabs.query({}, (tabs) => {
  tabs.forEach((tab) => {
    if (tab.id !== undefined && tab.url) {
      handleRouteUpdate(tab.id, tab.url);
    }
  });
});
