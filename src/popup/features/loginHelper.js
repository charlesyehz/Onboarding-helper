import { getLastGeneratedEmail } from "../../shared/storage.js";
import { getActiveTab } from "../../shared/tabs.js";

const LOGIN_SELECTORS = [
  'input[id="email"]',
  'input[type="email"]',
  'input[name="email"]',
  'input[name="username"]',
  'input[id*="email"]',
  'input[id*="username"]',
  'input[placeholder*="email"]',
  'input[placeholder*="Email"]',
  'input[autocomplete="email"]',
];

export function initLoginHelper() {
  const logBackInButton = document.getElementById("log-back-in-btn");
  const statusEl = document.getElementById("email-status");

  logBackInButton.addEventListener("click", async () => {
    const email = await getLastGeneratedEmail();
    if (!email) {
      statusEl.textContent = "No email found. Generate one first.";
      return;
    }

    const tab = await getActiveTab();
    if (!tab?.id) {
      statusEl.textContent = "Unable to determine the active tab.";
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fillLoginEmail,
      args: [email, LOGIN_SELECTORS],
    });

    statusEl.textContent = "Login email filled.";
  });
}

function fillLoginEmail(email, selectors) {
  const tryFill = () => {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!element) continue;

      element.value = email;
      ["input", "change"].forEach((type) => {
        const event = new Event(type, { bubbles: true });
        element.dispatchEvent(event);
      });
      element.focus();
      element.blur();
      console.log(`[Login Helper] Filled email via selector "${selector}"`);
      return true;
    }
    return false;
  };

  if (tryFill()) return;

  const observer = new MutationObserver(() => {
    if (tryFill()) {
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 10000);
}
