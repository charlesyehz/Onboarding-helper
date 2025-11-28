import { injectPersonaFields } from "../features/autofill.js";
import { requestRouteSnapshot } from "../../shared/runtime.js";
import { matchRoute } from "../../shared/routes.js";

export async function initRoutePanel(activeTab) {
  const statusEl = document.getElementById("status");
  const buttonContainer = document.getElementById("buttons");
  buttonContainer.textContent = "";

  if (!activeTab) {
    statusEl.textContent = "No active tab detected.";
    return;
  }

  const snapshot = activeTab.id
    ? await requestRouteSnapshot(activeTab.id).catch(() => null)
    : null;

  const pathname = snapshot?.pathname || extractPathFromUrl(activeTab.url);
  const route = snapshot?.route || (pathname ? matchRoute(pathname) : null);

  if (!route || route.personas.length === 0) {
    statusEl.textContent = "No onboarding config matches this page.";
    return;
  }

  statusEl.textContent = `Select a config for ${route.title || route.path}:`;

  route.personas.forEach((persona) => {
    const button = document.createElement("button");
    button.textContent = persona.label;
    button.addEventListener("click", () => {
      injectPersonaFields(activeTab.id, persona.fields);
    });
    buttonContainer.appendChild(button);
  });
}

function extractPathFromUrl(urlString) {
  if (!urlString) return "";
  try {
    const url = new URL(urlString);
    return url.pathname;
  } catch {
    return "";
  }
}
