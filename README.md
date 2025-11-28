# Zeller Onboarding Helper

A Chrome extension designed to streamline the Zeller onboarding process by automating form filling with test data. Built for internal testing and development purposes.

## Features

### 📧 Email Generation
- **Smart Email Generator**: Creates unique test emails with format `{name}+{ticket}-{counter}@myzeller.com`
- **Auto-incrementing Counter**: Prevents duplicate emails by tracking usage per ticket number
- **Persistent Storage**: Saves email prefix, ticket numbers, and counters across sessions
- **SignUp & Log Back In**: Separate buttons for signup and returning user flows

### 📱 Phone Autofill
- **Automatic Phone Population**: Auto-fills phone numbers on `/register-phone` pages
- **Custom Phone Numbers**: Configure your preferred test phone number (AU format)
- **Smart Detection**: Uses MutationObserver to handle dynamically loaded forms

### ✨ Prefill Widget
- **In-Field Icon**: Subtle icon appears inside email input fields on focus
- **Smart Positioning**: Automatically detects and stacks next to password manager icons
- **Quick Access**: Click the icon to instantly prefill email with saved settings
- **Adaptive Positioning**: Follows input field even when validation messages appear

### 🗺️ Region Selector
- **Multi-Region Support**: Switch between AU and UK configurations
- **Persistent Selection**: Region choice saved across sessions
- **Easy Toggle**: Dropdown selector in extension popup header

### 📋 URL-Based Autofill
- **Route Matching**: Automatically fills forms based on URL patterns
- **Multiple Configurations**: Pre-configured data for different business entity types:
  - Company
  - Sole Trader
  - Partnership
  - Trust
  - Government
  - Association
- **KYC Data**: Test data for personal information and passport verification

### 🧹 History Management
- **Clear History**: One-click button to reset all stored data
- **Fresh Start**: Clears email counters, phone numbers, and saved settings

## Installation

### From Source

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd onboarding-form-autofill
   ```

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the extension directory

3. **Verify Installation**
   - Look for the Zeller icon in your browser toolbar
   - Click the icon to open the popup

## Usage

### Email Generation

1. **Open the Extension Popup**
   - Click the Zeller icon in your browser toolbar

2. **Configure Settings**
   - **Your Name**: Enter your name (e.g., "John Doe")
   - **Ticket Number**: Enter the JIRA ticket number (e.g., "BANK-1234")
   - **Phone Number**: Enter test phone number (optional, defaults to 0423105719)

3. **Generate Email**
   - Navigate to a signup page
   - Click **"SignUp"** button in the popup
   - Email will auto-fill if the field exists on the page
   - Format: `johndoe+BANK-1234-0@myzeller.com`

4. **Log Back In**
   - Navigate to a login page
   - Click **"Log back in"** button
   - Uses the last generated email

### Using the Prefill Widget

1. **Navigate to any signup page** with an email input field
2. **Focus the email input** (click on it)
3. **See the ✨ icon** appear inside the field (right side)
4. **Click the icon** to open the quick-fill tooltip
5. **Click "Prefill email"** to instantly fill with your saved settings

### Phone Autofill

1. **Enter phone number** in the popup (under "Phone Number")
2. **Navigate to** `/register-phone` page
3. **Phone field auto-fills** automatically with your saved number

### URL-Based Autofill

1. **Navigate to** a configured route (e.g., `/onboarding/your-business-information`)
2. **See available configurations** in the "Matched URL Config" section
3. **Click a configuration** (e.g., "Company", "SoleTrader") to autofill the form

## Development

### Project Structure

```
.
├── manifest.json              # Extension manifest (v3)
├── popup.html                 # Popup UI
├── popup.css                  # Popup styles
├── src/
│   ├── popup/
│   │   ├── index.js          # Popup entry point
│   │   ├── features/
│   │   │   ├── emailManager.js    # Email generation logic
│   │   │   ├── loginHelper.js     # Log back in feature
│   │   │   ├── regionSelector.js  # Region switcher
│   │   │   └── autofill.js        # Form autofill configs
│   │   └── ui/
│   │       └── routePanel.js      # URL matching panel
│   ├── content/
│   │   └── index.js          # Content script (phone autofill + widget)
│   ├── background/
│   │   └── router.js         # Background service worker
│   └── shared/
│       ├── storage.js        # Storage utilities
│       ├── tabs.js           # Tab utilities
│       ├── domEvents.js      # DOM event helpers
│       └── routes.js         # Route configurations
├── fonts/
│   ├── InterZeller-Regular.woff2
│   └── InterZeller-Medium.woff2
└── images/
    └── zeller-logo.png
```

### Technologies

- **Manifest Version**: V3
- **JavaScript**: ES6+ Modules
- **Storage**: Chrome Storage API (local)
- **UI Framework**: Vanilla JavaScript
- **CSS**: Custom styles with light/dark theme support
- **Font**: Inter Zeller

### Key Architecture Patterns

#### Storage Layer
- Uses `chrome.storage.local` for cross-context data sharing
- Fallback to `localStorage` for compatibility
- Async/await pattern for all storage operations

#### Content Script
- ES6 modules with dynamic imports
- MutationObserver for dynamic form detection
- Smart positioning with conflict detection
- Automatic cleanup on element removal

#### Popup
- Modular feature organization
- Event-driven architecture
- Persistent settings across sessions

### Testing Changes

1. **Modify source files**
2. **Reload extension** at `chrome://extensions/` (click refresh icon)
3. **For manifest.json changes**: Remove and reload the extension
4. **Check console logs**:
   - Popup console: Right-click popup → Inspect
   - Content script: Open DevTools on target page (F12)

### Adding New Form Configurations

Edit `popup.js` config object:

```javascript
const config = {
  "/your/route/path": {
    "Configuration Name": [
      {
        role: "textbox",
        name: "Field Label",
        value: "test value"
      }
    ]
  }
};
```

## Configuration

### Email Domain
Default: `@myzeller.com`
Location: `src/popup/features/emailManager.js` (line 13)

### Phone Number Format
Default: Australian format (e.g., `0423105719`)
Location: Configurable in popup UI

### Default Phone Fallback
Default: `0423105719`
Location: `src/content/index.js` (line 13)

## Browser Support

- **Chrome**: Version 88+ (Manifest V3 required)
- **Edge**: Version 88+ (Chromium-based)
- **Other Browsers**: Not tested

## Security Notes

⚠️ **For Internal Use Only**
- Contains test data for Zeller's onboarding flows
- Should not be used with real customer data
- Not intended for production environments

## Troubleshooting

### Extension not loading
- Ensure Developer mode is enabled
- Check for manifest.json errors in Extensions page
- Verify all required files are present

### Phone autofill not working
- Check URL matches pattern: `*register-phone*`
- Verify phone number is saved in popup
- Check console for `[Autofill]` logs
- Reload extension after changes

### Prefill widget not appearing
- Ensure input field is focused (click on it)
- Check that field has `type="email"` or matching selectors
- Verify extension is injecting on the page (check console)

### Email counter not incrementing
- Check that signup email field exists on page before clicking "SignUp"
- Verify chrome.storage permissions in manifest.json
- Clear extension storage and try again

## Contributing

This is an internal tool for Zeller. For bug reports or feature requests, please contact the development team.

## License

Internal use only - Zeller Pty Ltd

---

**Maintained by**: Zeller Engineering Team
**Last Updated**: November 2025
