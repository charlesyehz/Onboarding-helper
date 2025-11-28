import {
  loadSettings,
  saveSettings,
  toggleInlineWidget,
  getPersonasByRegion,
  savePersonas,
} from "../shared/storage.js";

// State
let currentRegion = "AU";
let currentRoute = "business-info";
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
  const routeTabs = document.querySelectorAll(".route-tab");

  routeTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const route = tab.dataset.route;
      currentRoute = route;

      // Update active state
      routeTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      // Update title
      const title = document.getElementById("personas-title");
      title.textContent = `${tab.textContent.trim()} Personas`;

      // Reload personas for new route
      loadPersonas();
    });
  });
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
    input.type = "text";
    input.id = `field-${index}`;
    input.name = field.name;
    input.placeholder = field.placeholder || `Enter ${field.name}`;
    input.dataset.role = field.role;

    // Pre-fill if editing
    if (editingPersona) {
      const existingField = editingPersona.fields.find(
        (f) => f.name === field.name
      );
      if (existingField) {
        input.value = existingField.value;
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
  const schemas = {
    "business-info": [
      {
        role: "textbox",
        name: "ABN or ACN",
        placeholder: "e.g., 26 004 139 397",
      },
    ],
    "kyc-share-info": [
      { role: "textbox", name: "First Name", placeholder: "e.g., John" },
      { role: "textbox", name: "Last Name", placeholder: "e.g., Doe" },
      {
        role: "textbox",
        name: "Date of birth",
        placeholder: "e.g., 01/01/1990",
      },
      {
        role: "textbox",
        name: "Address",
        placeholder: "e.g., 123 Main St SYDNEY NSW 2000",
      },
    ],
    "kyc-passport": [
      {
        role: "textbox",
        name: "Document number",
        placeholder: "e.g., N1000091",
      },
    ],
  };

  return schemas[routeId] || [];
}

function generatePersonaId(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
