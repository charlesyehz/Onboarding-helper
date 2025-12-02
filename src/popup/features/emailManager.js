import {
  clearAutofillHistory,
  generateSignupEmail,
  getSelectedRegion,
  isStorageUnavailableError,
  loadPopupState,
  saveEmailSettings,
  savePhoneNumber,
} from "../../shared/storage.js";
import { getActiveTab } from "../../shared/tabs.js";

export async function initEmailManager(preloadedState = null) {
  const prefixInput = document.getElementById("email-prefix");
  const ticketInput = document.getElementById("ticket-number");
  const phoneInput = document.getElementById("phone-number");
  const statusEl = document.getElementById("email-status");
  const lastEmailDisplay = document.getElementById("last-email-display");
  const generateButton = document.getElementById("generate-email-btn");
  const clearHistoryButton = document.getElementById("clear-history-btn");

  const state = preloadedState || (await loadPopupState());
  const {
    prefix = "",
    ticketNumber = "",
    phoneNumber = "",
    lastEmail = "",
  } = state || {};

  prefixInput.value = prefix;
  ticketInput.value = ticketNumber;
  phoneInput.value = phoneNumber;
  renderLastEmail(lastEmailDisplay, lastEmail);

  const persistEmailSettings = () =>
    saveEmailSettings({
      prefix: prefixInput.value.trim(),
      ticketNumber: ticketInput.value.trim(),
    }).catch((error) =>
      console.error("[Email Manager] Failed to persist email settings", error)
    );

  prefixInput.addEventListener("input", persistEmailSettings);
  ticketInput.addEventListener("input", persistEmailSettings);

  let phoneSaveTimeout = null;
  let lastSavedPhoneNumber = phoneNumber?.trim() || "";
  let currentRegion = await getSelectedRegion().catch(() => "AU");
  applyPhoneRegionState(currentRegion);

  window.addEventListener("regionChanged", (event) => {
    currentRegion = event.detail?.region || currentRegion;
    applyPhoneRegionState(currentRegion);
  });

  const queuePhoneSave = (value, { immediate = false, force = false } = {}) => {
    if (currentRegion !== "AU" && !force) {
      return;
    }
    const trimmed = value.trim();
    if (trimmed === lastSavedPhoneNumber) {
      return;
    }

    const persist = async () => {
      try {
        await savePhoneNumber(trimmed);
        lastSavedPhoneNumber = trimmed;
        window.dispatchEvent(new CustomEvent("personasUpdated"));
      } catch (error) {
        console.error("[Email Manager] Failed to save phone number", error);
      }
    };

    if (immediate) {
      clearTimeout(phoneSaveTimeout);
      phoneSaveTimeout = null;
      void persist();
      return;
    }

    clearTimeout(phoneSaveTimeout);
    phoneSaveTimeout = setTimeout(persist, 400);
  };

  phoneInput.addEventListener("input", () => queuePhoneSave(phoneInput.value));
  phoneInput.addEventListener("blur", () =>
    queuePhoneSave(phoneInput.value, { immediate: true })
  );

  if (clearHistoryButton) {
    clearHistoryButton.addEventListener("click", async () => {
      await clearAutofillHistory();
      prefixInput.value = "";
      ticketInput.value = "";
      phoneInput.value = "";
      renderLastEmail(lastEmailDisplay, "");
      queuePhoneSave("", { immediate: true, force: true });
    });
  }

  function applyPhoneRegionState(region) {
    const isAU = region === "AU";
    phoneInput.disabled = !isAU;
    phoneInput.title = isAU
      ? "Phone number used for AU register-phone forms"
      : "UK phone numbers are configured via Settings";
    phoneInput.placeholder = isAU
      ? "Enter phone number"
      : "Managed via Settings for UK";
  }

  generateButton.addEventListener("click", async () => {
    statusEl.textContent = "";
    const prefix = prefixInput.value.trim();
    const ticketNumber = ticketInput.value.trim();

    if (!prefix) {
      statusEl.textContent = "Please enter a valid email prefix.";
      return;
    }

    if (!ticketNumber) {
      statusEl.textContent = "Please enter a ticket number.";
      return;
    }

    const tab = await getActiveTab();
    if (!tab?.id) {
      statusEl.textContent = "Unable to determine the active tab.";
      return;
    }

    // Check if signup email field exists before generating
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: checkSignupEmailField,
    });

    const fieldExists = results?.[0]?.result;
    if (!fieldExists) {
      console.error(
        "[Email Manager] Signup email field not found on page. Email not generated."
      );
      statusEl.textContent = "Signup email field not found on this page.";
      return;
    }

    // Only generate and increment counter if field exists
    let generateResult;
    try {
      generateResult = await generateSignupEmail({
        prefix,
        ticketNumber,
      });
    } catch (error) {
      if (isStorageUnavailableError(error)) {
        statusEl.textContent =
          "Extension storage is unavailable. Reload the extension to continue.";
      } else {
        console.error("[Email Manager] Failed to generate signup email", error);
        statusEl.textContent = "Unable to generate email. Please try again.";
      }
      return;
    }

    const { email, error } = generateResult || {};

    if (!email || error) {
      statusEl.textContent =
        "Unable to generate email. Confirm prefix and ticket.";
      return;
    }

    renderLastEmail(lastEmailDisplay, email);

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fillSignupEmail,
      args: [email],
    });

    statusEl.textContent = "Signup email populated.";
  });
}

function renderLastEmail(displayEl, email) {
  if (!displayEl) return;
  displayEl.innerHTML = email
    ? `Last email:<br>${email}`
    : "No email generated yet";
}

function checkSignupEmailField() {
  const selectors = [
    "#signup-email-input",
    'input[id="email"]',
    'input[type="email"]',
    'input[name="email"]',
    'input[name="username"]',
    'input[id*="email"]',
    'input[id*="username"]',
    'input[placeholder*="email"]',
    'input[placeholder*="Email"]',
  ];

  return selectors.some((selector) => document.querySelector(selector));
}

function fillSignupEmail(email) {
  const selectors = [
    "#signup-email-input",
    'input[id="email"]',
    'input[type="email"]',
    'input[name="email"]',
    'input[name="username"]',
    'input[id*="email"]',
    'input[id*="username"]',
    'input[placeholder*="email"]',
    'input[placeholder*="Email"]',
  ];

  let emailField = null;
  for (const selector of selectors) {
    const candidate = document.querySelector(selector);
    if (candidate) {
      emailField = candidate;
      break;
    }
  }

  if (!emailField) {
    console.error("[Email Manager] Signup email field not found.");
    return;
  }

  emailField.value = email;

  ["input", "change"].forEach((type) => {
    const event = new Event(type, { bubbles: true });
    emailField.dispatchEvent(event);
  });

  console.log(`[Email Manager] Populated signup email with ${email}`);
}
