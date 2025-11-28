export async function injectPersonaFields(tabId, fields = []) {
  if (!tabId || !fields.length) return;

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["testlib.dom.umd.js"],
  });

  await chrome.scripting.executeScript({
    target: { tabId },
    func: fillFields,
    args: [fields],
  });
}

function fillFields(fields) {
  const testingLibrary = window.TestingLibraryDom;
  if (!testingLibrary?.getByRole) {
    console.error("[Autofill] Testing Library DOM is unavailable.");
    return;
  }

  const { getByRole } = testingLibrary;

  fields.forEach((field) => {
    const label = field?.label || field?.name || "field";
    try {
      const element = locateFieldElement(field);
      if (!element) {
        // console.warn(`[Autofill] "${label}" field not found; skipping.`);
        return;
      }
      element.value = field?.value ?? "";

      ["input", "change"].forEach((type) => {
        const event = new Event(type, { bubbles: true });
        element.dispatchEvent(event);
      });

      console.log(`[Autofill] Filled "${label}" with "${field?.value ?? ""}"`);
    } catch (error) {
      console.error(`[Autofill] Failed to fill "${label}"`, error);
    }
  });
  function locateFieldElement(field) {
    if (!field) {
      return null;
    }

    const accessibleName =
      field.accessibleName || field.label || field.placeholder || field.name;

    const selectorMatch = trySelectorLookup(field);
    if (selectorMatch) {
      return selectorMatch;
    }

    const nameMatch = tryTargetLookup(field);
    if (nameMatch) {
      return nameMatch;
    }

    const labelMatch = tryLabelLookup(accessibleName);
    if (labelMatch) {
      return labelMatch;
    }

    const fallbackKey = field.target || field.name || accessibleName;
    if (fallbackKey) {
      return locateFieldByKey(fallbackKey);
    }

    const roleMatch = tryRoleLookup(field, accessibleName);
    if (roleMatch) {
      return roleMatch;
    }

    return null;
  }

  function escapeAttributeValue(value = "") {
    if (typeof window !== "undefined" && window.CSS?.escape) {
      return window.CSS.escape(value);
    }

    return value.replace(/(["\\])/g, "\\$1");
  }

  function locateFieldByKey(key = "") {
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
      const el = document.querySelector(selector);
      if (el) {
        return el;
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
      const el = document.querySelector(selector);
      if (el) {
        return el;
      }
    }

    const lowerKey = normalized.toLowerCase();
    const labelledField = Array.from(document.querySelectorAll("label")).find(
      (label) => label.textContent.trim().toLowerCase() === lowerKey
    );

    if (labelledField) {
      const forId = labelledField.getAttribute("for");
      if (forId) {
        const el = document.getElementById(forId);
        if (el) {
          return el;
        }
      } else {
        const el = labelledField.querySelector("input, select, textarea");
        if (el) {
          return el;
        }
      }
    }

    return null;
  }

  function trySelectorLookup(field) {
    if (field.selector) {
      const direct = document.querySelector(field.selector);
      if (direct) {
        return direct;
      }
    }
    return null;
  }

  function tryTargetLookup(field) {
    const targetKey = field.target || field.name;
    if (!targetKey) {
      return null;
    }

    const byId = document.getElementById(targetKey);
    if (byId) {
      return byId;
    }

    const escaped = escapeAttributeValue(targetKey);
    return (
      document.querySelector(`input[name="${escaped}"]`) ||
      document.querySelector(`select[name="${escaped}"]`) ||
      document.querySelector(`textarea[name="${escaped}"]`)
    );
  }

  function tryLabelLookup(accessibleName) {
    if (!accessibleName) {
      return null;
    }

    const matchingLabel = Array.from(document.querySelectorAll("label")).find(
      (label) => label.textContent.trim() === accessibleName
    );
    if (!matchingLabel) {
      return null;
    }

    const forId = matchingLabel.getAttribute("for");
    if (forId) {
      const labelledElement = document.getElementById(forId);
      if (labelledElement) {
        return labelledElement;
      }
    }

    return matchingLabel.querySelector("input, select, textarea") || null;
  }

  function tryRoleLookup(field, accessibleName) {
    if (!field.role || !accessibleName) {
      return null;
    }

    try {
      return getByRole(document.body, field.role, { name: accessibleName });
    } catch (error) {
      console.debug(
        `[Autofill] Testing Library lookup fallback for "${accessibleName}"`
      );
    }
    return null;
  }
}
