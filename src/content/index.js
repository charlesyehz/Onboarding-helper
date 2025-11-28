(async function initContentFeatures() {
  const [{ applyValue }, storage] = await Promise.all([
    import(chrome.runtime.getURL("src/shared/domEvents.js")),
    import(chrome.runtime.getURL("src/shared/storage.js")),
  ]);

  initPhoneAutofill(applyValue, storage.getPhoneNumber);

  // Only init widget if enabled in settings
  const isWidgetEnabled = await storage.isInlineWidgetEnabled();
  if (isWidgetEnabled) {
    initSignupEmailWidget(applyValue, storage);
  }

  // Listen for widget toggle changes
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "WIDGET_TOGGLED") {
      // Reload the page to apply widget changes
      window.location.reload();
    }
  });
})();

function initSettingsOverlayBridge() {
  let overlayModulePromise = null;

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "OPEN_SETTINGS_OVERLAY") {
      return;
    }

    if (!overlayModulePromise) {
      overlayModulePromise = import(
        chrome.runtime.getURL("src/content/settingsOverlay.js")
      );
    }

    overlayModulePromise
      .then((module) => module.openSettingsOverlay())
      .catch((error) =>
        console.error("[Settings] Failed to open overlay", error)
      );
  });
}

function initPhoneAutofill(applyValue, getPhoneNumber) {
  const targetId = "phone";
  const DEFAULT_PHONE = "0423105719";

  async function fillPhoneInput() {
    const phoneInput = document.getElementById(targetId);
    if (!phoneInput) {
      return false;
    }

    const storedNumber = (await getPhoneNumber()) || DEFAULT_PHONE;
    applyValue(phoneInput, storedNumber, { triggerFocus: false });
    console.log(`[Autofill] Phone input populated with ${storedNumber}`);
    return true;
  }

  function watchForPhoneField() {
    const observer = new MutationObserver(async () => {
      if (await fillPhoneInput()) {
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 10000);
  }

  async function start() {
    if (await fillPhoneInput()) return;
    watchForPhoneField();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "ROUTE_UPDATED") {
      const pathname = message.payload?.pathname || "";
      if (pathname.includes("register-phone")) {
        start();
      }
    }
  });
}

function initSignupEmailWidget(applyValue, storage) {
  const controller = createInlineWidgetController({
    applyValue,
    selectors: [
      "#signup-email-input",
      'input[id="email"]',
      'input[name="email"]',
      'input[type="email"]',
      'input[id*="email"]',
      'input[placeholder*="email"]',
      'input[placeholder*="Email"]',
    ],
    generateSignupEmail: storage.generateSignupEmail,
    isInlineWidgetEnabled: storage.isInlineWidgetEnabled,
  });

  controller
    .init()
    .catch((error) =>
      console.error("[Prefill Widget] Failed to initialise", error)
    );
}

function createInlineWidgetController({
  applyValue,
  selectors,
  generateSignupEmail,
  isInlineWidgetEnabled,
}) {
  let observer = null;
  let enabled = false;
  const attachedWidgets = new Map();

  const ensureBodyReady = (callback) => {
    if (document.body) {
      callback();
      return;
    }
    document.addEventListener(
      "DOMContentLoaded",
      () => callback(),
      { once: true }
    );
  };

  const findNextEmailField = () => {
    let fallback = null;
    for (const selector of selectors) {
      const candidates = document.querySelectorAll(selector);
      for (const candidate of candidates) {
        if (!(candidate instanceof HTMLElement)) {
          continue;
        }
        if (attachedWidgets.has(candidate)) {
          continue;
        }
        const type =
          candidate instanceof HTMLInputElement
            ? candidate.type
            : candidate.getAttribute?.("type");
        if (type === "hidden") {
          continue;
        }
        if (type === "email") {
          return candidate;
        }
        if (!fallback) {
          fallback = candidate;
        }
      }
    }
    return fallback;
  };

  const attachWidgetIfNeeded = () => {
    if (!enabled) {
      return;
    }
    const emailField = findNextEmailField();
    if (!emailField) {
      return;
    }
    if (emailField.dataset.zellerWidgetAttached === "true") {
      return;
    }
    emailField.dataset.zellerWidgetAttached = "true";
    const cleanup = createEmailWidget(
      emailField,
      applyValue,
      generateSignupEmail,
      () => attachedWidgets.delete(emailField)
    );
    attachedWidgets.set(emailField, cleanup);
  };

  const startObserver = () => {
    if (observer || !document.body) {
      return;
    }
    observer = new MutationObserver(attachWidgetIfNeeded);
    observer.observe(document.body, { childList: true, subtree: true });
  };

  const stopObserver = () => {
    observer?.disconnect();
    observer = null;
  };

  const enableWidget = () => {
    injectWidgetStyles();
    ensureBodyReady(() => {
      attachWidgetIfNeeded();
      startObserver();
    });
  };

  const teardownWidget = () => {
    stopObserver();
    attachedWidgets.forEach((cleanup) => cleanup());
    attachedWidgets.clear();
  };

  const readDesiredState = async () => {
    if (typeof isInlineWidgetEnabled === "function") {
      try {
        return await isInlineWidgetEnabled();
      } catch (error) {
        console.warn(
          "[Prefill Widget] Unable to read inline widget toggle",
          error
        );
      }
    }
    return true;
  };

  const refreshState = async (forcedValue) => {
    const shouldEnable =
      typeof forcedValue === "boolean" ? forcedValue : await readDesiredState();
    if (shouldEnable === enabled) {
      return;
    }
    enabled = shouldEnable;
    if (enabled) {
      enableWidget();
    } else {
      teardownWidget();
    }
  };

  const handleMessage = (message) => {
    if (
      message?.type === "SETTINGS_UPDATED" &&
      typeof message.payload?.inlineWidgetEnabled === "boolean"
    ) {
      refreshState(message.payload.inlineWidgetEnabled).catch((error) =>
        console.error("[Prefill Widget] Failed to apply toggle", error)
      );
    }
  };

  const init = async () => {
    await refreshState();
    chrome.runtime.onMessage.addListener(handleMessage);
  };

  return { init };
}

function injectWidgetStyles() {
  if (document.getElementById("zeller-prefill-widget-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "zeller-prefill-widget-styles";
  style.textContent = `
    .zeller-prefill-widget {
      position: absolute;
      z-index: 2147483647;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .zeller-prefill-widget.visible {
      opacity: 1;
    }
    .zeller-prefill-badge {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      border: none;
      background: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      pointer-events: auto;
      padding: 0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    .zeller-prefill-badge::before {
      content: "✨";
      font-size: 12px;
      line-height: 1;
      filter: brightness(0) invert(1);
    }
    .zeller-prefill-tooltip {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      min-width: 200px;
      background: #ffffff;
      border: 1px solid #e1e8ed;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      padding: 0.5rem;
      display: none;
      pointer-events: auto;
    }
    .zeller-prefill-tooltip button {
      width: 100%;
      background: #0071ce;
      border: none;
      border-radius: 4px;
      color: #ffffff;
      font-size: 0.8rem;
      padding: 0.35rem 0.5rem;
      cursor: pointer;
    }
    .zeller-prefill-tooltip p {
      margin: 0.5rem 0 0;
      font-size: 0.68rem;
      color: #5c6c7d;
      line-height: 1.2;
    }
    .zeller-prefill-widget[data-open="true"] .zeller-prefill-tooltip {
      display: block;
    }
  `;
  document.head.appendChild(style);
}

function createEmailWidget(
  field,
  applyValue,
  generateSignupEmail,
  onCleanup
) {
  const container = document.createElement("div");
  container.className = "zeller-prefill-widget";
  container.setAttribute("data-open", "false");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "zeller-prefill-badge";
  button.title = "Prefill email";

  const tooltip = document.createElement("div");
  tooltip.className = "zeller-prefill-tooltip";

  const actionButton = document.createElement("button");
  actionButton.type = "button";
  actionButton.textContent = "Prefill email";

  const hint = document.createElement("p");
  hint.textContent = "Uses your saved prefix + ticket.";

  tooltip.appendChild(actionButton);
  tooltip.appendChild(hint);

  container.appendChild(button);
  container.appendChild(tooltip);
  document.body.appendChild(container);

  const BADGE_SIZE = 20;
  const DEFAULT_RIGHT_OFFSET = 10;
  const SMART_STACK_OFFSET = 40;

  // Detect if there are conflicting icons (like password managers)
  const hasConflictingIcons = () => {
    const rect = field.getBoundingClientRect();
    const rightEdge = rect.right - DEFAULT_RIGHT_OFFSET - BADGE_SIZE;

    // Check for elements at the default position
    const elementsAtPosition = document.elementsFromPoint(
      rightEdge,
      rect.top + rect.height / 2
    );

    // Filter out our own widget and the input field
    const conflicts = elementsAtPosition.filter(
      (el) => el !== field && el !== container && !container.contains(el)
    );

    return conflicts.length > 0;
  };

  const reposition = () => {
    const rect = field.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0;

    if (!isVisible) {
      container.style.display = "none";
      return;
    }

    container.style.display = "flex";

    // Smart stacking: detect conflicts and adjust position
    const rightOffset = hasConflictingIcons()
      ? SMART_STACK_OFFSET
      : DEFAULT_RIGHT_OFFSET;

    // Position INSIDE the input field, on the right side
    const top = window.scrollY + rect.top + (rect.height - BADGE_SIZE) / 2;
    const left = window.scrollX + rect.right - rightOffset - BADGE_SIZE;

    container.style.top = `${top}px`;
    container.style.left = `${left}px`;
  };

  reposition();

  // Focus visibility behavior (not hover)
  const showWidget = () => {
    container.classList.add("visible");
    reposition();
  };

  const hideWidget = () => {
    if (container.getAttribute("data-open") === "false") {
      container.classList.remove("visible");
    }
  };

  field.addEventListener("focus", showWidget);
  const blurHandler = () => {
    setTimeout(hideWidget, 200);
  };
  field.addEventListener("blur", blurHandler);

  const resizeObserver = new ResizeObserver(reposition);
  resizeObserver.observe(field);

  // Also observe the field's parent for layout changes (like validation messages)
  if (field.parentElement) {
    resizeObserver.observe(field.parentElement);
  }

  // Watch for DOM mutations that might affect position (validation messages, etc.)
  const mutationObserver = new MutationObserver(() => {
    reposition();
  });

  // Observe the field's parent for child list and subtree changes
  const observeTarget =
    field.closest("form") || field.parentElement || document.body;
  mutationObserver.observe(observeTarget, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style"],
  });

  const repositionHandler = () => reposition();
  window.addEventListener("scroll", repositionHandler, true);
  window.addEventListener("resize", repositionHandler);

  const closeTooltip = () => {
    container.setAttribute("data-open", "false");
    if (!field.matches(":focus")) {
      hideWidget();
    }
  };

  const badgeClickHandler = (event) => {
    event.stopPropagation();
    const isOpen = container.getAttribute("data-open") === "true";
    container.setAttribute("data-open", String(!isOpen));
    if (!isOpen) {
      container.classList.add("visible");
    }
  };
  button.addEventListener("click", badgeClickHandler);

  const outsideClickHandler = (event) => {
    if (!container.contains(event.target)) {
      closeTooltip();
    }
  };
  document.addEventListener("click", outsideClickHandler, true);

  const actionButtonHandler = async (event) => {
    event.stopPropagation();
    try {
      const { email, error } = await generateSignupEmail();
      if (!email || error) {
        hint.textContent = "Set prefix + ticket in popup first.";
        return;
      }

      applyValue(field, email);
      hint.textContent = `Email prefilled: ${email}`;
      closeTooltip();
    } catch (err) {
      console.error("[Prefill Widget] Failed to generate email", err);
      hint.textContent = "Something went wrong. Try again.";
    }
  };
  actionButton.addEventListener("click", actionButtonHandler);

  let cleanupObserver;
  let disposed = false;

  const cleanup = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    field.removeEventListener("focus", showWidget);
    field.removeEventListener("blur", blurHandler);
    button.removeEventListener("click", badgeClickHandler);
    actionButton.removeEventListener("click", actionButtonHandler);
    window.removeEventListener("scroll", repositionHandler, true);
    window.removeEventListener("resize", repositionHandler);
    document.removeEventListener("click", outsideClickHandler, true);
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    cleanupObserver?.disconnect();
    container.remove();
    delete field.dataset.zellerWidgetAttached;
    if (typeof onCleanup === "function") {
      onCleanup();
    }
  };

  cleanupObserver = new MutationObserver(() => {
    if (!document.body.contains(field)) {
      cleanup();
    }
  });

  cleanupObserver.observe(document.body, { childList: true, subtree: true });
  return cleanup;
}
