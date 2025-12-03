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
const REGISTER_PHONE_ROUTE_ID = "register-phone";
const SAVED_PHONE_PERSONA_ID = "saved-phone-number";
const SAVED_PHONE_PERSONA_LABEL = "Saved Phone Number";
const DEFAULT_PHONE_REGION = "AU";
export const STORAGE_CONTEXT_INVALIDATED_EVENT = "STORAGE_CONTEXT_INVALIDATED";
const STORAGE_UNAVAILABLE_CODE = "STORAGE_UNAVAILABLE";
let cachedPhoneNumber = null;
let storageUnavailableNotified = false;
const personasCache = new Map();
let personasCacheListenersInitialized = false;

const ticketCounterKey = (ticketNumber) => `ticket-${ticketNumber}`;

function hasChromeStorage() {
  return typeof chrome !== "undefined" && chrome.runtime?.id && chrome.storage?.local;
}

const isContextInvalidated = (error) =>
  typeof error?.message === "string" &&
  error.message.toLowerCase().includes("context invalidated");

class StorageUnavailableError extends Error {
  constructor(message = "Extension storage is unavailable. Reload the extension to continue.") {
    super(message);
    this.name = "StorageUnavailableError";
    this.code = STORAGE_UNAVAILABLE_CODE;
  }
}

function notifyStorageUnavailable(reason) {
  if (storageUnavailableNotified) {
    return;
  }
  storageUnavailableNotified = true;
  try {
    chrome.runtime?.sendMessage?.(
      { type: STORAGE_CONTEXT_INVALIDATED_EVENT, payload: { message: reason } },
      () => chrome.runtime?.lastError
    );
  } catch (error) {
    console.warn("[Storage] Failed to broadcast storage invalidation", error);
  }
}

function buildStorageUnavailableError(baseError) {
  const message =
    baseError?.message ||
    "Extension storage became unavailable. Please reload the extension from chrome://extensions.";
  return new StorageUnavailableError(message);
}

export function isStorageUnavailableError(error) {
  if (!error) {
    return false;
  }
  if (error instanceof StorageUnavailableError) {
    return true;
  }
  return error?.code === STORAGE_UNAVAILABLE_CODE;
}

function storageGet(keys) {
  if (hasChromeStorage()) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys ?? null, (result) => {
        if (chrome.runtime.lastError) {
          if (isContextInvalidated(chrome.runtime.lastError)) {
            const failure = buildStorageUnavailableError(chrome.runtime.lastError);
            notifyStorageUnavailable(failure.message);
            reject(failure);
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
            const failure = buildStorageUnavailableError(chrome.runtime.lastError);
            notifyStorageUnavailable(failure.message);
            reject(failure);
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
            const failure = buildStorageUnavailableError(chrome.runtime.lastError);
            notifyStorageUnavailable(failure.message);
            reject(failure);
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

  const parseValue = (value) => {
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return JSON.parse(trimmed);
      } catch (error) {
        return value;
      }
    }
    return value;
  };

  if (keys === null || typeof keys === "undefined") {
    const result = {};
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      result[key] = parseValue(window.localStorage.getItem(key));
    }
    return result;
  }

  if (Array.isArray(keys)) {
    return keys.reduce((acc, key) => {
      acc[key] = parseValue(window.localStorage.getItem(key));
      return acc;
    }, {});
  }

  if (typeof keys === "string") {
    return { [keys]: parseValue(window.localStorage.getItem(keys)) };
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

function invalidatePersonasCache(region) {
  if (region) {
    personasCache.delete(region);
    return;
  }
  personasCache.clear();
}

function getCachedRegionPersonas(region) {
  if (!region) {
    return null;
  }
  return personasCache.get(region) || null;
}

function setCachedRegionPersonas(region, personas) {
  if (!region) {
    return;
  }
  personasCache.set(region, personas);
}

function initializePersonasCacheInvalidation() {
  if (personasCacheListenersInitialized) {
    return;
  }
  if (typeof chrome === "undefined") {
    return;
  }
  personasCacheListenersInitialized = true;

  if (chrome.runtime?.onMessage?.addListener) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === "SETTINGS_UPDATED") {
        invalidatePersonasCache();
      }
    });
  }

  if (chrome.storage?.onChanged?.addListener) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && changes?.[SETTINGS_KEY]) {
        invalidatePersonasCache();
      }
    });
  }
}

initializePersonasCacheInvalidation();

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
    SELECTED_REGION_KEY,
  ]);

  return {
    prefix: data[EMAIL_PREFIX_KEY] || "",
    ticketNumber: data[LAST_TICKET_KEY] || "",
    lastEmail: data[LAST_EMAIL_KEY] || "",
    phoneNumber: data[PHONE_NUMBER_KEY] || "",
    region: data[SELECTED_REGION_KEY] || "AU",
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
  const maxRetries = 3; // Reduced from 10 to 3 (max ~750ms total)
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      // Read current value with nonce
      const result = await storageGet(key);
      const storedData = result[key];

      // Parse stored data: could be old format (number) or new format (object with nonce)
      let currentValue, currentNonce;
      if (typeof storedData === 'object' && storedData !== null) {
        currentValue = parseInt(storedData.value, 10) || 0;
        currentNonce = storedData.nonce;
      } else {
        currentValue = parseInt(storedData, 10) || 0;
        currentNonce = null;
      }

      const nextValue = currentValue + 1;
      const nextNonce = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

      // Write new value with unique nonce
      await storageSet({ [key]: { value: nextValue, nonce: nextNonce } });

      // Verify the write succeeded by checking if our nonce is still there
      const verifyResult = await storageGet(key);
      const verifiedData = verifyResult[key];

      // Check if our write stuck (nonce matches)
      if (verifiedData && typeof verifiedData === 'object' && verifiedData.nonce === nextNonce) {
        // Success! Our write was not overwritten
        return currentValue;
      }

      // Another writer overwrote us, retry
      attempt++;

      // Add exponential backoff to reduce contention (max 200ms, was 500ms)
      if (attempt < maxRetries) {
        const delay = Math.min(50 * Math.pow(2, attempt), 200);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      if (isStorageUnavailableError(error)) {
        throw error;
      }
      console.error(`[Storage] Attempt ${attempt + 1} failed:`, error);

      // Fast-fail on quota or permission errors (no point retrying)
      const errorMsg = error.message?.toLowerCase() || '';
      if (errorMsg.includes('quota') || errorMsg.includes('permission') || errorMsg.includes('denied')) {
        throw new Error(`Storage error: ${error.message}`);
      }

      attempt++;

      // Add small delay before retry on error
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  // If all retries failed, throw error to prevent counter desync
  throw new Error(`Failed to atomically increment counter for ticket ${ticketNumber} after ${maxRetries} attempts`);
}

export function storeGeneratedEmail(email) {
  return storageSet({ [LAST_EMAIL_KEY]: email });
}

export async function getLastGeneratedEmail() {
  const result = await storageGet(LAST_EMAIL_KEY);
  return result[LAST_EMAIL_KEY] || "";
}

export async function savePhoneNumber(phoneNumber) {
  const normalized =
    typeof phoneNumber === "string" ? phoneNumber.trim() : "";
  if (normalized === cachedPhoneNumber) {
    return;
  }
  cachedPhoneNumber = normalized;
  await storageSet({ [PHONE_NUMBER_KEY]: normalized });
  try {
    await syncRegisterPhonePersona(DEFAULT_PHONE_REGION, normalized);
  } catch (error) {
    if (isStorageUnavailableError(error)) {
      throw error;
    }
    console.warn("[Storage] Failed to sync register-phone persona", error);
  }
}

export async function getPhoneNumber() {
  const result = await storageGet(PHONE_NUMBER_KEY);
  const value = result[PHONE_NUMBER_KEY] || "";
  cachedPhoneNumber = value;
  return value;
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

  try {
    await saveEmailSettings({ prefix, ticketNumber });
    const currentCount = await bumpTicketCounter(ticketNumber);
    const email = `${prefix}+${ticketNumber}-${currentCount}${EMAIL_DOMAIN}`;
    await storeGeneratedEmail(email);

    return { email };
  } catch (error) {
    if (isStorageUnavailableError(error)) {
      throw error;
    }
    console.error("[Storage] Failed to generate email", error);
    return { email: null, error: "COUNTER_INCREMENT_FAILED" };
  }
}

export async function loadSettings() {
  try {
    const data = await storageGet([SETTINGS_KEY, SETTINGS_MIGRATION_KEY]);
    const storedSettings = parseSettingsObject(data?.[SETTINGS_KEY]);
    if (storedSettings) {
      const normalized = normalizeSettingsStructure(storedSettings);
      const { settings: migrated, modified } = await ensureRegisterPhonePersona(
        normalized
      );
      if (storedSettings.version !== SETTINGS_VERSION) {
        await storageSet({ [SETTINGS_KEY]: migrated });
        invalidatePersonasCache();
      } else if (modified) {
        await storageSet({ [SETTINGS_KEY]: migrated });
        invalidatePersonasCache();
      }
      return migrated;
    }
    const legacy = await migrateLegacyRoutes(
      toBoolean(data?.[SETTINGS_MIGRATION_KEY])
    );
    const { settings: migratedLegacy, modified: legacyModified } =
      await ensureRegisterPhonePersona(legacy);
    if (legacyModified) {
      await storageSet({ [SETTINGS_KEY]: migratedLegacy });
      invalidatePersonasCache();
    }
    return migratedLegacy;
  } catch (error) {
    if (isStorageUnavailableError(error)) {
      throw error;
    }
    console.error("[Storage] Failed to load settings", error);
    const defaults = getDefaultSettings();
    const { settings: migrated } = await ensureRegisterPhonePersona(defaults);
    await storageSet({ [SETTINGS_KEY]: migrated });
    invalidatePersonasCache();
    return migrated;
  }
}

export async function saveSettings(settings) {
  const normalized = normalizeSettingsStructure(settings);
  await storageSet({ [SETTINGS_KEY]: normalized });
  invalidatePersonasCache();
  return normalized;
}

export async function getPersonasByRegion(region) {
  if (!region) {
    return {};
  }
  const cached = getCachedRegionPersonas(region);
  if (cached) {
    return mergeRegionPersonas({}, cached);
  }
  const settings = await loadSettings();
  const regionData = settings.personas?.[region] ?? {};
  const cloned = mergeRegionPersonas({}, regionData);
  setCachedRegionPersonas(region, cloned);
  return mergeRegionPersonas({}, cloned);
}

export async function savePersonas(region, personas = {}) {
  if (!region) {
    throw new Error("Region is required to save personas");
  }
  const settings = await loadSettings();
  settings.personas[region] = mergeRegionPersonas({}, personas);
  const updated = await saveSettings(settings);

  if (region === DEFAULT_PHONE_REGION) {
    const phoneValue = extractPhoneNumberFromRegion(updated.personas?.[region]);
    await storageSet({ [PHONE_NUMBER_KEY]: phoneValue || "" });
  }

  const clonedRegion = mergeRegionPersonas({}, updated.personas?.[region] || {});
  setCachedRegionPersonas(region, clonedRegion);
  return clonedRegion;
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

  base.recordingSettings = normalizeRecordingSettings(
    settings.recordingSettings,
    base.recordingSettings
  );

  base.version = SETTINGS_VERSION;
  return base;
}

async function migrateLegacyRoutes(hasMigrated) {
  const defaults = getDefaultSettings();
  if (hasMigrated) {
    await storageSet({ [SETTINGS_KEY]: defaults });
    invalidatePersonasCache();
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
  invalidatePersonasCache();
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

async function syncRegisterPhonePersona(region, phoneNumber) {
  if (!region) {
    return;
  }

  const normalized = typeof phoneNumber === "string" ? phoneNumber.trim() : "";
  const settings = await loadSettings();
  if (!settings.personas || typeof settings.personas !== "object") {
    settings.personas = {};
  }

  const regionStore =
    settings.personas[region] || (settings.personas[region] = {});
  const existingList = Array.isArray(regionStore[REGISTER_PHONE_ROUTE_ID])
    ? [...regionStore[REGISTER_PHONE_ROUTE_ID]]
    : [];

  const personaIndex = existingList.findIndex(
    (persona) => persona?.id === SAVED_PHONE_PERSONA_ID
  );

  if (!normalized) {
    if (personaIndex === -1) {
      return;
    }
    existingList.splice(personaIndex, 1);
  } else {
    const persona =
      personaIndex === -1
        ? {
            id: SAVED_PHONE_PERSONA_ID,
            label: SAVED_PHONE_PERSONA_LABEL,
            fields: [],
          }
        : { ...existingList[personaIndex] };
    if (!persona.id) {
      persona.id = SAVED_PHONE_PERSONA_ID;
    }
    if (!persona.label) {
      persona.label = SAVED_PHONE_PERSONA_LABEL;
    }
    persona.fields = [
      {
        role: "textbox",
        name: "phone",
        target: "phone",
        value: normalized,
      },
    ];
    if (personaIndex === -1) {
      existingList.push(persona);
    } else {
      existingList[personaIndex] = persona;
    }
  }

  regionStore[REGISTER_PHONE_ROUTE_ID] = existingList;
  settings.personas[region] = regionStore;
  await saveSettings(settings);
  invalidatePersonasCache(region);
  broadcastSettingsUpdate({});
}

function broadcastSettingsUpdate(payload) {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    return;
  }
  try {
    chrome.runtime.sendMessage(
      { type: "SETTINGS_UPDATED", payload },
      () => chrome.runtime.lastError
    );
  } catch (error) {
    console.warn("[Storage] Failed to broadcast settings update", error);
  }
}

async function ensureRegisterPhonePersona(settings) {
  if (
    !settings ||
    typeof settings !== "object" ||
    !settings.personas ||
    typeof settings.personas !== "object"
  ) {
    return { settings, modified: false };
  }

  const auStore = settings.personas.AU || (settings.personas.AU = {});
  const currentList = auStore[REGISTER_PHONE_ROUTE_ID];
  if (Array.isArray(currentList) && currentList.length > 0) {
    return { settings, modified: false };
  }

  // Always read from storage (don't use cache) to prevent desync across contexts
  const legacyPhone = await getPhoneNumber();
  if (!legacyPhone) {
    return { settings, modified: false };
  }

  auStore[REGISTER_PHONE_ROUTE_ID] = [
    {
      id: SAVED_PHONE_PERSONA_ID,
      label: SAVED_PHONE_PERSONA_LABEL,
      fields: [
        {
          role: "textbox",
          name: "phone",
          target: "phone",
          value: legacyPhone,
        },
      ],
    },
  ];

  settings.personas.AU = auStore;
  return { settings, modified: true };
}

// Recording settings helpers
export async function loadRecordingSettings() {
  const settings = await loadSettings();
  return normalizeRecordingSettings(settings.recordingSettings);
}

export async function saveRecordingSettings(recordingSettings) {
  const settings = await loadSettings();
  settings.recordingSettings = {
    ...settings.recordingSettings,
    ...recordingSettings,
  };
  await saveSettings(settings);
}

function extractPhoneNumberFromRegion(regionStore = {}) {
  const personas = regionStore?.[REGISTER_PHONE_ROUTE_ID];
  if (!Array.isArray(personas)) {
    return "";
  }
  const savedPersona =
    personas.find((persona) => persona?.id === SAVED_PHONE_PERSONA_ID) || null;
  if (!savedPersona || !Array.isArray(savedPersona.fields)) {
    return "";
  }
  const phoneField =
    savedPersona.fields.find(
      (field) =>
        field?.name === "phone" ||
        field?.target === "phone" ||
        field?.id === "phone"
    ) || null;
  return typeof phoneField?.value === "string"
    ? phoneField.value.trim()
    : "";
}

function normalizeRecordingSettings(input, fallbackDefaults) {
  const defaults = {
    filenamePattern: "zeller-recording-{date}-{time}",
    videoQuality: "medium",
    autoStopMinutes: 10,
    videoCodec: "vp9",
    includeAudio: false,
    screenshotFormat: "png",
    showCountdown: true,
    notifyOnComplete: true,
    ...(fallbackDefaults || {}),
  };

  const merged = {
    ...defaults,
    ...(typeof input === "object" && input ? input : {}),
  };

  if (typeof merged.autoStopMinutes !== "number") {
    merged.autoStopMinutes = defaults.autoStopMinutes;
  }
  if (typeof merged.filenamePattern !== "string" || !merged.filenamePattern.trim()) {
    merged.filenamePattern = defaults.filenamePattern;
  }
  if (!["low", "medium", "high"].includes(merged.videoQuality)) {
    merged.videoQuality = defaults.videoQuality;
  }
  merged.screenshotFormat = "png";
  merged.showCountdown = true;
  merged.notifyOnComplete = true;
  merged.videoCodec = ["vp8", "vp9", "h264"].includes(merged.videoCodec)
    ? merged.videoCodec
    : defaults.videoCodec;

  return merged;
}
