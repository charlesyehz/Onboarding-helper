import { initEmailManager } from "./features/emailManager.js";
import { initLoginHelper } from "./features/loginHelper.js";
import { initRegionSelector } from "./features/regionSelector.js";
import { initRecordingManager } from "./features/recordingManager.js";
import { initRoutePanel } from "./ui/routePanel.js";
import { getActiveTab } from "../shared/tabs.js";
import { loadPopupState } from "../shared/storage.js";

document.addEventListener("DOMContentLoaded", () => {
  const activeTabPromise = getActiveTab();
  const popupStatePromise = loadPopupState();

  activeTabPromise
    .then((activeTab) => initRoutePanel(activeTab))
    .catch((error) =>
      console.error("[Popup] Failed to initialise route panel", error)
    );

  popupStatePromise
    .catch((error) => {
      console.error("[Popup] Failed to preload email settings", error);
      return null;
    })
    .then((state) => initEmailManager(state))
    .catch((error) =>
      console.error("[Popup] Failed to initialise email manager", error)
    );

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
