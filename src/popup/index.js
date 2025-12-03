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
  initSettingsLauncher();
  initPopup();
});

async function initPopup() {
  const activeTabPromise = getActiveTab();

  // Start route panel init independently (doesn't need preloaded state)
  activeTabPromise
    .then((activeTab) => initRoutePanel(activeTab))
    .catch((error) =>
      console.error("[Popup] Failed to initialise route panel", error)
    );

  // Batch load all required state in a single storage call
  try {
    const state = await loadPopupState();

    // Initialize all components in parallel with preloaded state
    await Promise.all([
      initEmailManager(state),
      initRegionSelector(state.region),
      initRecordingManager(),
    ]);

    // Init login helper (synchronous, no storage needed)
    initLoginHelper();
  } catch (error) {
    if (isStorageUnavailableError(error)) {
      showStorageWarning(error.message);
      return;
    }
    console.error("[Popup] Failed to initialise components", error);

    // Fallback: try to init without preloaded state
    try {
      await Promise.all([
        initEmailManager(),
        initRegionSelector(),
        initRecordingManager(),
      ]);
      initLoginHelper();
    } catch (fallbackError) {
      if (isStorageUnavailableError(fallbackError)) {
        showStorageWarning(fallbackError.message);
        return;
      }
      console.error("[Popup] Fallback initialization failed", fallbackError);
    }
  }
}

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
