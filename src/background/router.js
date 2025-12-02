import { buildRoutePayload } from "../shared/routes.js";
import { isAllowedUrl } from "../config/allowedOrigins.js";
import {
  startRecording,
  stopRecording,
  forceStopRecording,
  pauseRecording,
  resumeRecording,
  captureScreenshot,
  getRecorderState,
  handleRecordingComplete,
} from "./recorder.js";

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
  if (!url || !isAllowedUrl(url)) {
    cacheRoute(tabId, null);
    return;
  }
  const payload = buildRoutePayload(url);
  cacheRoute(tabId, payload);
  notifyTab(tabId, payload);
}

function broadcastSettingsUpdate(payload) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (typeof tab.id !== "number") {
        return;
      }
      chrome.tabs.sendMessage(
        tab.id,
        { type: "SETTINGS_UPDATED", payload },
        () => chrome.runtime.lastError
      );
    });
  });
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

  if (message?.type === "SETTINGS_UPDATED") {
    broadcastSettingsUpdate(message.payload);
  }

  // Recording message handlers
  if (message?.type === "START_RECORDING") {
    const tabId = message.tabId || sender?.tab?.id;
    startRecording(tabId)
      .then((result) => sendResponse(result))
      .catch((error) =>
        sendResponse({ success: false, error: error.message })
      );
    return true; // Async response
  }

  if (message?.type === "STOP_RECORDING") {
    stopRecording()
      .then((result) => sendResponse(result))
      .catch((error) =>
        sendResponse({ success: false, error: error.message })
      );
    return true; // Async response
  }

  if (message?.type === "FORCE_STOP_RECORDING") {
    const result = forceStopRecording();
    sendResponse(result);
    return true;
  }

  if (message?.type === "PAUSE_RECORDING") {
    pauseRecording()
      .then((result) => sendResponse(result))
      .catch((error) =>
        sendResponse({ success: false, error: error.message })
      );
    return true; // Async response
  }

  if (message?.type === "RESUME_RECORDING") {
    resumeRecording()
      .then((result) => sendResponse(result))
      .catch((error) =>
        sendResponse({ success: false, error: error.message })
      );
    return true; // Async response
  }

  if (message?.type === "CAPTURE_SCREENSHOT") {
    captureScreenshot()
      .then((result) => sendResponse(result))
      .catch((error) =>
        sendResponse({ success: false, error: error.message })
      );
    return true; // Async response
  }

  if (message?.type === "GET_RECORDER_STATE") {
    const state = getRecorderState();
    sendResponse(state);
    return true;
  }

  // Handle recording completion from offscreen document
  if (message?.type === "RECORDING_COMPLETE") {
    handleRecordingComplete(message.downloadUrl, message.mimeType, message.sizeBytes)
      .catch((error) => console.error("[Router] Failed to handle recording complete:", error));
    return false;
  }

  // Handle recording error from offscreen document
  if (message?.type === "RECORDING_ERROR") {
    console.error("[Router] Recording error from offscreen:", message.error);
    return false;
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
