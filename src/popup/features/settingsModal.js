import {
  getPersonasByRegion,
  loadSettings,
  savePersonas,
  toggleInlineWidget,
} from "../../shared/storage.js";
import { ROUTES } from "../../config/routes.js";

const TAB_GENERAL = "general";
const ROUTE_MAP = new Map(ROUTES.map((route) => [route.id, route]));

export function initSettingsModal(options = {}) {
  const modal = document.getElementById("settings-modal");

  if (!modal) {
    return;
  }

  const trigger =
    options.triggerElement || document.getElementById("settings-btn");
  const standalone =
    typeof options.standalone === "boolean" ? options.standalone : !trigger;
  const onRequestClose =
    typeof options.onRequestClose === "function"
      ? options.onRequestClose
      : null;

  const state = {
    modal,
    trigger,
    activeTab: TAB_GENERAL,
    isOpen: false,
    inlineWidgetToggle: modal.querySelector("#inline-widget-toggle"),
    loadingSettings: null,
    standalone,
    onRequestClose,
  };

  bindOpenCloseHandlers(state);
  bindTabHandlers(state);
  bindInlineWidgetToggle(state);
  initPersonaEditor(state);
  hydrateSettings(state);
}

function bindOpenCloseHandlers(state) {
  const { modal, trigger, standalone } = state;

  if (trigger) {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openModal(state);
      hydrateSettings(state);
    });
  } else if (standalone) {
    openModal(state);
  }

  modal.querySelectorAll("[data-close-modal='true']").forEach((element) => {
    element.addEventListener("click", () => requestClose(state));
  });

  const cancelBtn = modal.querySelector("#settings-cancel-btn");
  cancelBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    requestClose(state);
  });

  const saveBtn = modal.querySelector("#settings-save-btn");
  saveBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    modal.dispatchEvent(new CustomEvent("settings:save"));
    requestClose(state);
  });

  if (!standalone) {
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.isOpen) {
        event.preventDefault();
        closeModal(state);
      }
    });
  }
}

function bindTabHandlers(state) {
  const tabs = state.modal.querySelectorAll(".settings-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      if (target) {
        setActiveTab(state, target);
      }
    });

    if (tab.dataset.tab === TAB_GENERAL) {
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
    }
  });
}

function openModal(state) {
  if (state.isOpen) {
    return;
  }
  state.isOpen = true;
  state.modal.setAttribute("aria-hidden", "false");
  if (!state.standalone) {
    document.body.classList.add("modal-open");
  }
  const dialog = state.modal.querySelector(".settings-modal__dialog");
  setTimeout(() => dialog?.focus(), 0);
}

function closeModal(state) {
  if (!state.isOpen) {
    return;
  }
  state.isOpen = false;
  state.modal.setAttribute("aria-hidden", "true");
  if (!state.standalone) {
    document.body.classList.remove("modal-open");
  }
  if (state.activeTab !== TAB_GENERAL) {
    setActiveTab(state, TAB_GENERAL);
  }
  state.trigger?.focus();
}

function requestClose(state) {
  if (state.standalone) {
    if (state.onRequestClose) {
      state.onRequestClose();
      return;
    }
    if (window.close) {
      window.close();
      return;
    }
    if (chrome?.tabs?.getCurrent) {
      chrome.tabs.getCurrent((currentTab) => {
        if (currentTab?.id) {
          chrome.tabs.remove(currentTab.id);
        }
      });
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
  }
  closeModal(state);
}

function setActiveTab(state, tabName) {
  if (state.activeTab === tabName) {
    return;
  }
  state.activeTab = tabName;
  const tabs = state.modal.querySelectorAll(".settings-tab");
  const panels = state.modal.querySelectorAll(".settings-panel");

  tabs.forEach((tab) => {
    const isActive = tab.dataset.tab === tabName;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  panels.forEach((panel) => {
    const isActive = panel.dataset.panel === tabName;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });
}

function bindInlineWidgetToggle(state) {
  const toggle = state.inlineWidgetToggle;
  if (!toggle) {
    return;
  }
  toggle.addEventListener("change", async () => {
    const desiredState = toggle.checked;
    toggle.disabled = true;
    try {
      await toggleInlineWidget(desiredState);
      notifySettingsUpdate({ inlineWidgetEnabled: desiredState });
    } catch (error) {
      console.error("[Settings] Failed to update inline widget toggle", error);
      toggle.checked = !desiredState;
    } finally {
      toggle.disabled = false;
    }
  });
}

function hydrateSettings(state) {
  const toggle = state.inlineWidgetToggle;
  if (!toggle || state.loadingSettings) {
    return state.loadingSettings;
  }

  toggle.disabled = true;
  const loadPromise = loadSettings()
    .then((settings) => {
      toggle.checked = Boolean(settings.inlineWidgetEnabled);
    })
    .catch((error) => {
      console.error("[Settings] Failed to load settings", error);
    })
    .finally(() => {
      toggle.disabled = false;
      state.loadingSettings = null;
    });

  state.loadingSettings = loadPromise;
  return loadPromise;
}

function notifySettingsUpdate(payload) {
  try {
    chrome.runtime.sendMessage(
      { type: "SETTINGS_UPDATED", payload },
      () => chrome.runtime.lastError
    );
  } catch (error) {
    console.warn("[Settings] Failed to broadcast settings change", error);
  }
}

function initPersonaEditor(state) {
  const editor = {
    list: state.modal.querySelector("#persona-list"),
    form: state.modal.querySelector("#persona-form"),
    formTitle: state.modal.querySelector("#persona-form-title"),
    addButton: state.modal.querySelector("#add-persona-btn"),
    cancelButton: state.modal.querySelector("#persona-cancel-btn"),
    labelInput: state.modal.querySelector("#persona-label"),
    idInput: state.modal.querySelector("#persona-identifier"),
    fieldsInput: state.modal.querySelector("#persona-fields"),
    regionSelect: state.modal.querySelector("#persona-region-select"),
    routeSelect: state.modal.querySelector("#persona-route-select"),
    errorMessage: state.modal.querySelector("#persona-form-error"),
    mode: "create",
    editingId: null,
  };

  if (
    !editor.list ||
    !editor.form ||
    !editor.regionSelect ||
    !editor.routeSelect
  ) {
    return;
  }

  populateRouteOptions(editor.routeSelect);

  state.personaEditor = editor;
  state.personas = {};
  state.personaLoadToken = 0;
  state.currentRegion = editor.regionSelect.value || "AU";
  state.currentRoute =
    editor.routeSelect.value || ROUTES[0]?.id || "business-info";

  attachPersonaEditorEvents(state);
  resetPersonaForm(state);
  hidePersonaForm(state);
  loadRegionPersonas(state, state.currentRegion);
}

function populateRouteOptions(select) {
  if (!select) return;
  select.innerHTML = "";
  ROUTES.forEach((route) => {
    const option = document.createElement("option");
    option.value = route.id;
    option.textContent = route.title || route.path || route.id;
    select.appendChild(option);
  });
  if (!select.value && ROUTES[0]) {
    select.value = ROUTES[0].id;
  }
}

function attachPersonaEditorEvents(state) {
  const editor = state.personaEditor;
  if (!editor) return;

  editor.addButton?.addEventListener("click", (event) => {
    event.preventDefault();
    startPersonaCreation(state);
  });

  editor.cancelButton?.addEventListener("click", (event) => {
    event.preventDefault();
    resetPersonaForm(state);
    hidePersonaForm(state);
  });

  editor.form.addEventListener("submit", (event) => {
    event.preventDefault();
    handlePersonaFormSubmit(state);
  });

  editor.regionSelect.addEventListener("change", (event) => {
    state.currentRegion = event.target.value;
    hidePersonaForm(state);
    resetPersonaForm(state);
    loadRegionPersonas(state, state.currentRegion);
  });

  editor.routeSelect.addEventListener("change", (event) => {
    state.currentRoute = event.target.value;
    hidePersonaForm(state);
    resetPersonaForm(state);
    renderPersonaList(state);
  });

  editor.list.addEventListener("click", (event) =>
    handlePersonaListClick(state, event)
  );
}

async function loadRegionPersonas(state, region) {
  const editor = state.personaEditor;
  if (!editor || !region) return;
  const requestId = (state.personaLoadToken || 0) + 1;
  state.personaLoadToken = requestId;
  showPersonaListMessage(editor.list, "Loading personas...");
  try {
    const personas = await getPersonasByRegion(region);
    if (requestId !== state.personaLoadToken) {
      return;
    }
    state.personas[region] = sanitizePersonaStore(personas);
  } catch (error) {
    console.error("[Settings] Failed to load personas", error);
    if (requestId !== state.personaLoadToken) {
      return;
    }
    showPersonaListMessage(editor.list, "Failed to load personas");
    return;
  }

  ensureRegionScaffold(state, region);
  renderPersonaList(state);
}

function sanitizePersonaStore(store) {
  if (!store || typeof store !== "object") {
    return {};
  }
  return Object.entries(store).reduce((acc, [routeId, personas]) => {
    if (Array.isArray(personas)) {
      acc[routeId] = personas.map((persona) => ({
        id: persona.id,
        label: persona.label,
        fields: Array.isArray(persona.fields) ? persona.fields : [],
      }));
    }
    return acc;
  }, {});
}

function ensureRegionScaffold(state, region) {
  const regionStore = state.personas[region] || {};
  ROUTES.forEach((route) => {
    if (!Array.isArray(regionStore[route.id])) {
      regionStore[route.id] = [];
    }
  });
  state.personas[region] = regionStore;
}

function renderPersonaList(state) {
  const editor = state.personaEditor;
  if (!editor) return;
  const regionStore = state.personas[state.currentRegion] || {};
  const personas = regionStore[state.currentRoute] || [];

  if (!personas.length) {
    showPersonaListMessage(
      editor.list,
      "No personas configured for this route yet."
    );
    return;
  }

  editor.list.innerHTML = "";
  personas.forEach((persona) => {
    const item = buildPersonaListItem(persona, {
      region: state.currentRegion,
      routeId: state.currentRoute,
    });
    editor.list.appendChild(item);
  });
}

function showPersonaListMessage(list, message) {
  if (!list) return;
  list.innerHTML = "";
  const messageEl = document.createElement("p");
  messageEl.className = "persona-editor__empty";
  messageEl.textContent = message;
  list.appendChild(messageEl);
}

function startPersonaCreation(state) {
  resetPersonaForm(state);
  const editor = state.personaEditor;
  if (!editor) {
    return;
  }
  editor.form.classList.remove("is-hidden");
  editor.labelInput?.focus();
}

function beginPersonaEdit(state, personaId) {
  const persona = findPersonaRecord(state, personaId);
  const editor = state.personaEditor;
  if (!persona || !editor) {
    return;
  }
  editor.mode = "edit";
  editor.editingId = personaId;
  editor.formTitle.textContent = "Edit Item";
  editor.labelInput.value = persona.label || "";
  editor.idInput.value = persona.id || "";
  editor.fieldsInput.value = formatFieldsForInput(persona.fields || []);
  clearPersonaFormError(editor);
  editor.form.classList.remove("is-hidden");
  editor.labelInput?.focus();
}

function hidePersonaForm(state) {
  state.personaEditor?.form.classList.add("is-hidden");
}

function resetPersonaForm(state) {
  const editor = state.personaEditor;
  if (!editor) return;
  editor.mode = "create";
  editor.editingId = null;
  editor.form.reset();
  editor.idInput.value = "";
  editor.fieldsInput.value = formatFieldsForInput(
    createSchemaTemplate(state.currentRoute)
  );
  editor.formTitle.textContent = "New Persona";
  clearPersonaFormError(editor);
}

function handlePersonaFormSubmit(state) {
  const persona = collectPersonaFormData(state);
  if (!persona) {
    return;
  }

  savePersonaRecord(state, persona).then((saved) => {
    if (saved) {
      renderPersonaList(state);
      resetPersonaForm(state);
      hidePersonaForm(state);
    }
  });
}

function collectPersonaFormData(state) {
  const editor = state.personaEditor;
  if (!editor) return null;

  const label = editor.labelInput?.value?.trim() || "";
  const identifier = editor.idInput?.value?.trim();
  const fieldsRaw = editor.fieldsInput?.value?.trim();

  clearPersonaFormError(editor);

  if (!label) {
    editor.labelInput?.focus();
    showPersonaFormError(editor, "Display label is required.");
    return null;
  }

  let fields = [];
  if (fieldsRaw) {
    try {
      const parsed = JSON.parse(fieldsRaw);
      fields = normalizePersonaFields(parsed);
    } catch (error) {
      showPersonaFormError(editor, "Fields must be valid JSON.");
      return null;
    }
  } else {
    fields = createSchemaTemplate(state.currentRoute);
  }

  const previousId =
    editor.mode === "edit" && editor.editingId ? editor.editingId : null;
  const personaId = identifier || previousId || generatePersonaId(label);

  return {
    id: personaId,
    previousId,
    label,
    fields,
    region: state.currentRegion,
    routeId: state.currentRoute,
  };
}

function showPersonaFormError(editor, message) {
  if (!editor?.errorMessage) return;
  editor.errorMessage.textContent = message || "";
  editor.errorMessage.hidden = !message;
}

function clearPersonaFormError(editor) {
  if (!editor?.errorMessage) return;
  editor.errorMessage.textContent = "";
  editor.errorMessage.hidden = true;
}

function normalizePersonaFields(fields) {
  if (!Array.isArray(fields)) {
    return [];
  }
  return fields.map((field) => ({
    role: field.role || "textbox",
    name: field.name || "",
    value:
      typeof field.value === "number" || typeof field.value === "string"
        ? field.value
        : "",
  }));
}

async function savePersonaRecord(state, personaData) {
  const regionStore = {
    ...(state.personas[personaData.region] || {}),
  };
  const existing = [...(regionStore[personaData.routeId] || [])];
  let insertIndex = existing.length;

  if (personaData.previousId) {
    const previousIndex = existing.findIndex(
      (persona) => persona.id === personaData.previousId
    );
    if (previousIndex >= 0) {
      existing.splice(previousIndex, 1);
      insertIndex = previousIndex;
    }
  }

  const duplicate = existing.some((persona) => persona.id === personaData.id);
  if (duplicate) {
    showPersonaFormError(
      state.personaEditor,
      "Persona ID already exists for this route."
    );
    return false;
  }

  existing.splice(insertIndex, 0, {
    id: personaData.id,
    label: personaData.label,
    fields: personaData.fields,
  });

  regionStore[personaData.routeId] = existing;
  state.personas[personaData.region] = regionStore;

  try {
    await savePersonas(personaData.region, regionStore);
    clearPersonaFormError(state.personaEditor);
    return true;
  } catch (error) {
    console.error("[Settings] Failed to save persona", error);
    showPersonaFormError(
      state.personaEditor,
      "Failed to save persona. Please try again."
    );
    return false;
  }
}

function handlePersonaListClick(state, event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const actionButton = target.closest("button[data-action]");
  if (!actionButton) {
    return;
  }

  const personaItem = actionButton.closest(".persona-item");
  if (!personaItem) {
    return;
  }

  const personaId = personaItem.dataset.personaId;
  if (!personaId) {
    return;
  }

  const action = actionButton.dataset.action;
  if (action === "edit") {
    beginPersonaEdit(state, personaId);
  } else if (action === "delete") {
    deletePersona(state, personaId);
  }
}

async function deletePersona(state, personaId) {
  const editor = state.personaEditor;
  if (!editor) return;
  const confirmed = window.confirm("Delete this persona?");
  if (!confirmed) {
    return;
  }

  const regionStore = state.personas[state.currentRegion] || {};
  const personas = [...(regionStore[state.currentRoute] || [])];
  const index = personas.findIndex((persona) => persona.id === personaId);
  if (index === -1) {
    return;
  }

  personas.splice(index, 1);
  regionStore[state.currentRoute] = personas;
  state.personas[state.currentRegion] = regionStore;

  try {
    await savePersonas(state.currentRegion, regionStore);
    renderPersonaList(state);
  } catch (error) {
    console.error("[Settings] Failed to delete persona", error);
  }
}

function findPersonaRecord(state, personaId) {
  const regionStore = state.personas[state.currentRegion] || {};
  const personas = regionStore[state.currentRoute] || [];
  return personas.find((persona) => persona.id === personaId) || null;
}

function buildPersonaListItem(persona, context) {
  const item = document.createElement("div");
  item.className = "persona-item";
  item.dataset.personaId = persona.id;

  const details = document.createElement("div");
  details.className = "persona-item__details";

  const title = document.createElement("h4");
  title.textContent = persona.label;
  details.appendChild(title);

  const meta = document.createElement("p");
  meta.textContent = formatPersonaMeta(persona, context);
  details.appendChild(meta);

  const actions = document.createElement("div");
  actions.className = "persona-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "icon-button persona-edit-btn";
  editButton.dataset.action = "edit";
  editButton.title = "Edit item";
  editButton.innerHTML = '<i class="fas fa-pen"></i>';

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "icon-button persona-delete-btn";
  deleteButton.dataset.action = "delete";
  deleteButton.title = "Delete item";
  deleteButton.innerHTML = '<i class="fas fa-trash"></i>';

  actions.append(editButton, deleteButton);
  item.append(details, actions);
  return item;
}

function formatPersonaMeta(persona, context) {
  const primaryField = getPrimaryPersonaField(persona);
  if (!primaryField) {
    return `${context.region} · No values`;
  }
  const label = formatFieldLabel(primaryField.name);
  const value = String(primaryField.value ?? "").trim();
  return `${context.region} · ${label}: ${value}`;
}

function getPrimaryPersonaField(persona) {
  if (!persona || !Array.isArray(persona.fields)) {
    return null;
  }
  return (
    persona.fields.find((field) => {
      const value = field?.value;
      return typeof value === "string"
        ? value.trim().length > 0
        : typeof value === "number";
    }) || null
  );
}

function formatFieldLabel(name = "") {
  if (!name) {
    return "Value";
  }
  if (/company number/i.test(name)) {
    return "CRN";
  }
  if (/abn/i.test(name)) {
    return "ABN";
  }
  if (/acn/i.test(name)) {
    return "ACN";
  }
  if (/passport/i.test(name)) {
    return "Passport";
  }
  return name;
}

function formatFieldsForInput(fields) {
  return JSON.stringify(fields || [], null, 2);
}

function createSchemaTemplate(routeId) {
  const route = ROUTE_MAP.get(routeId);
  if (!route?.fieldSchema) {
    return [];
  }
  return route.fieldSchema.map((field) => ({
    role: field.role || "textbox",
    name: field.name || "",
    value: field.value ?? "",
  }));
}

function generatePersonaId(label) {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `persona-${Date.now()}`
  );
}
