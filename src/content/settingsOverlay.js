import { initSettingsModal } from "../popup/features/settingsModal.js";

let overlayRoot = null;

export function openSettingsOverlay() {
  if (overlayRoot) {
    return;
  }

  overlayRoot = document.createElement("div");
  overlayRoot.id = "onb-settings-overlay";
  overlayRoot.innerHTML = `${buildStyles()}${buildMarkup()}`;
  document.documentElement.appendChild(overlayRoot);

  initSettingsModal({ standalone: true, onRequestClose: closeOverlay });
}

function closeOverlay() {
  if (!overlayRoot) {
    return;
  }
  overlayRoot.remove();
  overlayRoot = null;
}

function buildStyles() {
  return `<style>
    #onb-settings-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      background: rgba(15, 23, 42, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: "Inter Zeller", Arial, sans-serif;
    }
    #onb-settings-overlay * {
      box-sizing: border-box;
      font-family: inherit;
    }
    #onb-settings-overlay .settings-modal {
      width: min(600px, calc(100vw - 2rem));
      max-height: calc(100vh - 2rem);
      background: #ffffff;
      color: #1f2933;
      border-radius: 12px;
      box-shadow: 0 30px 80px rgba(15, 23, 42, 0.4);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: onb-fade-in 0.2s ease;
    }
    #onb-settings-overlay .settings-modal__header,
    #onb-settings-overlay .settings-modal__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
    }
    #onb-settings-overlay .settings-modal__footer {
      border-top: 1px solid rgba(15, 23, 42, 0.08);
      border-bottom: none;
      gap: 0.5rem;
    }
    #onb-settings-overlay .settings-modal__footer button {
      flex: 1 1 0;
      margin: 0;
      justify-content: center;
      min-width: 0;
    }
    #onb-settings-overlay .settings-modal__body {
      padding: 0 1rem 1rem;
      overflow-y: auto;
      flex: 1 1 auto;
    }
    #onb-settings-overlay .settings-modal__tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    #onb-settings-overlay .settings-tab {
      flex: 1;
      padding: 0.5rem;
      border-radius: 6px;
      border: 1px solid transparent;
      background: transparent;
      cursor: pointer;
      font-weight: 600;
    }
    #onb-settings-overlay .settings-tab.active {
      border-color: #0071ce;
      color: #0071ce;
    }
    #onb-settings-overlay .settings-panel {
      display: none;
    }
    #onb-settings-overlay .settings-panel.active {
      display: block;
    }
    #onb-settings-overlay .settings-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.75rem 0;
    }
    #onb-settings-overlay .settings-row__text h3 {
      margin: 0 0 0.25rem;
      font-size: 0.95rem;
    }
    #onb-settings-overlay .settings-row__text p {
      margin: 0;
      font-size: 0.8rem;
      color: #5f6c79;
    }
    #onb-settings-overlay .toggle-switch {
      width: 44px;
      height: 24px;
      position: relative;
    }
    #onb-settings-overlay .toggle-switch input {
      display: none;
    }
    #onb-settings-overlay .toggle-slider {
      position: absolute;
      inset: 0;
      background: #cfd8e3;
      border-radius: 999px;
      transition: background 0.2s ease;
    }
    #onb-settings-overlay .toggle-slider::after {
      content: "";
      position: absolute;
      width: 18px;
      height: 18px;
      top: 3px;
      left: 3px;
      border-radius: 50%;
      background: #ffffff;
      transition: transform 0.2s ease;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25);
    }
    #onb-settings-overlay .toggle-switch input:checked + .toggle-slider {
      background: #0071ce;
    }
    #onb-settings-overlay .toggle-switch input:checked + .toggle-slider::after {
      transform: translateX(20px);
    }
    #onb-settings-overlay .persona-editor {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    #onb-settings-overlay .persona-editor__controls {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.65rem;
      align-items: end;
    }
    #onb-settings-overlay .persona-editor__controls .btn-primary {
      grid-column: span 2;
      margin: 0;
      justify-content: center;
    }
    #onb-settings-overlay .persona-editor__label {
      font-size: 0.75rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    #onb-settings-overlay .persona-editor__select,
    #onb-settings-overlay .form-group input,
    #onb-settings-overlay .form-group textarea {
      width: 100%;
      padding: 0.45rem;
      border-radius: 6px;
      border: 1px solid #ccd5df;
    }
    #onb-settings-overlay .persona-editor__list {
      border: 1px dashed rgba(15, 23, 42, 0.25);
      border-radius: 8px;
      padding: 0.75rem;
      max-height: 220px;
      overflow-y: auto;
      background: #f8fafc;
    }
    #onb-settings-overlay .persona-editor__empty {
      margin: 0;
      text-align: center;
      color: #5f6c79;
      font-size: 0.85rem;
    }
    #onb-settings-overlay .persona-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid rgba(15, 23, 42, 0.1);
    }
    #onb-settings-overlay .persona-item:last-child {
      border-bottom: none;
    }
    #onb-settings-overlay .persona-item__details h4 {
      margin: 0;
      font-size: 0.9rem;
    }
    #onb-settings-overlay .persona-item__details p {
      margin: 0.1rem 0 0;
      font-size: 0.78rem;
      color: #5f6c79;
    }
    #onb-settings-overlay .persona-actions {
      display: flex;
      gap: 0.25rem;
    }
    #onb-settings-overlay .icon-button {
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 0.25rem;
      color: inherit;
    }
    #onb-settings-overlay .btn-primary,
    #onb-settings-overlay .btn-outline {
      border: 1px solid transparent;
      border-radius: 6px;
      padding: 0.55rem 0.85rem;
      cursor: pointer;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.3rem;
    }
    #onb-settings-overlay .btn-small {
      font-size: 0.78rem;
      padding: 0.45rem 0.75rem;
    }
    #onb-settings-overlay .btn-primary {
      background: #0071ce;
      color: #ffffff;
      border-color: #0071ce;
    }
    #onb-settings-overlay .btn-outline {
      background: transparent;
      color: #0071ce;
      border-color: #0071ce;
    }
    #onb-settings-overlay .persona-form {
      border: 1px solid rgba(15, 23, 42, 0.15);
      border-radius: 8px;
      padding: 0.75rem;
      background: rgba(0, 113, 206, 0.03);
    }
    #onb-settings-overlay .persona-form__actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    #onb-settings-overlay .persona-form__actions .btn-primary,
    #onb-settings-overlay .persona-form__actions .btn-outline {
      flex: 1 1 0;
      min-width: 0;
    }
    #onb-settings-overlay .persona-form__error {
      color: #c62828;
      font-size: 0.78rem;
      min-height: 1em;
      margin: 0.4rem 0;
    }
    #onb-settings-overlay .form-group {
      margin-bottom: 0.5rem;
    }
    #onb-settings-overlay .form-group label {
      display: block;
      font-weight: 600;
      margin-bottom: 0.2rem;
      font-size: 0.8rem;
    }
    #onb-settings-overlay .settings-modal__overlay {
      display: none;
    }
    @keyframes onb-fade-in {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  </style>`;
}

function buildMarkup() {
  return `
    <div id="settings-modal" class="settings-modal" aria-hidden="false">
      <div class="settings-modal__dialog" role="document">
        <header class="settings-modal__header">
          <h2 id="settings-modal-title">Settings</h2>
          <button
            id="settings-modal-close"
            class="icon-button"
            aria-label="Close settings"
            data-close-modal="true"
            type="button"
          >
            ×
          </button>
        </header>
        <div class="settings-modal__body">
          <div class="settings-modal__tabs" role="tablist">
            <button
              class="settings-tab active"
              data-tab="general"
              role="tab"
              aria-selected="true"
              type="button"
            >
              General
            </button>
            <button
              class="settings-tab"
              data-tab="personas"
              role="tab"
              aria-selected="false"
              type="button"
            >
              Personas
            </button>
          </div>
          <div class="settings-modal__content">
            <section class="settings-panel active" data-panel="general" role="tabpanel">
              <div class="settings-row">
                <div class="settings-row__text">
                  <h3>Inline Widget</h3>
                  <p>Enable the signup helper widget on onboarding pages.</p>
                </div>
                <label class="toggle-switch" for="inline-widget-toggle" aria-label="Toggle inline widget">
                  <input type="checkbox" id="inline-widget-toggle" />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </section>
            <section class="settings-panel" data-panel="personas" role="tabpanel" hidden>
              <div class="persona-editor">
                <div class="persona-editor__controls">
                  <label class="persona-editor__label" for="persona-region-select">Region</label>
                  <select id="persona-region-select" class="persona-editor__select">
                    <option value="AU">Australia (AU)</option>
                    <option value="UK">United Kingdom (UK)</option>
                  </select>
                  <label class="persona-editor__label" for="persona-route-select">Route</label>
                  <select id="persona-route-select" class="persona-editor__select">
                    <option value="business-info">Business Information</option>
                    <option value="kyc-share-info">KYC · Share Info</option>
                    <option value="kyc-passport">KYC · Passport</option>
                    <option value="register-phone">Register Phone</option>
                  </select>
                  <button id="add-persona-btn" class="btn-primary btn-small" type="button">
                    + Add Persona
                  </button>
                </div>
                <div id="persona-list" class="persona-editor__list">
                  <p class="persona-editor__empty">
                    Choose a route to manage personas for that flow.
                  </p>
                </div>
                <form id="persona-form" class="persona-form is-hidden">
                  <h3 id="persona-form-title">New Persona</h3>
                  <div class="form-group">
                    <label for="persona-label">Display Label</label>
                    <input type="text" id="persona-label" placeholder="e.g. Company" />
                  </div>
                  <div class="form-group">
                    <label for="persona-identifier">Identifier</label>
                    <input type="text" id="persona-identifier" placeholder="Unique ID" />
                  </div>
                  <div class="form-group">
                    <label for="persona-fields">Fields (JSON)</label>
                    <textarea
                      id="persona-fields"
                      rows="5"
                      placeholder='[{"role":"textbox","name":"ABN or ACN","value":"123"}]'
                    ></textarea>
                  </div>
                  <p id="persona-form-error" class="persona-form__error" aria-live="polite"></p>
                  <div class="persona-form__actions">
                    <button type="button" id="persona-cancel-btn" class="btn-outline btn-small">Cancel</button>
                    <button type="submit" class="btn-primary btn-small">Save Persona</button>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </div>
        <footer class="settings-modal__footer">
          <button id="settings-cancel-btn" class="btn-outline" type="button">Cancel</button>
          <button id="settings-save-btn" class="btn-primary" type="button">Save Changes</button>
        </footer>
      </div>
    </div>
  `;
}
