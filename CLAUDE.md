# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome extension (Manifest V3) designed to assist with Zeller's onboarding process by automating form filling with test data. The extension is used for internal testing and development purposes to speed up onboarding flow testing.

**Key Features:**
- Email generation with atomic counter increments
- Phone number autofill
- Inline widgets for quick prefilling
- Multi-region support (AU/UK)
- Persona management system
- Screen recording with optimized memory handling

## Development Commands

```bash
npm run lint      # Run web-ext lint to check manifest and permissions
npm run package   # Create dist/onboarding-helper.zip for distribution
```

### Loading the Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select this directory
4. Extension will appear with Zeller logo

### Testing Changes
- After modifying files, click the refresh icon on the extension card at `chrome://extensions/`
- For manifest.json changes, you may need to remove and reload the extension
- Open extension popup by clicking the Zeller icon in browser toolbar
- No automated test suite - exercise features manually on staging forms

### Debugging
- **Popup console**: Right-click extension icon → Inspect popup
- **Content script console**: Open DevTools on target page (F12)
- **Service worker console**: `chrome://extensions/` → Extension details → Service worker link
- **Background errors**: Check `chrome://extensions/` → Extension details → Errors button
- **Offscreen document**: Look for `[Offscreen]` logs in service worker console

## Architecture

### Manifest V3 Context System

The extension operates across **4 different JavaScript contexts**, each with different capabilities:

1. **Service Worker** (`src/background/router.js`)
   - Entry point: `background.service_worker` in manifest.json
   - Long-lived background process
   - Handles message routing between contexts
   - Manages screen recording state
   - Has access to Chrome APIs but NOT DOM

2. **Popup** (`src/popup/index.js`)
   - Runs when user clicks extension icon
   - Short-lived (closes when user clicks away)
   - Has limited Chrome API access
   - Uses chrome.storage.local for persistence

3. **Content Script** (`src/content/index.js`)
   - Injected into every page (matches `<all_urls>`)
   - Has DOM access but limited Chrome API access
   - Manages inline widgets and phone autofill
   - Uses dynamic imports for modular loading
   - **IMPORTANT**: Context becomes invalid when extension reloads

4. **Offscreen Document** (`offscreen.html` + `offscreen.js`)
   - Created on-demand for screen recording
   - Has access to `getUserMedia()` API (not available in service worker)
   - Handles MediaRecorder and video capture
   - Communicates with service worker via messages

### Message Passing Between Contexts

All contexts communicate via `chrome.runtime.sendMessage()` and `chrome.runtime.onMessage`:

**Key Message Types:**
- `REQUEST_ROUTE_SNAPSHOT` - Content script requests current route from service worker
- `ROUTE_UPDATED` - Service worker notifies content script of URL changes
- `SETTINGS_UPDATED` - Settings changes broadcast to all contexts
- `WIDGET_TOGGLED` - Inline widget enabled/disabled
- `START_RECORDING`, `STOP_RECORDING`, `PAUSE_RECORDING`, `RESUME_RECORDING` - Recording controls
- `START_CAPTURE`, `STOP_CAPTURE` - Service worker → Offscreen communication
- `RECORDING_COMPLETE` - Offscreen → Service worker (passes blob URL, not data)
- `RECORDING_STARTED`, `RECORDING_STOPPED`, `RECORDING_PAUSED`, `RECORDING_RESUMED` - Broadcast to popup/content

### Storage Architecture

**Chrome Storage Layer** (`src/shared/storage.js`)
- Primary: `chrome.storage.local` for cross-context data sharing
- Fallback: `localStorage` for compatibility
- All operations are async/await

**Critical Implementation: Atomic Counter Increments**
- Email counters use nonce-based compare-and-swap (CAS)
- Each write includes unique nonce: `{ value: N, nonce: "timestamp-random" }`
- After write, reads back to verify nonce still matches (atomic check)
- Retries with exponential backoff if another writer intervened
- Max 3 retries, max 200ms backoff
- Fast-fails on quota/permission errors

**Storage Keys:**
- `emailPrefix` - User's name for email generation
- `phoneNumber` - Saved phone number
- `currentRegion` - Selected region (AU/UK)
- `ticket-{number}` - Counter object with nonce: `{ value: N, nonce: "..." }`
- `personas-{region}` - Region-specific persona configurations
- `settings` - Extension settings (widget enabled, recording config)

### Content Script Architecture

**Entry Point**: `src/content/index.js`

**Two-Phase Initialization:**
1. Recording overlay loads on ALL pages
2. Widget/autofill features only load on allowed origins (localhost, myzeller.dev)

**Widget System** (`createUniversalWidgetController`):
- MutationObserver watches for matching input fields
- **Duplicate Prevention**: Synchronous `Set` check BEFORE DOM attribute check
- Each field gets `dataset.zellerWidgetAttached = "true"` flag
- Widget positioning uses ResizeObserver to follow field
- Cleanup on element removal AND context invalidation

**Route-Based Widget Activation**:
- URL pattern matching via `src/config/widgetConfig.js`
- Each route defines fields (CSS selectors) and widget type
- Widget types: `email`, `phone`, `persona-select`
- Multi-field personas can fill multiple inputs with one click

**Context Invalidation Handling**:
- Extension reload invalidates content script context
- Check `chrome.runtime?.id` before operations
- Cleanup all observers/widgets before returning
- Prevents memory leaks and zombie observers

### Screen Recording Architecture

**Key Design: Memory-Efficient Blob URLs**

Old approach (removed): Serialized video to array → crashed on 10+ min recordings
New approach: Create blob URL in offscreen → pass URL to service worker

**Recording Flow:**
1. User clicks record → popup sends `START_RECORDING` to service worker
2. Service worker calls `chrome.tabCapture.getMediaStreamId()` for tab
3. Service worker sends `START_CAPTURE` + streamId to offscreen document
4. Offscreen creates MediaRecorder with stream
5. MediaRecorder collects chunks in memory
6. On stop: Create `Blob` → `URL.createObjectURL(blob)` → Send URL to service worker
7. Service worker uses `chrome.downloads.download({ url: blobUrl })` directly
8. Download API streams from blob URL (no memory copy)

**State Management** (`src/background/recorder.js`):
- All recording state in `recorderState` object
- Cached settings prevent reload during critical operations
- Pause/resume tracks `pausedDuration` for accurate timers
- Cleanup timeout (10s) as failsafe if `RECORDING_COMPLETE` never arrives
- Timeout is cleared on successful cleanup to prevent duplicate calls

### Persona System

**Structure**: Region → Route → Personas

**Configuration Files:**
- `src/config/widgetConfig.js` - Defines routes and widget behavior
- `src/config/routes.js` - Route metadata and URL patterns
- `src/config/defaultSettings.js` - Default personas per region

**Storage Format**:
```javascript
personas-AU: {
  "business-info": {
    "Company": {
      displayLabel: "Company",
      identifier: "Company",
      fields: [
        { role: "textbox", name: "ABN or ACN", value: "12345678901" }
      ]
    }
  }
}
```

**Multi-Field Personas**:
- Can fill multiple inputs across the page
- Use `multiField: true` in widget config
- Optional `prefillActions` for modals (click to open, then fill)

### Key Technical Patterns

**Email Generation**:
- Format: `{prefix}+{ticketNumber}-{counter}@myzeller.com`
- Counter persists per ticket in storage
- Atomic increment prevents duplicate emails
- Targets `#signup-email-input` or `input[type="email"]`

**Phone Autofill**:
- Region-aware (AU has phone, UK doesn't)
- Migrates legacy phone numbers to personas
- MutationObserver detects dynamic forms
- 1 second delay before filling

**Form Autofill**:
- Uses Testing Library DOM queries (`getByRole`)
- Injected via `chrome.scripting.executeScript`
- Dispatches both `input` and `change` events for framework compatibility
- ARIA roles required for field matching

## Common Patterns

### Adding a New Route with Inline Widget

1. Add route configuration to `src/config/widgetConfig.js`:
```javascript
"new-route": {
  urlPattern: /\/your-route-path/i,
  fields: [
    {
      selectors: ["#fieldId", 'input[name="fieldName"]'],
      widgetType: "persona-select",
      personaRoute: "new-route",
      tooltipLabel: "Select Item:",
      buttonLabel: "Prefill",
    }
  ]
}
```

2. Add default personas to `src/config/defaultSettings.js`
3. Widget will automatically appear on matching pages

### Debugging Context Issues

If extension behaves strangely after reload:
1. Check if `chrome.runtime?.id` is falsy (context invalidated)
2. Look for "Extension context invalidated" warnings in console
3. Reload the target page to reinitialize content script
4. Check service worker console for `[Router]` or `[Recorder]` errors

### Memory Profiling Screen Recording

1. Open `chrome://extensions/` → Service worker → Inspect
2. Go to Memory tab
3. Start recording
4. Take heap snapshot
5. Stop recording
6. Take another heap snapshot
7. Memory should stay under 300MB for 10+ minute recordings

## Important Notes

- **config.json exists but is NOT used** - popup.js has hardcoded config
- Phone autofill only works on pages matching `*/register-phone*`
- Testing Library queries rely on ARIA roles and accessible names
- Email counter starts at 0 for first generation
- Widget positioning observer scopes to form/parent (not document.body) for performance
- Service worker can restart anytime - don't rely on in-memory state
- Content script can become invalidated on extension reload - always check `chrome.runtime?.id`
- Offscreen document persists until manually closed or browser restart

## Security Considerations

- **Internal use only** - Do not use with real customer data
- Host permissions limited to localhost and myzeller.dev
- Content script runs on `<all_urls>` but features only work on allowed origins
- No external API calls or data transmission
- All data stored locally in Chrome storage

## Coding Conventions

- 2-space indentation, `const`/`let` over `var`, camelCase names
- Treat `src/config/routes.js` as single source for onboarding personas
- Fields arrays use ordered `{ role, name, value }` objects for Testing Library replay
- Shared helpers expose obvious verbs (`matchRoute`, `bumpTicketCounter`)
- Prefer template literals for URLs/composed strings; double quotes otherwise

## Common Pitfalls

1. **Widget not appearing**: Check URL pattern matches and field selectors are correct
2. **Recording crashes**: Likely memory issue - verify object URL approach is used
3. **Counter duplicates**: Verify nonce-based CAS is working, check for concurrent writes
4. **Context invalidated errors**: Extension was reloaded - refresh target page
5. **Phone not filling**: Check region (UK has no phone), verify persona migration ran
6. **Settings not saving**: Check chrome.storage quota, look for permission errors
