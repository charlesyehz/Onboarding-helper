(async function initContentFeatures() {
  // Import recording overlay first (works on all pages)
  const recordingOverlay = await import(
    chrome.runtime.getURL("src/content/recordingOverlay.js")
  );
  initRecordingOverlay(recordingOverlay);

  const { isAllowedLocation } = await import(
    chrome.runtime.getURL("src/config/allowedOrigins.js")
  );
  if (!isAllowedLocation(window.location)) {
    return;
  }

  const [{ applyValue }, storage, widgetConfig, routes] = await Promise.all([
    import(chrome.runtime.getURL("src/shared/domEvents.js")),
    import(chrome.runtime.getURL("src/shared/storage.js")),
    import(chrome.runtime.getURL("src/config/widgetConfig.js")),
    import(chrome.runtime.getURL("src/config/routes.js")),
  ]);

  // Track active widget controllers so we can clean them up on route change
  let activeControllers = [];

  // Function to initialize widgets for current route
  const initWidgetsForCurrentRoute = async () => {
    if (!chrome.runtime?.id) {
      console.warn(
        "[Widget] Extension context invalidated - cleaning up and please refresh the page"
      );

      // Cleanup active widgets before returning to prevent memory leaks
      activeControllers.forEach((controller) => {
        try {
          if (controller.cleanup) {
            controller.cleanup();
          }
        } catch (error) {
          console.warn("[Widget] Cleanup error during invalidation:", error);
        }
      });
      activeControllers = [];

      return;
    }

    try {
      activeControllers.forEach((controller) => {
        if (controller.cleanup) {
          controller.cleanup();
        }
      });
      activeControllers = [];

      const isWidgetEnabled = await storage.isInlineWidgetEnabled();

      if (isWidgetEnabled) {
        const controllers = await initUniversalWidget(
          applyValue,
          storage,
          widgetConfig,
          routes
        );
        if (controllers && Array.isArray(controllers)) {
          activeControllers = controllers;
        }
      }
    } catch (error) {
      console.error("[Widget] Failed to initialize widgets:", error);
    }
  };

  let lastPathname = window.location.pathname;

  const refreshWidgetsForPath = async (nextPathname) => {
    if (!nextPathname || nextPathname === lastPathname) {
      return;
    }
    lastPathname = nextPathname;
    try {
      await initWidgetsForCurrentRoute();
    } catch (error) {
      console.error("[Widget] Failed to refresh for route change", error);
    }
  };

  const handleRuntimeMessage = (message) => {
    if (message?.type === "WIDGET_TOGGLED") {
      window.location.reload();
      return;
    }
    if (message?.type === "ROUTE_UPDATED" && message.payload?.pathname) {
      refreshWidgetsForPath(message.payload.pathname);
      return;
    }
    if (message?.type === storage.STORAGE_CONTEXT_INVALIDATED_EVENT) {
      console.warn(
        "[Widget] Extension storage became unavailable. Reload the extension from chrome://extensions."
      );
    }
  };

  chrome.runtime.onMessage.addListener(handleRuntimeMessage);

  const requestInitialRouteSnapshot = () => {
    try {
      chrome.runtime.sendMessage(
        { type: "REQUEST_ROUTE_SNAPSHOT" },
        (response) => {
          if (chrome.runtime.lastError) {
            return;
          }
          let snapshotPath = response?.pathname;
          if (!snapshotPath && response?.url) {
            try {
              snapshotPath = new URL(response.url).pathname;
            } catch (error) {
              console.warn(
                "[Widget] Unable to parse snapshot URL",
                response.url,
                error
              );
            }
          }
          if (snapshotPath) {
            refreshWidgetsForPath(snapshotPath);
          }
        }
      );
    } catch (error) {
      console.warn("[Widget] Failed to request route snapshot", error);
    }
  };

  await initWidgetsForCurrentRoute();
  requestInitialRouteSnapshot();
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

async function initUniversalWidget(applyValue, storage, widgetConfig, routes) {
  const currentRoute = widgetConfig.detectRoute(window.location.pathname);
  if (!currentRoute) {
    return [];
  }

  const routeConfig = widgetConfig.getRouteConfig(currentRoute);
  if (!routeConfig || !routeConfig.fields) {
    return [];
  }

  const currentRegion = await storage.getSelectedRegion();

  const controllers = [];
  for (const fieldConfig of routeConfig.fields) {
    const controller = createUniversalWidgetController({
      applyValue,
      storage,
      fieldConfig,
      routeId: currentRoute,
      region: currentRegion,
      routes,
    });

    try {
      await controller.init();
      controllers.push(controller);
    } catch (error) {
      console.error("[Widget] Failed to initialize", error);
    }
  }

  return controllers;
}

const escapeAttributeValue = (value = "") => {
  if (typeof window !== "undefined" && window.CSS?.escape) {
    return window.CSS.escape(value);
  }
  return value.replace(/(["\\])/g, "\\$1");
};

function locateFieldByKey(key) {
  if (!key) {
    return null;
  }

  const normalized = key.trim();
  if (!normalized) {
    return null;
  }

  const escaped = escapeAttributeValue(normalized);
  const directSelectors = [
    `#${escaped}`,
    `input[name="${escaped}"]`,
    `select[name="${escaped}"]`,
    `textarea[name="${escaped}"]`,
  ];

  for (const selector of directSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
  }

  const fallbackSelectors = [
    `input[name$=".${escaped}"]`,
    `select[name$=".${escaped}"]`,
    `textarea[name$=".${escaped}"]`,
    `input[name*="${escaped}"]`,
    `select[name*="${escaped}"]`,
    `textarea[name*="${escaped}"]`,
    `input[id$="${escaped}"]`,
    `select[id$="${escaped}"]`,
    `textarea[id$="${escaped}"]`,
  ];

  for (const selector of fallbackSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
  }

  const lowerKey = normalized.toLowerCase();
  const labelledField = Array.from(document.querySelectorAll("label")).find(
    (label) => label.textContent.trim().toLowerCase() === lowerKey
  );

  if (labelledField) {
    const forId = labelledField.getAttribute("for");
    if (forId) {
      const element = document.getElementById(forId);
      if (element) {
        return element;
      }
    } else {
      const element = labelledField.querySelector("input, select, textarea");
      if (element) {
        return element;
      }
    }
  }

  return null;
}

function createUniversalWidgetController({
  applyValue,
  storage,
  fieldConfig,
  routeId,
  region,
  routes,
}) {
  let observer = null;
  let enabled = false;
  const attachedWidgets = new Map();
  const pendingAttachments = new Set(); // Synchronous guard against race conditions

  const ensureBodyReady = (callback) => {
    if (document.body) {
      callback();
      return;
    }
    document.addEventListener("DOMContentLoaded", () => callback(), {
      once: true,
    });
  };

  const findNextField = () => {
    for (const selector of fieldConfig.selectors) {
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
        return candidate;
      }
    }
    return null;
  };

  const attachWidgetIfNeeded = () => {
    if (!enabled) {
      return;
    }
    const field = findNextField();
    if (!field) {
      return;
    }

    // Check Set FIRST (synchronous, prevents race conditions)
    if (pendingAttachments.has(field)) {
      return;
    }

    // Double-check with dataset attribute
    if (field.dataset.zellerWidgetAttached === "true") {
      return;
    }

    // Mark as pending immediately (before any async work)
    pendingAttachments.add(field);
    field.dataset.zellerWidgetAttached = "true";

    const cleanup = createUniversalWidget(
      field,
      applyValue,
      storage,
      fieldConfig,
      routeId,
      region,
      routes,
      () => {
        attachedWidgets.delete(field);
        pendingAttachments.delete(field); // Clean up Set on removal
      }
    );
    attachedWidgets.set(field, cleanup);
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
    if (typeof storage.isInlineWidgetEnabled === "function") {
      try {
        return await storage.isInlineWidgetEnabled();
      } catch (error) {
        console.warn("[Widget] Unable to read inline widget toggle", error);
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

  const cleanup = () => {
    teardownWidget();
    chrome.runtime.onMessage.removeListener(handleMessage);
  };

  const init = async () => {
    await refreshState();
    chrome.runtime.onMessage.addListener(handleMessage);
  };

  return { init, cleanup };
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
      color: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      pointer-events: auto;
      padding: 0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    .zeller-prefill-badge::before {
      content: "👀";
      font-size: 12px;
      line-height: 1;
      color: ##fff;

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
    .tooltip-label {
      display: block;
      margin-bottom: 0.5rem;
      color: #333;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .persona-select {
      width: 100%;
      padding: 0.5rem;
      margin-bottom: 0.75rem;
      background: #fff;
      border: 1px solid #e1e8ed;
      border-radius: 4px;
      color: #333;
      font-size: 0.875rem;
      cursor: pointer;
    }
    .persona-select:focus {
      outline: none;
      border-color: #0071ce;
    }
    .tooltip-action-btn {
      width: 100%;
      background: #0071ce;
      border: none;
      border-radius: 4px;
      color: #ffffff;
      font-size: 0.875rem;
      padding: 0.5rem;
      cursor: pointer;
    }
    .tooltip-action-btn:hover {
      background: #005ba8;
    }
    .tooltip-hint {
      margin: 0.5rem 0 0;
      font-size: 0.75rem;
      color: #5c6c7d;
      line-height: 1.2;
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

async function createUniversalWidget(
  field,
  applyValue,
  storage,
  fieldConfig,
  routeId,
  region,
  routes,
  onCleanup
) {
  const container = document.createElement("div");
  container.className = "zeller-prefill-widget";
  container.setAttribute("data-open", "false");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "zeller-prefill-badge";
  button.title = fieldConfig.buttonLabel || "Prefill";

  const tooltip = document.createElement("div");
  tooltip.className = "zeller-prefill-tooltip";

  // Build tooltip content based on widget type
  let actionButton, hint, personaSelect;

  if (fieldConfig.widgetType === "persona-select") {
    // Persona selection dropdown - will be populated when tooltip opens
    const label = document.createElement("label");
    label.textContent = fieldConfig.tooltipLabel || "Select:";
    label.className = "tooltip-label";

    // Dropdown
    personaSelect = document.createElement("select");
    personaSelect.className = "persona-select";

    // Action button
    actionButton = document.createElement("button");
    actionButton.type = "button";
    actionButton.textContent = fieldConfig.buttonLabel;
    actionButton.className = "tooltip-action-btn";

    tooltip.appendChild(label);
    tooltip.appendChild(personaSelect);
    tooltip.appendChild(actionButton);
  } else {
    // Simple button (email, phone)
    actionButton = document.createElement("button");
    actionButton.type = "button";
    actionButton.textContent = fieldConfig.buttonLabel;
    actionButton.className = "tooltip-action-btn";

    tooltip.appendChild(actionButton);

    if (fieldConfig.hintText) {
      hint = document.createElement("p");
      hint.textContent = fieldConfig.hintText;
      hint.className = "tooltip-hint";
      tooltip.appendChild(hint);
    }
  }

  container.appendChild(button);
  container.appendChild(tooltip);
  document.body.appendChild(container);

  const executedPrefillActions = new Set();
  const delay = (ms = 0) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  const normalizeFieldKey = (key = "") =>
    typeof key === "string" ? key.trim().toLowerCase().replace(/\s+/g, "") : "";

  // Allow per-route overrides so we can skip retries on static forms
  const fieldSearchAttempts =
    typeof fieldConfig.fieldSearchAttempts === "number"
      ? Math.max(1, fieldConfig.fieldSearchAttempts)
      : 5;
  const fieldSearchDelayMs =
    typeof fieldConfig.fieldSearchDelayMs === "number"
      ? Math.max(0, fieldConfig.fieldSearchDelayMs)
      : 100;

  const shouldTriggerPrefillAction = (action, normalizedKey) => {
    if (!Array.isArray(action?.fields) || !normalizedKey) {
      return false;
    }
    return action.fields.some(
      (fieldName) => normalizeFieldKey(fieldName) === normalizedKey
    );
  };

  const findPrefillActionTrigger = (action = {}) => {
    const selectors = [];
    if (typeof action.selector === "string") {
      selectors.push(action.selector);
    }
    if (Array.isArray(action.selectors)) {
      selectors.push(...action.selectors);
    }

    for (const selector of selectors) {
      if (!selector) {
        continue;
      }
      try {
        const element = document.querySelector(selector);
        if (element) {
          return element;
        }
      } catch (error) {
        console.warn(
          "[Widget] Prefill action selector failed",
          selector,
          error
        );
      }
    }

    if (action.textMatch) {
      const scope =
        typeof action.textScope === "string"
          ? document.querySelector(action.textScope)
          : document;
      if (!scope) {
        return null;
      }
      const candidates = scope.querySelectorAll(
        action.textSelector || "button, [role='button'], a"
      );
      const targetText = action.textMatch.toLowerCase();
      for (const candidate of candidates) {
        const text = candidate.textContent?.trim().toLowerCase();
        if (text && text.includes(targetText)) {
          return candidate;
        }
      }
    }

    return null;
  };

  const ensureFieldAccess = async (fieldKey) => {
    if (!Array.isArray(fieldConfig.prefillActions) || !fieldKey) {
      return;
    }
    const normalizedKey = normalizeFieldKey(fieldKey);
    for (let index = 0; index < fieldConfig.prefillActions.length; index++) {
      const action = fieldConfig.prefillActions[index];
      if (!shouldTriggerPrefillAction(action, normalizedKey)) {
        continue;
      }
      const actionId = action.id || `${routeId}-${index}`;
      if (executedPrefillActions.has(actionId)) {
        continue;
      }
      const trigger = findPrefillActionTrigger(action);
      if (!trigger) {
        console.warn(
          "[Widget] Prefill trigger not found for",
          action.fields?.join(", ") || fieldKey
        );
        continue;
      }

      try {
        const eventType = action.type || "click";
        if (eventType === "click" && typeof trigger.click === "function") {
          trigger.click();
        } else if (
          eventType === "focus" &&
          typeof trigger.focus === "function"
        ) {
          trigger.focus();
        } else {
          trigger.dispatchEvent(
            new Event(eventType, { bubbles: true, cancelable: true })
          );
        }
      } catch (error) {
        console.warn("[Widget] Prefill trigger failed", error);
      }

      executedPrefillActions.add(actionId);
      const waitMs =
        typeof action.waitForMs === "number"
          ? action.waitForMs
          : fieldConfig.prefillActionWaitMs ?? 200;
      if (waitMs > 0) {
        await delay(waitMs);
      }
    }
  };

  const findFieldWithRetry = async (fieldKey) => {
    if (!fieldKey) {
      return null;
    }
    for (let attempt = 0; attempt < fieldSearchAttempts; attempt++) {
      const target = locateFieldByKey(fieldKey);
      if (target) {
        return target;
      }
      if (attempt < fieldSearchAttempts - 1 && fieldSearchDelayMs > 0) {
        await delay(fieldSearchDelayMs);
      }
    }
    return null;
  };

  const BADGE_SIZE = 20;
  const RIGHT_OFFSET = 40;

  const reposition = () => {
    const rect = field.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0;

    if (!isVisible) {
      container.style.display = "none";
      return;
    }

    container.style.display = "flex";

    // Position INSIDE the input field, on the right side
    const top = window.scrollY + rect.top + (rect.height - BADGE_SIZE) / 2;
    const left = window.scrollX + rect.right - RIGHT_OFFSET - BADGE_SIZE;

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

  const badgeClickHandler = async (event) => {
    event.stopPropagation();
    const isOpen = container.getAttribute("data-open") === "true";

    if (!isOpen) {
      // Opening tooltip - populate dropdown with current region's personas
      if (fieldConfig.widgetType === "persona-select" && personaSelect) {
        const currentRegion = await storage.getSelectedRegion();
        const personas = await storage.getPersonasByRegion(currentRegion);
        const routePersonas = personas[fieldConfig.personaRoute] || [];

        // Clear and repopulate dropdown
        personaSelect.innerHTML = "";
        routePersonas.forEach((persona, index) => {
          const option = document.createElement("option");
          option.value = persona.id;
          option.textContent = persona.label;
          if (index === 0) option.selected = true;
          personaSelect.appendChild(option);
        });
      }

      container.setAttribute("data-open", "true");
      container.classList.add("visible");
    } else {
      container.setAttribute("data-open", "false");
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
      if (fieldConfig.widgetType === "email") {
        // Email generation - validate field exists and is editable first
        if (!field || !document.body.contains(field)) {
          if (hint) hint.textContent = "Email field no longer available.";
          return;
        }
        if (field.disabled || field.readOnly) {
          if (hint) hint.textContent = "Email field is not editable.";
          return;
        }

        let result;
        try {
          result = await storage.generateSignupEmail();
        } catch (error) {
          if (storage.isStorageUnavailableError?.(error)) {
            if (hint)
              hint.textContent =
                "Extension storage unavailable. Reload the extension.";
          } else {
            console.error("[Widget] Failed to generate email", error);
            if (hint) hint.textContent = "Failed to generate email.";
          }
          return;
        }
        const { email, error } = result || {};
        if (!email || error) {
          if (hint) {
            if (error === "COUNTER_INCREMENT_FAILED") {
              hint.textContent = "Failed to generate email. Please try again.";
            } else {
              hint.textContent = "Set prefix + ticket in popup first.";
            }
          }
          return;
        }
        applyValue(field, email);
        if (hint) hint.textContent = `Email prefilled: ${email}`;
        closeTooltip();
      } else if (fieldConfig.widgetType === "phone") {
        const { value: phone, source } = await resolvePhonePrefillValue({
          storage,
          fieldConfig,
          routeId,
          fallbackRegion: region,
        });
        if (!phone) {
          if (hint)
            hint.textContent = "Set phone number in popup or settings first.";
          return;
        }
        applyValue(field, phone);
        if (hint) {
          hint.textContent =
            source === "persona"
              ? "Regional phone number prefilled"
              : "Phone number prefilled";
        }
        closeTooltip();
      } else if (fieldConfig.widgetType === "persona-select") {
        // Persona-based fill - fetch current region dynamically
        const selectedPersonaId = personaSelect.value;
        const currentRegion = await storage.getSelectedRegion();
        const personas = await storage.getPersonasByRegion(currentRegion);
        const routePersonas = personas[fieldConfig.personaRoute] || [];
        const selectedPersona = routePersonas.find(
          (p) => p.id === selectedPersonaId
        );

        if (!selectedPersona) {
          console.error("[Widget] Persona not found:", selectedPersonaId);
          return;
        }

        // Check if this is a multi-field persona
        if (fieldConfig.multiField && selectedPersona.fields.length > 1) {
          // First, clear all fields defined in the route schema
          const routeSchema = routes.ROUTES?.find(
            (r) => r.id === fieldConfig.personaRoute
          );
          if (routeSchema?.fieldSchema) {
            for (const schemaField of routeSchema.fieldSchema) {
              const fieldKey = schemaField.name;
              const targetInput = (await findFieldWithRetry(fieldKey)) || null;
              if (targetInput) {
                applyValue(targetInput, "");
              }
            }
          }

          // Then fill the fields from the persona
          for (const personaField of selectedPersona.fields) {
            const fieldKey = personaField.target || personaField.name;
            if (!fieldKey || !personaField.value) {
              continue;
            }

            await ensureFieldAccess(fieldKey);
            const targetInput = (await findFieldWithRetry(fieldKey)) || null;

            if (targetInput) {
              applyValue(targetInput, personaField.value);
            } else {
              // console.warn(
              //   "[Widget] Unable to locate field for",
              //   fieldKey,
              //   "on route",
              //   fieldConfig.personaRoute
              // );
            }
          }
          closeTooltip();
        } else {
          // Single field (business info, address)
          // Always fill the field that triggered the widget
          const personaField = selectedPersona.fields[0];
          const fieldValue = personaField?.value;
          if (fieldValue) {
            applyValue(field, fieldValue);
            closeTooltip();
          }
        }
      }
    } catch (err) {
      if (storage.isStorageUnavailableError?.(err)) {
        if (hint)
          hint.textContent =
            "Extension storage unavailable. Reload the extension.";
        return;
      }
      console.error("[Widget] Fill action failed", err, err.stack);
      if (hint) hint.textContent = "Something went wrong. Try again.";
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

async function resolvePhonePrefillValue({
  storage,
  fieldConfig,
  routeId,
  fallbackRegion,
}) {
  let activeRegion = fallbackRegion;
  if (typeof storage.getSelectedRegion === "function") {
    try {
      activeRegion =
        (await storage.getSelectedRegion()) || fallbackRegion || null;
    } catch (error) {
      console.warn("[Widget] Failed to read selected region", error);
    }
  }

  const personaRouteId = fieldConfig.personaRoute || routeId || null;
  if (
    personaRouteId &&
    activeRegion &&
    typeof storage.getPersonasByRegion === "function"
  ) {
    try {
      const personas = await storage.getPersonasByRegion(activeRegion);
      const routePersonas = personas?.[personaRouteId] || [];
      for (const persona of routePersonas) {
        const phoneField = persona?.fields?.find(
          (field) => typeof field?.value === "string" && field.value.trim()
        );
        if (phoneField?.value) {
          return { value: phoneField.value.trim(), source: "persona" };
        }
      }
    } catch (error) {
      console.warn("[Widget] Failed to read regional phone personas", error);
    }
  }

  if (typeof storage.getPhoneNumber === "function") {
    try {
      const savedPhone = await storage.getPhoneNumber();
      if (savedPhone) {
        return { value: savedPhone, source: "storage" };
      }
    } catch (error) {
      console.warn("[Widget] Failed to read saved phone number", error);
    }
  }

  return { value: "", source: null };
}

/**
 * Initialize recording overlay message listeners
 */
function initRecordingOverlay(recordingOverlay) {
  console.log("[Content] Recording overlay initialized");

  // Check if recording is already in progress when page loads
  chrome.runtime
    .sendMessage({ type: "GET_RECORDER_STATE" })
    .then((state) => {
      console.log("[Content] Got recorder state:", state);
      if (state && state.isRecording) {
        console.log("[Content] Recording in progress, injecting overlay");
        recordingOverlay.injectOverlay(state.startTime, {
          isPaused: state.isPaused,
          pausedDuration: state.pausedDuration,
          pauseStartTime: state.pauseStartTime,
        });
      }
    })
    .catch((error) => {
      console.log("[Content] Failed to get recorder state:", error);
    });

  // Listen for recording state changes
  chrome.runtime.onMessage.addListener((message) => {
    console.log("[Content] Received message:", message.type);
    if (message.type === "RECORDING_STARTED" || message.type === "SHOW_RECORDING_OVERLAY") {
      console.log("[Content] RECORDING_STARTED/SHOW_RECORDING_OVERLAY received, injecting overlay");
      recordingOverlay.injectOverlay(message.startTime, {
        isPaused: message.isPaused,
        pausedDuration: message.pausedDuration,
        pauseStartTime: message.pauseStartTime,
      });
    } else if (message.type === "RECORDING_STOPPED") {
      console.log("[Content] RECORDING_STOPPED received, removing overlay");
      recordingOverlay.removeOverlay();
    } else if (message.type === "RECORDING_PAUSED") {
      recordingOverlay.setPausedState(message.pauseTime);
    } else if (message.type === "RECORDING_RESUMED") {
      recordingOverlay.setResumedState(message.resumeTime);
    }
  });
}
