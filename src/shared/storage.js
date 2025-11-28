const EMAIL_PREFIX_KEY = "onboarding-email-prefix";
const LAST_TICKET_KEY = "last-ticket-number";
const LAST_EMAIL_KEY = "last-generated-email";
const PHONE_NUMBER_KEY = "onboarding-phone-number";
export const EMAIL_DOMAIN = "@myzeller.com";

const ticketCounterKey = (ticketNumber) => `ticket-${ticketNumber}`;

function hasChromeStorage() {
  return typeof chrome !== "undefined" && chrome.storage?.local;
}

function storageGet(keys) {
  if (hasChromeStorage()) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys ?? null, (result) => {
        if (chrome.runtime.lastError) {
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
