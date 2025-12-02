import { injectPersonaFields } from "../features/autofill.js";
import { requestRouteSnapshot } from "../../shared/runtime.js";
import { matchRoute } from "../../shared/routes.js";
import {
  getPersonasByRegion,
  getPhoneNumber,
  getSelectedRegion,
} from "../../shared/storage.js";

let renderSequence = 0;

export async function initRoutePanel(activeTab) {
  const statusEl = document.getElementById("status");
  const buttonContainer = document.getElementById("buttons");
  buttonContainer.textContent = "";

  if (!activeTab) {
    statusEl.textContent = "No active tab detected.";
    return;
  }

  const context = await resolveRouteContext(activeTab).catch(() => null);
  if (!context?.route) {
    statusEl.textContent = "No onboarding config matches this page.";
    return;
  }

  let currentRegion = await getSelectedRegion();
  await renderRoutePersonas(context, currentRegion, statusEl, buttonContainer);

  const rerender = () =>
    renderRoutePersonas(context, currentRegion, statusEl, buttonContainer);

  window.addEventListener("regionChanged", (event) => {
    currentRegion = event.detail?.region || currentRegion;
    rerender();
  });

  window.addEventListener("personasUpdated", rerender);

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "SETTINGS_UPDATED") {
      rerender();
    }
  });
}

async function renderRoutePersonas(
  context,
  region,
  statusEl,
  buttonContainer
) {
  const sequence = ++renderSequence;
  buttonContainer.textContent = "";
  const routeTitle = context.route.title || context.route.path;
  statusEl.textContent = `Loading personas for ${routeTitle} (${region})...`;

  try {
    const personasByRoute = await getPersonasByRegion(region);
    if (sequence !== renderSequence) {
      return;
    }

    const personas = personasByRoute?.[context.route.id] || [];
    if (!personas.length) {
      const handled = await renderLegacyFallback({
        context,
        region,
        statusEl,
        buttonContainer,
        sequence,
      });
      if (handled) {
        return;
      }
      statusEl.textContent = `No personas configured for ${routeTitle} (${region}).`;
      return;
    }

    statusEl.textContent = `Select a config for ${routeTitle} (${region}):`;
    personas.forEach((persona) => {
      const button = document.createElement("button");
      button.textContent = persona.label;
      button.addEventListener("click", () => {
        injectPersonaFields(context.activeTabId, persona.fields);
      });
      buttonContainer.appendChild(button);
    });
  } catch (error) {
    if (sequence !== renderSequence) {
      return;
    }
    console.error("[RoutePanel] Failed to load personas", error);
    statusEl.textContent = "Failed to load personas for this route.";
  }
}

async function resolveRouteContext(activeTab) {
  const snapshot = activeTab.id
    ? await requestRouteSnapshot(activeTab.id).catch(() => null)
    : null;

  const pathname = snapshot?.pathname || extractPathFromUrl(activeTab.url);
  const route = snapshot?.route || (pathname ? matchRoute(pathname) : null);

  if (!route) {
    return null;
  }

  return {
    route,
    pathname,
    activeTabId: activeTab.id,
  };
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

async function renderLegacyFallback({
  context,
  region,
  statusEl,
  buttonContainer,
  sequence,
}) {
  if (context.route.id !== "register-phone") {
    return false;
  }

  const phone = (await getPhoneNumber())?.trim();
  if (sequence !== renderSequence) {
    return true;
  }

  if (!phone) {
    statusEl.textContent = `Save a phone number in the popup for ${region}.`;
    return true;
  }

  statusEl.textContent = `Use saved phone number (${region}):`;
  const button = document.createElement("button");
  button.textContent = "Prefill phone number";
  button.addEventListener("click", () => {
    injectPersonaFields(context.activeTabId, [
      { role: "textbox", name: "phone", value: phone },
    ]);
  });
  buttonContainer.appendChild(button);
  return true;
}
