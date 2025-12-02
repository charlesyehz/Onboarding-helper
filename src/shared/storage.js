import { cloneDefaultSettings, SETTINGS_VERSION } from "../config/defaultSettings.js";
import { ROUTES } from "../config/routes.js";

const EMAIL_PREFIX_KEY = "onboarding-email-prefix";
const LAST_TICKET_KEY = "last-ticket-number";
const LAST_EMAIL_KEY = "last-generated-email";
const PHONE_NUMBER_KEY = "onboarding-phone-number";
const SETTINGS_KEY = "extension-settings";
const SETTINGS_MIGRATION_KEY = "settings-migrated-v1";
const SELECTED_REGION_KEY = "selected-region";
export const EMAIL_DOMAIN = "@myzeller.com";

const ticketCounterKey = (ticketNumber) => `ticket-${ticketNumber}`;

function hasChromeStorage() {
  return typeof chrome !== "undefined" && chrome.runtime?.id && chrome.storage?.local;
}

const isContextInvalidated = (error) =>
  typeof error?.message === "string" &&
  error.message.toLowerCase().includes("context invalidated");

function storageGet(keys) {
  if (hasChromeStorage()) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys ?? null, (result) => {
        if (chrome.runtime.lastError) {
          if (isContextInvalidated(chrome.runtime.lastError)) {
            console.warn("[Storage] Context invalidated - falling back to localStorage");
            resolve(fallbackGet(keys));
            return;
          }
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(result);
      });
    });
  }

  return Promise.resolve(fallbackGet(keys));
}

function storageSet(items) {
  if (hasChromeStorage()) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(items, () => {
        if (chrome.runtime.lastError) {
          if (isContextInvalidated(chrome.runtime.lastError)) {
            console.warn("[Storage] Context invalidated - writing to localStorage fallback");
            fallbackSet(items);
            resolve();
            return;
          }
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  }

  fallbackSet(items);
  return Promise.resolve();
}

function storageRemove(keys) {
  if (hasChromeStorage()) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(keys, () => {
        if (chrome.runtime.lastError) {
          if (isContextInvalidated(chrome.runtime.lastError)) {
            console.warn("[Storage] Context invalidated - removing from localStorage fallback");
            fallbackRemove(keys);
            resolve();
            return;
          }
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  }

  fallbackRemove(keys);
  return Promise.resolve();
}

function fallbackGet(keys) {
  if (typeof window === "undefined" || !window.localStorage) {
    return {};
  }

  if (keys === null || typeof keys === "undefined") {
    const result = {};
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      result[key] = window.localStorage.getItem(key);
    }
    return result;
  }

  if (Array.isArray(keys)) {
    return keys.reduce((acc, key) => {
      acc[key] = window.localStorage.getItem(key);
      return acc;
    }, {});
  }

  if (typeof keys === "string") {
    return { [keys]: window.localStorage.getItem(keys) };
  }

  return {};
}

function fallbackSet(items) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  Object.entries(items).forEach(([key, value]) => {
    if (typeof value === "undefined") return;
    window.localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  });
}

function fallbackRemove(keys) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  const targetKeys = Array.isArray(keys) ? keys : [keys];
  targetKeys.forEach((key) => {
    if (key) {
      window.localStorage.removeItem(key);
    }
  });
}

export async function loadEmailSettings() {
  const data = await storageGet([EMAIL_PREFIX_KEY, LAST_TICKET_KEY]);
  return {
    prefix: data[EMAIL_PREFIX_KEY] || "",
    ticketNumber: data[LAST_TICKET_KEY] || "",
  };
}

export async function loadPopupState() {
  const data = await storageGet([
    EMAIL_PREFIX_KEY,
    LAST_TICKET_KEY,
    LAST_EMAIL_KEY,
    PHONE_NUMBER_KEY,
  ]);

  return {
    prefix: data[EMAIL_PREFIX_KEY] || "",
    ticketNumber: data[LAST_TICKET_KEY] || "",
    lastEmail: data[LAST_EMAIL_KEY] || "",
    phoneNumber: data[PHONE_NUMBER_KEY] || "",
  };
}

export function saveEmailSettings({ prefix, ticketNumber }) {
  const payload = {};
  if (typeof prefix === "string") {
    payload[EMAIL_PREFIX_KEY] = prefix;
  }
  if (typeof ticketNumber === "string") {
    payload[LAST_TICKET_KEY] = ticketNumber;
  }
  return storageSet(payload);
}

export async function bumpTicketCounter(ticketNumber) {
  const key = ticketCounterKey(ticketNumber);
  const result = await storageGet(key);
  const current = parseInt(result[key], 10) || 0;
  await storageSet({ [key]: current + 1 });
  return current;
}

export function storeGeneratedEmail(email) {
  return storageSet({ [LAST_EMAIL_KEY]: email });
}

export async function getLastGeneratedEmail() {
  const result = await storageGet(LAST_EMAIL_KEY);
  return result[LAST_EMAIL_KEY] || "";
}

export function savePhoneNumber(phoneNumber) {
  if (typeof phoneNumber !== "string") {
    return Promise.resolve();
  }
  return storageSet({ [PHONE_NUMBER_KEY]: phoneNumber });
}

export async function getPhoneNumber() {
  const result = await storageGet(PHONE_NUMBER_KEY);
  return result[PHONE_NUMBER_KEY] || "";
}

export async function clearAutofillHistory() {
  const items = await storageGet(null);
  const ticketKeys = Object.keys(items).filter((key) =>
    key?.startsWith("ticket-")
  );

  const keysToRemove = [
    EMAIL_PREFIX_KEY,
    LAST_TICKET_KEY,
    LAST_EMAIL_KEY,
    PHONE_NUMBER_KEY,
    ...ticketKeys,
  ];

  await storageRemove(keysToRemove);
}

function normalizeSetting(value) {
  return typeof value === "string" ? value.trim() : "";
}

export async function generateSignupEmail(overrides = {}) {
  const stored = await loadEmailSettings();
  const prefix = normalizeSetting(overrides.prefix ?? stored.prefix);
  const ticketNumber = normalizeSetting(
    overrides.ticketNumber ?? stored.ticketNumber
  );

  if (!prefix || !ticketNumber) {
    return { email: null, error: "MISSING_SETTINGS" };
  }

  await saveEmailSettings({ prefix, ticketNumber });
  const currentCount = await bumpTicketCounter(ticketNumber);
  const email = `${prefix}+${ticketNumber}-${currentCount}${EMAIL_DOMAIN}`;
  await storeGeneratedEmail(email);

  return { email };
}

export async function loadSettings() {
  try {
    const data = await storageGet([SETTINGS_KEY, SETTINGS_MIGRATION_KEY]);
    const storedSettings = parseSettingsObject(data?.[SETTINGS_KEY]);
    if (storedSettings) {
      const normalized = normalizeSettingsStructure(storedSettings);
      if (storedSettings.version !== SETTINGS_VERSION) {
        await storageSet({ [SETTINGS_KEY]: normalized });
      }
      return normalized;
    }
    return migrateLegacyRoutes(toBoolean(data?.[SETTINGS_MIGRATION_KEY]));
  } catch (error) {
    console.error("[Storage] Failed to load settings", error);
    const defaults = getDefaultSettings();
    await storageSet({ [SETTINGS_KEY]: defaults });
    return defaults;
  }
}

export async function saveSettings(settings) {
  const normalized = normalizeSettingsStructure(settings);
  await storageSet({ [SETTINGS_KEY]: normalized });
  return normalized;
}

export async function getPersonasByRegion(region) {
  if (!region) {
    return {};
  }
  const settings = await loadSettings();
  const regionData = settings.personas?.[region] ?? {};
  return mergeRegionPersonas({}, regionData);
}

export async function savePersonas(region, personas = {}) {
  if (!region) {
    throw new Error("Region is required to save personas");
  }
  const settings = await loadSettings();
  settings.personas[region] = mergeRegionPersonas({}, personas);
  const updated = await saveSettings(settings);
  return updated.personas[region];
}

export async function toggleInlineWidget(enabled) {
  const settings = await loadSettings();
  settings.inlineWidgetEnabled = Boolean(enabled);
  const updated = await saveSettings(settings);
  return updated.inlineWidgetEnabled;
}

export async function isInlineWidgetEnabled() {
  const settings = await loadSettings();
  return Boolean(settings.inlineWidgetEnabled);
}

function getDefaultSettings() {
  return cloneDefaultSettings();
}

function parseSettingsObject(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn("[Storage] Failed to parse stored settings", error);
      return null;
    }
  }

  if (typeof value === "object") {
    return value;
  }

  return null;
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value === "true" || value === "1";
  }
  return Boolean(value);
}

function normalizeSettingsStructure(settings) {
  const base = getDefaultSettings();
  if (!settings || typeof settings !== "object") {
    return base;
  }

  if (typeof settings.inlineWidgetEnabled === "boolean") {
    base.inlineWidgetEnabled = settings.inlineWidgetEnabled;
  }

  const personas = settings.personas;
  if (personas && typeof personas === "object") {
    Object.entries(personas).forEach(([region, regionPersonas]) => {
      base.personas[region] = mergeRegionPersonas(
        base.personas[region],
        regionPersonas
      );
    });
  }

  base.version = SETTINGS_VERSION;
  return base;
}

async function migrateLegacyRoutes(hasMigrated) {
  const defaults = getDefaultSettings();
  if (hasMigrated) {
    await storageSet({ [SETTINGS_KEY]: defaults });
    return defaults;
  }

  const legacy = extractLegacyPersonas();
  if (legacy && Object.keys(legacy).length > 0) {
    defaults.personas.AU = mergeRegionPersonas(defaults.personas.AU, legacy);
  }

  await storageSet({
    [SETTINGS_KEY]: defaults,
    [SETTINGS_MIGRATION_KEY]: true,
  });
  return defaults;
}

function mergeRegionPersonas(baseRegion = {}, incomingRegion = {}) {
  const result = {};

  if (baseRegion && typeof baseRegion === "object") {
    Object.entries(baseRegion).forEach(([routeId, personas]) => {
      if (Array.isArray(personas)) {
        result[routeId] = personas.map(clonePersona);
      }
    });
  }

  if (incomingRegion && typeof incomingRegion === "object") {
    Object.entries(incomingRegion).forEach(([routeId, personas]) => {
      if (Array.isArray(personas)) {
        result[routeId] = personas.map(clonePersona);
      }
    });
  }

  return result;
}

function clonePersona(persona = {}) {
  return {
    ...persona,
    fields: Array.isArray(persona.fields)
      ? persona.fields.map((field) => ({ ...field }))
      : [],
  };
}

function extractLegacyPersonas() {
  if (!Array.isArray(ROUTES)) {
    return {};
  }

  return ROUTES.reduce((acc, route) => {
    if (!route?.id || !Array.isArray(route.personas) || !route.personas.length) {
      return acc;
    }
    acc[route.id] = route.personas.map(clonePersona);
    return acc;
  }, {});
}

export async function getSelectedRegion() {
  const result = await storageGet(SELECTED_REGION_KEY);
  return result[SELECTED_REGION_KEY] || "AU"; // Default to AU
}

export async function saveSelectedRegion(region) {
  if (!region || typeof region !== "string") {
    return;
  }
  await storageSet({ [SELECTED_REGION_KEY]: region });
}
