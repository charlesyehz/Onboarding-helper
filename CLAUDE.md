# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome extension (Manifest V3) designed to assist with Zeller's onboarding process by autofilling forms with test data. The extension is primarily used for testing and development purposes to speed up onboarding flow testing.

## Architecture

### Core Components

**popup.js** - Main extension logic
- URL path matching system that determines which form configurations to display based on current page
- Configuration-driven approach: uses path-based config object to map URLs to form field definitions
- Two main features:
  1. Form autofill using Testing Library DOM queries (getByRole)
  2. Email generation system with ticket-based counters

**content.js** - Content script for phone autofill
- Auto-injected on `/register-phone` pages (see manifest.json content_scripts)
- Uses MutationObserver to detect when phone input appears in DOM
- Automatically fills phone number field after 1 second delay

**config.json** - Form field configurations (not currently used in code, but duplicated in popup.js)
- Maps URL paths to entity types (Company, SoleTrader, Partnership, Trust, etc.)
- Each entity contains field definitions with role, name, and value

### Key Technical Patterns

**Testing Library Integration**
- Extension bundles `testlib.dom.umd.js` (Testing Library DOM)
- Injected into target pages via `chrome.scripting.executeScript`
- Uses `getByRole()` queries to find form fields by accessible role and name
- Dispatches both `input` and `change` events to ensure framework state updates

**Email Generation System**
- Format: `{prefix}+{ticketNumber}-{counter}@myzeller.com`
- Counter persists in localStorage per ticket: `ticket-{ticketNumber}` key
- Increments on each generation to create unique emails
- Targets element with id `signup-email-input`

**Script Injection Flow**
1. User clicks configuration button in popup
2. popup.js injects testlib.dom.umd.js into active tab
3. After injection completes, fillFields function executes with field configs
4. Testing Library queries locate elements and fill values

## Development Commands

### Loading the Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select this directory
4. Extension will appear with Zeller logo

### Testing Changes
- After modifying files, click the refresh icon on the extension card at `chrome://extensions/`
- For manifest.json changes, you may need to remove and reload the extension
- Open extension popup by clicking the Zeller icon in browser toolbar
- Check console logs: Right-click popup → Inspect → Console tab

### Debugging
- Popup console: Right-click extension icon → Inspect popup
- Content script console: Open DevTools on target page (F12)
- Background errors: Check `chrome://extensions/` → Extension details → Errors button

## Configuration System

The `config` object in popup.js uses this structure:
```javascript
{
  "/path/to/page": {
    "ConfigurationName": [
      { role: "textbox", name: "Field Name", value: "value" }
    ]
  }
}
```

Supported paths:
- `/onboarding/your-business-information` - Business entity type data (ABN/ACN)
- `/onboarding/kyc/share-your-information` - KYC personal details
- `/onboarding/kyc/passport` - Passport document numbers

## Important Notes

- config.json exists but is NOT used by the extension (popup.js has hardcoded config)
- Phone autofill only works on pages matching `http://*/register-phone` or `https://*/register-phone`
- Testing Library queries rely on ARIA roles and accessible names - form fields must have proper accessibility attributes
- Email counter increments BEFORE generating the email (starts at 0 for first generation)
