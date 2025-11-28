# Settings Feature Implementation Plan

## Overview
This document outlines the implementation plan for adding a settings modal to the Chrome extension with the following capabilities:
1. Toggle inline-widget feature on/off
2. Configure personas for different business information (currently hardcoded in ROUTES)
3. Support both AU and UK ABNs with region-specific configurations

---

## Phase 1: Create Settings Modal UI

### Files to create/modify:
- `popup.html` - Add modal container
- `popup.css` - Add modal styles
- `src/popup/features/settingsModal.js` - New file for modal logic

### Tasks:

#### 1.1 Add modal HTML structure to `popup.html`
- Modal overlay + container
- Tabs for different settings sections (General, Personas)
- Toggle switch for inline-widget feature
- Persona editor UI (add/edit/delete personas per region)
- Save/Cancel buttons

#### 1.2 Style the modal in `popup.css`
- Modal overlay (semi-transparent backdrop)
- Modal container (centered, scrollable)
- Tab navigation
- Form inputs for persona editing
- Toggle switch component

#### 1.3 Wire up settings button
- Add click event handler in `src/popup/index.js`
- Initialize settings modal module

---

## Phase 2: Implement Settings Storage System

### Files to modify/create:
- `src/shared/storage.js` - Add new storage functions
- `src/config/defaultSettings.js` - New file for default configuration

### Tasks:

#### 2.1 Create `defaultSettings.js` with default configuration
```javascript
{
  inlineWidgetEnabled: true,
  personas: {
    AU: { /* existing AU personas */ },
    UK: { /* new UK personas */ }
  }
}
```

#### 2.2 Add storage functions to `storage.js`
- `loadSettings()` - Load all settings or return defaults
- `saveSettings(settings)` - Save complete settings object
- `getPersonasByRegion(region)` - Get personas for specific region
- `savePersonas(region, personas)` - Save personas for region
- `toggleInlineWidget(enabled)` - Toggle widget on/off
- `isInlineWidgetEnabled()` - Check widget status

#### 2.3 Handle migration from hardcoded ROUTES to storage
- On first load, check if settings exist
- If not, migrate ROUTES data to storage as AU personas
- Set migration flag to prevent re-migration

---

## Phase 3: Add Widget Toggle Feature

### Files to modify:
- `src/content/index.js` - Check toggle before initializing widget
- `src/popup/features/settingsModal.js` - Handle toggle UI

### Tasks:

#### 3.1 Modify `initSignupEmailWidget()` in `content/index.js`
- Check `isInlineWidgetEnabled()` before running
- Add message listener for settings changes
- Dynamically enable/disable widget when settings change

#### 3.2 Add toggle switch in settings modal
- Display current state
- Update storage on toggle
- Broadcast message to content scripts to refresh

#### 3.3 Add background script message handler (if needed)
- Broadcast settings changes to all tabs
- Reload content scripts if necessary

---

## Phase 4: Make Personas Configurable

### Files to modify:
- `src/popup/ui/routePanel.js` - Load personas from storage instead of ROUTES
- `src/popup/features/settingsModal.js` - Persona CRUD UI
- `src/config/routes.js` - Convert to template/schema only

### Tasks:

#### 4.1 Refactor `routePanel.js`
- Remove dependency on hardcoded ROUTES personas
- Load personas dynamically from storage based on selected region
- Keep route path matching logic

#### 4.2 Build persona editor in settings modal
- List all personas for selected region (AU/UK tabs)
- "Add Persona" button → modal/form
- Edit button per persona → populate form with existing data
- Delete button with confirmation
- Validate ABN/ACN format

#### 4.3 Convert `routes.js` structure
```javascript
// From:
personas: [ { id, label, fields } ]

// To (routes.js becomes schema only):
schema: {
  fields: [ { role, name, placeholder } ]
}
// Actual personas stored in chrome.storage
```

---

## Phase 5: Add Region-Specific ABN Support

### Files to modify:
- `src/popup/features/regionSelector.js` - Connect region to personas
- `src/popup/features/settingsModal.js` - Region tabs for personas
- `src/config/defaultSettings.js` - Add UK default personas

### Tasks:

#### 5.1 Create UK default personas in `defaultSettings.js`
- UK Company Number format (8 digits)
- UK Sole Trader UTR format
- Other UK business types

#### 5.2 Update `regionSelector.js`
- When region changes, emit event
- Reload route panel with region-specific personas

#### 5.3 Add region selector to settings modal
- Tab switcher: AU | UK
- Each tab shows personas for that region
- Can add/edit/delete per region independently

#### 5.4 Validation logic
- AU: ABN (11 digits) or ACN (9 digits)
- UK: Company Number (8 digits) or UTR (10 digits)
- Show format hints in persona editor

---

## Phase 6: Testing & Migration

### Tasks:

#### 6.1 Data Migration Testing
- Test first-time load (ROUTES → storage migration)
- Verify existing users don't lose data
- Test with empty storage (new install)

#### 6.2 Feature Testing
- Toggle widget on/off (verify widget disappears from page)
- Switch regions (AU ↔ UK) and verify correct personas load
- Add/edit/delete personas
- Fill forms with custom personas

#### 6.3 Edge Cases
- Invalid ABN/ACN formats
- Empty persona lists
- Corrupt storage data (fallback to defaults)
- Multiple tabs open (sync settings across tabs)

#### 6.4 UI/UX Polish
- Loading states while fetching storage
- Success/error messages for save operations
- Keyboard shortcuts (ESC to close modal)
- Confirm before deleting personas

---

## Data Structure Design

### Storage Schema:
```javascript
{
  // Settings key: "extension-settings"
  "extension-settings": {
    version: 1,
    inlineWidgetEnabled: true,
    personas: {
      AU: {
        "business-info": [
          { id: "company", label: "Company", fields: [...] },
          { id: "sole-trader", label: "Sole Trader", fields: [...] }
        ],
        "kyc-share-info": [...],
        "kyc-passport": [...]
      },
      UK: {
        "business-info": [
          { id: "uk-limited", label: "Limited Company", fields: [...] },
          { id: "uk-sole-trader", label: "Sole Trader", fields: [...] }
        ],
        "kyc-share-info": [...],
        "kyc-passport": [...]
      }
    }
  }
}
```

### Route Configuration Structure:
```javascript
// routes.js becomes a schema definition only
export const ROUTES = [
  {
    id: "business-info",
    path: "/onboarding/your-business-information",
    title: "Business Information",
    // personas removed - loaded from storage instead
    fieldSchema: [
      { role: "textbox", name: "ABN or ACN", placeholder: "Enter ABN/ACN" }
    ]
  }
  // ... other routes
];
```

---

## Implementation Order (Recommended)

1. **Phase 2** - Storage System (Foundation for everything)
2. **Phase 1** - Settings Modal UI (User interface)
3. **Phase 3** - Widget Toggle (Simplest feature to validate storage)
4. **Phase 4** - Configurable Personas (Core functionality)
5. **Phase 5** - UK Support (Extend to multiple regions)
6. **Phase 6** - Testing (Validate everything works)

---

## Estimated Complexity

| Phase | Complexity | Reason |
|-------|-----------|--------|
| Phase 1 (UI) | Medium | Modal HTML/CSS, form handling |
| Phase 2 (Storage) | Low-Medium | Extension of existing storage.js |
| Phase 3 (Widget Toggle) | Low | Simple boolean check |
| Phase 4 (Personas) | High | CRUD operations, dynamic loading |
| Phase 5 (UK Support) | Medium | Duplicate structure for UK |
| Phase 6 (Testing) | Medium | Comprehensive testing needed |

---

## Breaking Changes to Consider

1. **ROUTES.js:** Will become a schema/template only, personas move to storage
2. **routePanel.js:** Must fetch personas asynchronously from storage
3. **Migration:** Need one-time migration from hardcoded data to storage
4. **Backwards compatibility:** Ensure existing users' data isn't lost

---

## Key Technical Decisions

### Decision 1: Storage Structure
- **Choice:** Single `extension-settings` key with nested structure
- **Rationale:** Easier to manage, atomic updates, simpler migration
- **Alternative:** Separate keys per region/feature (more granular but complex)

### Decision 2: Migration Strategy
- **Choice:** Lazy migration on first settings access
- **Rationale:** No user impact, happens transparently
- **Alternative:** Background migration on extension update (requires version tracking)

### Decision 3: Region Management
- **Choice:** Region selector controls which personas are loaded
- **Rationale:** Clear separation, user controls context
- **Alternative:** Auto-detect region from URL (less flexible)

---

## Next Steps

1. Review and approve this plan
2. Start with Phase 2 (Storage System)
3. Progressive implementation following recommended order
4. Regular testing after each phase completion
