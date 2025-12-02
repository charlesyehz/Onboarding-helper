import {
  loadSettings,
  saveSettings,
  toggleInlineWidget,
  getPersonasByRegion,
  savePersonas,
  loadRecordingSettings,
  saveRecordingSettings,
} from "../shared/storage.js";
import { ROUTES } from "../config/routes.js";

const ROUTE_TAB_ORDER = [
  "register-phone",
  "business-info",
  "registered-office-address",
  "add-member",
  "kyc-confirm-details",
  "kyc-share-info",
  "kyc-passport",
];

// State
let currentRegion = "AU";
const ROUTE_OPTIONS = ROUTE_TAB_ORDER.reduce((list, routeId) => {
  const route = ROUTES.find((item) => item.id === routeId);
  if (route && Array.isArray(route.fieldSchema) && route.fieldSchema.length) {
    list.push(route);
  }
  return list;
}, []);
let currentRoute =
  ROUTE_OPTIONS[0]?.id || ROUTE_TAB_ORDER[0] || "business-info";
let editingPersona = null;

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  await initGeneral();
  initNavigation();
  initPersonas();
  initModals();
});

// ============================================================================
// General Tab
// ============================================================================

async function initGeneral() {
  const widgetToggle = document.getElementById("widget-toggle");
  const resetBtn = document.getElementById("reset-settings-btn");
  const settings = await loadSettings();

  widgetToggle.checked = settings.inlineWidgetEnabled;

  // Initialize recording settings
  await initRecordingSettings();

  widgetToggle.addEventListener("change", async (e) => {
    try {
      await toggleInlineWidget(e.target.checked);
      // Broadcast to content scripts
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs
            .sendMessage(tab.id, {
              type: "WIDGET_TOGGLED",
              payload: { enabled: e.target.checked },
            })
            .catch(() => {}); // Ignore errors for tabs where content script isn't loaded
        });
      });
    } catch (error) {
      console.error("[Settings] Failed to toggle widget", error);
    }
  });

  resetBtn.addEventListener("click", () => {
    openResetModal();
  });
}

// ============================================================================
// Recording Settings
// ============================================================================

async function initRecordingSettings() {
  const filenamePattern = document.getElementById("filename-pattern");
  const videoQuality = document.getElementById("video-quality");
  const autoStopMinutes = document.getElementById("auto-stop-minutes");

  // Load current settings
  const recordingSettings = await loadRecordingSettings();
  const hiddenDefaults = {
    screenshotFormat: "png",
    showCountdown: true,
    notifyOnComplete: true,
  };

  const needsHiddenDefaults =
    recordingSettings.screenshotFormat !== hiddenDefaults.screenshotFormat ||
    recordingSettings.showCountdown !== hiddenDefaults.showCountdown ||
    recordingSettings.notifyOnComplete !== hiddenDefaults.notifyOnComplete;

  if (needsHiddenDefaults) {
    await saveRecordingSettings(hiddenDefaults);
  }

  // Populate fields
  filenamePattern.value = recordingSettings.filenamePattern || "zeller-recording-{date}-{time}";
  videoQuality.value = recordingSettings.videoQuality || "medium";
  autoStopMinutes.value =
    typeof recordingSettings.autoStopMinutes === "number"
      ? recordingSettings.autoStopMinutes
      : 10;

  // Auto-save on change
  const saveRecordingSettingsDebounced = debounce(async () => {
    const parsedMinutes = parseInt(autoStopMinutes.value, 10);
    const sanitizedMinutes = Number.isFinite(parsedMinutes) ? parsedMinutes : 10;

    try {
      await saveRecordingSettings({
        filenamePattern: filenamePattern.value.trim() || "zeller-recording-{date}-{time}",
        videoQuality: videoQuality.value,
        autoStopMinutes: sanitizedMinutes,
        ...hiddenDefaults,
      });
      console.log("[Settings] Recording settings saved");
    } catch (error) {
      console.error("[Settings] Failed to save recording settings", error);
    }
  }, 500);

  filenamePattern.addEventListener("input", saveRecordingSettingsDebounced);
  videoQuality.addEventListener("change", saveRecordingSettingsDebounced);
  autoStopMinutes.addEventListener("input", saveRecordingSettingsDebounced);
}

// Debounce helper
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ============================================================================
// Navigation
// ============================================================================

function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".content-section");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const sectionId = item.dataset.section;

      // Update nav active state
      navItems.forEach((nav) => nav.classList.remove("active"));
      item.classList.add("active");

      // Update section visibility
      sections.forEach((section) => section.classList.remove("active"));
      document.getElementById(`${sectionId}-section`).classList.add("active");
    });
  });
}

// ============================================================================
// Personas Tab
// ============================================================================

function initPersonas() {
  initRegionTabs();
  initRouteTabs();
  initAddPersona();
  loadPersonas();
}

function initRegionTabs() {
  const regionTabs = document.querySelectorAll(".region-tab");

  regionTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const region = tab.dataset.region;
      currentRegion = region;

      // Update active state
      regionTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      // Reload personas for new region
      loadPersonas();
    });
  });
}

function initRouteTabs() {
  const container = document.getElementById("route-tabs");
  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!ROUTE_OPTIONS.length) {
    container.innerHTML =
      '<p class="empty-state">No persona routes are available.</p>';
    return;
  }

  if (!ROUTE_OPTIONS.some((route) => route.id === currentRoute)) {
    currentRoute = ROUTE_OPTIONS[0].id;
  }

  ROUTE_OPTIONS.forEach((route) => {
    const tab = document.createElement("button");
    tab.className = "route-tab";
    tab.dataset.route = route.id;
    tab.textContent = route.title || route.id;

    tab.addEventListener("click", () => {
      if (currentRoute === route.id) {
        return;
      }
      currentRoute = route.id;
      updateRouteTabState();
      loadPersonas();
    });

    container.appendChild(tab);
  });

  updateRouteTabState();
}

function updateRouteTabState() {
  const routeTabs = document.querySelectorAll(".route-tab");
  routeTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.route === currentRoute);
  });

  const route = ROUTE_OPTIONS.find((item) => item.id === currentRoute);
  const title = document.getElementById("personas-title");

  if (route && title) {
    title.textContent = `${route.title} Personas`;
  }
}

function initAddPersona() {
  const addBtn = document.getElementById("add-persona-btn");
  addBtn.addEventListener("click", () => {
    editingPersona = null;
    openPersonaModal();
  });
}

async function loadPersonas() {
  const list = document.getElementById("personas-list");
  list.innerHTML = '<p style="text-align: center; color: #999;">Loading...</p>';

  try {
    const personasByRoute = await getPersonasByRegion(currentRegion);
    const personas = personasByRoute[currentRoute] || [];

    if (personas.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <p>No personas configured for this route.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = "";
    personas.forEach((persona, index) => {
      const card = createPersonaCard(persona, index);
      list.appendChild(card);
    });
  } catch (error) {
    console.error("[Settings] Failed to load personas", error);
    list.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Failed to load personas. Please try again.</p>
      </div>
    `;
  }
}

function createPersonaCard(persona, index) {
  const card = document.createElement("div");
  card.className = "persona-card";

  const info = document.createElement("div");
  info.className = "persona-info";

  const name = document.createElement("h4");
  name.textContent = persona.label;

  const fields = document.createElement("p");
  const fieldValues = persona.fields
    .map((f) => `${f.name}: ${f.value}`)
    .join(" • ");
  fields.textContent = fieldValues;

  info.appendChild(name);
  info.appendChild(fields);

  const actions = document.createElement("div");
  actions.className = "persona-actions";

  const editBtn = document.createElement("button");
  editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
  editBtn.addEventListener("click", () => {
    editingPersona = { ...persona, index };
    openPersonaModal();
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete";
  deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
  deleteBtn.addEventListener("click", () => {
    openDeleteModal(persona, index);
  });

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  card.appendChild(info);
  card.appendChild(actions);

  return card;
}

// ============================================================================
// Persona Modal
// ============================================================================

function initModals() {
  const modal = document.getElementById("persona-modal");
  const closeBtn = document.getElementById("close-modal-btn");
  const cancelBtn = document.getElementById("cancel-modal-btn");
  const saveBtn = document.getElementById("save-persona-btn");

  closeBtn.addEventListener("click", closePersonaModal);
  cancelBtn.addEventListener("click", closePersonaModal);
  saveBtn.addEventListener("click", savePersona);

  // Close modal when clicking outside
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closePersonaModal();
    }
  });

  // Delete modal
  const deleteModal = document.getElementById("delete-modal");
  const closeDeleteBtn = document.getElementById("close-delete-modal-btn");
  const cancelDeleteBtn = document.getElementById("cancel-delete-btn");

  closeDeleteBtn.addEventListener("click", closeDeleteModal);
  cancelDeleteBtn.addEventListener("click", closeDeleteModal);

  deleteModal.addEventListener("click", (e) => {
    if (e.target === deleteModal) {
      closeDeleteModal();
    }
  });

  // Reset modal
  const resetModal = document.getElementById("reset-modal");
  const closeResetBtn = document.getElementById("close-reset-modal-btn");
  const cancelResetBtn = document.getElementById("cancel-reset-btn");
  const confirmResetBtn = document.getElementById("confirm-reset-btn");

  closeResetBtn.addEventListener("click", closeResetModal);
  cancelResetBtn.addEventListener("click", closeResetModal);
  confirmResetBtn.addEventListener("click", confirmResetSettings);

  resetModal.addEventListener("click", (e) => {
    if (e.target === resetModal) {
      closeResetModal();
    }
  });
}

function openPersonaModal() {
  const modal = document.getElementById("persona-modal");
  const modalTitle = document.getElementById("modal-title");
  const fieldsContainer = document.getElementById("persona-fields-container");
  const labelInput = document.getElementById("persona-label");

  // Set title
  modalTitle.textContent = editingPersona ? "Edit Item" : "Add Item";

  // Set label
  labelInput.value = editingPersona ? editingPersona.label : "";

  // Build fields based on route
  fieldsContainer.innerHTML = "";
  const fieldSchema = getFieldSchemaForRoute(currentRoute);

  fieldSchema.forEach((field, index) => {
    const formGroup = document.createElement("div");
    formGroup.className = "form-group";

    const label = document.createElement("label");
    label.htmlFor = `field-${index}`;
    label.textContent = field.name;

    const input = document.createElement("input");
    const isDateField = isDateSchemaField(field);
    input.type = "text";
    input.id = `field-${index}`;
    input.name = field.name;
    input.placeholder = field.placeholder || `Enter ${field.name}`;
    input.dataset.role = field.role;
    if (isDateField) {
      input.dataset.dateMask = "true";
      attachDateMask(input);
    }

    // Pre-fill if editing
    if (editingPersona) {
      const existingField = editingPersona.fields.find(
        (f) => f.name === field.name
      );
      if (existingField) {
        input.value = isDateField
          ? formatDateDisplay(existingField.value)
          : existingField.value;
      }
    }

    formGroup.appendChild(label);
    formGroup.appendChild(input);
    fieldsContainer.appendChild(formGroup);
  });

  modal.classList.add("show");
}

function closePersonaModal() {
  const modal = document.getElementById("persona-modal");
  modal.classList.remove("show");
  editingPersona = null;
}

async function savePersona() {
  const labelInput = document.getElementById("persona-label");
  const fieldsContainer = document.getElementById("persona-fields-container");

  const label = labelInput.value.trim();
  if (!label) {
    alert("Please enter a persona name");
    return;
  }

  // Collect field values
  const fieldInputs = fieldsContainer.querySelectorAll("input");
  const fields = [];

  fieldInputs.forEach((input) => {
    const value = input.value.trim();
    if (value) {
      fields.push({
        role: input.dataset.role,
        name: input.name,
        value: value,
      });
    }
  });

  if (fields.length === 0) {
    alert("Please fill in at least one field");
    return;
  }

  try {
    const personasByRoute = await getPersonasByRegion(currentRegion);
    const personas = personasByRoute[currentRoute] || [];

    const newPersona = {
      id: editingPersona ? editingPersona.id : generatePersonaId(label),
      label,
      fields,
    };

    if (editingPersona) {
      // Update existing
      personas[editingPersona.index] = newPersona;
    } else {
      // Add new
      personas.push(newPersona);
    }

    // Save back to storage
    personasByRoute[currentRoute] = personas;
    await savePersonas(currentRegion, personasByRoute);

    closePersonaModal();
    loadPersonas();
  } catch (error) {
    console.error("[Settings] Failed to save persona", error);
    alert("Failed to save persona. Please try again.");
  }
}

// ============================================================================
// Delete Modal
// ============================================================================

let deleteTarget = null;

function openDeleteModal(persona, index) {
  deleteTarget = { persona, index };
  const modal = document.getElementById("delete-modal");
  const nameEl = document.getElementById("delete-persona-name");

  nameEl.textContent = persona.label;
  modal.classList.add("show");

  // Wire up confirm button
  const confirmBtn = document.getElementById("confirm-delete-btn");
  confirmBtn.onclick = deletePersona;
}

function closeDeleteModal() {
  const modal = document.getElementById("delete-modal");
  modal.classList.remove("show");
  deleteTarget = null;
}

async function deletePersona() {
  if (!deleteTarget) return;

  try {
    const personasByRoute = await getPersonasByRegion(currentRegion);
    const personas = personasByRoute[currentRoute] || [];

    // Remove persona
    personas.splice(deleteTarget.index, 1);

    // Save back to storage
    personasByRoute[currentRoute] = personas;
    await savePersonas(currentRegion, personasByRoute);

    closeDeleteModal();
    loadPersonas();
  } catch (error) {
    console.error("[Settings] Failed to delete persona", error);
    alert("Failed to delete persona. Please try again.");
  }
}

// ============================================================================
// Helpers
// ============================================================================

function getFieldSchemaForRoute(routeId) {
  const route = ROUTES.find((item) => item.id === routeId);
  if (!route || !Array.isArray(route.fieldSchema)) {
    return [];
  }
  return route.fieldSchema.map((field) => ({ ...field }));
}

function generatePersonaId(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isDateSchemaField(field = {}) {
  const placeholder = field.placeholder?.toLowerCase?.() || "";
  const name = field.name?.toLowerCase?.() || "";
  return (
    placeholder.includes("dd/mm") ||
    name.includes("dob") ||
    name.includes("date of birth")
  );
}

function formatDateDisplay(value = "") {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  if (!day) {
    return "";
  }
  if (!month) {
    return day;
  }
  if (!year) {
    return `${day}/${month}`;
  }
  return `${day}/${month}/${year}`;
}

function caretIndexForDigitCount(formatted, digitCount) {
  if (digitCount <= 0) {
    return 0;
  }
  let digitsSeen = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    if (/\d/.test(formatted[index])) {
      digitsSeen += 1;
      if (digitsSeen === digitCount) {
        return index + 1;
      }
    }
  }
  return formatted.length;
}

function attachDateMask(input) {
  const handleInput = () => {
    const raw = input.value || "";
    const selection = input.selectionStart ?? raw.length;
    const digitsBeforeCaret = raw
      .slice(0, selection)
      .replace(/\D/g, "").length;
    const formatted = formatDateDisplay(raw);
    if (formatted === raw) {
      return;
    }
    input.value = formatted;
    const nextCaret = caretIndexForDigitCount(formatted, digitsBeforeCaret);
    requestAnimationFrame(() => {
      input.setSelectionRange(nextCaret, nextCaret);
    });
  };

  input.addEventListener("input", handleInput);
}

// ============================================================================
// Reset Settings
// ============================================================================

function openResetModal() {
  const modal = document.getElementById("reset-modal");
  modal.classList.add("show");
}

function closeResetModal() {
  const modal = document.getElementById("reset-modal");
  modal.classList.remove("show");
}

async function confirmResetSettings() {
  try {
    // Clear all storage
    await chrome.storage.local.clear();

    // Reload the page to re-initialize with defaults
    window.location.reload();
  } catch (error) {
    console.error("[Settings] Failed to reset settings", error);
    alert("Failed to reset settings. Please try again.");
  }
}
