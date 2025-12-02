import { initEmailManager } from "./features/emailManager.js";
import { initLoginHelper } from "./features/loginHelper.js";
import { initRegionSelector } from "./features/regionSelector.js";
import { initRecordingManager } from "./features/recordingManager.js";
import { initRoutePanel } from "./ui/routePanel.js";
import { getActiveTab } from "../shared/tabs.js";
import {
  loadPopupState,
  isStorageUnavailableError,
  STORAGE_CONTEXT_INVALIDATED_EVENT,
} from "../shared/storage.js";

document.addEventListener("DOMContentLoaded", () => {
  initStorageWarningBridge();
  const activeTabPromise = getActiveTab();

  activeTabPromise
    .then((activeTab) => initRoutePanel(activeTab))
    .catch((error) =>
      console.error("[Popup] Failed to initialise route panel", error)
    );

  (async () => {
    try {
      const state = await loadPopupState();
      await initEmailManager(state);
    } catch (error) {
      if (isStorageUnavailableError(error)) {
        showStorageWarning(error.message);
        return;
      }
      console.error("[Popup] Failed to initialise email manager", error);
      try {
        await initEmailManager();
      } catch (initError) {
        if (isStorageUnavailableError(initError)) {
          showStorageWarning(initError.message);
          return;
        }
        console.error(
          "[Popup] Failed to initialise email manager fallback",
          initError
        );
      }
    }
  })();

  try {
    initLoginHelper();
  } catch (error) {
    console.error("[Popup] Failed to initialise login helper", error);
  }

  try {
    initRecordingManager();
  } catch (error) {
    console.error("[Popup] Failed to initialise recording manager", error);
  }

  initRegionSelector();
  initSettingsLauncher();
});

function initSettingsLauncher() {
  const button = document.getElementById("settings-btn");
  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
  });
}

function initStorageWarningBridge() {
  const reloadButton = document.getElementById("reload-extension-btn");
  reloadButton?.addEventListener("click", () => {
    chrome.runtime.reload();
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === STORAGE_CONTEXT_INVALIDATED_EVENT) {
      showStorageWarning(message?.payload?.message);
    }
  });
}

let storageWarningVisible = false;
function showStorageWarning(detailMessage) {
  if (storageWarningVisible) {
    return;
  }
  storageWarningVisible = true;

  const banner = document.getElementById("storage-warning");
  if (!banner) {
    alert("Extension storage is unavailable. Please reload the extension.");
    return;
  }

  const textEl = document.getElementById("storage-warning-text");
  if (textEl && detailMessage) {
    textEl.textContent = detailMessage;
  }

  banner.removeAttribute("hidden");
  banner.classList.add("visible");
  document.body.classList.add("storage-warning-active");
}
