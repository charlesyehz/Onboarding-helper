import { initEmailManager } from "./features/emailManager.js";
import { initLoginHelper } from "./features/loginHelper.js";
import { initRegionSelector } from "./features/regionSelector.js";
import { initRoutePanel } from "./ui/routePanel.js";
import { getActiveTab } from "../shared/tabs.js";

document.addEventListener("DOMContentLoaded", async () => {
  const activeTab = await getActiveTab();
  initRoutePanel(activeTab);
  await initEmailManager();
  await initLoginHelper();
  initRegionSelector();
});
