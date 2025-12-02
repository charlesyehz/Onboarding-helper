# Zeller Onboarding Helper

A Chrome extension designed to streamline the Zeller onboarding process by automating form filling with test data. Built for internal testing and development purposes.

## Features

### 📧 Email Generation

- **Smart Email Generator**: Creates unique test emails with format `{name}+{ticket}-{counter}@myzeller.com`
- **Auto-incrementing Counter**: Prevents duplicate emails by tracking usage per ticket number with atomic increment guarantees
- **Persistent Storage**: Saves email prefix, ticket numbers, and counters across sessions
- **SignUp & Log Back In**: Separate buttons for signup and returning user flows
- **Concurrent-Safe**: Handles multiple simultaneous email generations without duplicates

### 📱 Phone Autofill

- **Automatic Phone Population**: Auto-fills phone numbers on `/register-phone` pages
- **Custom Phone Numbers**: Configure your preferred test phone number (AU format)
- **Smart Detection**: Uses MutationObserver to handle dynamically loaded forms

### 👀 Prefill Widget

- **In-Field Icon**: Subtle icon appears inside email input fields on focus
- **Smart Positioning**: Automatically detects and stacks next to password manager icons
- **Quick Access**: Click the icon to instantly prefill email with saved settings
- **Adaptive Positioning**: Follows input field even when validation messages appear
- **Reliable**: Duplicate widget prevention ensures one widget per field

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

### ⚙️ Settings Page

- **General Settings**: Configure extension behavior and preferences
  - Toggle inline widget on/off
  - Screen recording settings (quality, filename pattern, auto-stop)
  - Reset to default settings
- **Persona Management**: Create and manage custom test data configurations
  - Region-specific personas (AU/UK)
  - Route-based organization (Business Info, KYC, Passport, etc.)
  - Add, edit, and delete custom personas with JSON field definitions
  - Visual editor with region and route selectors
- **Accessible UI**: Dedicated settings page at `settings.html` for advanced configuration

### 🎥 Screen Recording

- **One-Click Recording**: Record browser sessions directly from the extension
- **Video Controls**: Start, stop, pause, and resume recording
- **Screenshot Capture**: Take screenshots during recording with keyboard shortcut
- **Quality Presets**:
  - Low: 720p, ~10 MB/min
  - Medium: 1080p, ~20 MB/min (default)
  - High: 1080p, ~40 MB/min
- **Customizable Filenames**: Configure naming pattern with variables:
  - `{date}`: Current date (YYYY-MM-DD)
  - `{time}`: Current time (HH-MM-SS)
  - `{timestamp}`: Unix timestamp
  - `{duration}`: Recording duration
- **Auto-Stop**: Optional automatic stop after specified duration
- **Recording Overlay**: On-screen timer showing recording duration
- **Notifications**: Desktop notifications when recording completes
- **WebM Format**: Recordings saved as `.webm` files with VP9/VP8/H264 codec support

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
3. **See the 👀 icon** appear inside the field (right side)
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

### Settings Page

1. **Open Settings**

   - Click the settings icon (⚙️) in the extension popup
   - Or navigate directly to `settings.html`

2. **Configure General Settings**

   - Toggle the inline widget on/off
   - Customize screen recording options:
     - Set filename pattern (e.g., `zeller-recording-{date}-{time}`)
     - Choose video quality (low/medium/high)
     - Set auto-stop duration (0 = no limit)
   - Reset all settings to defaults

3. **Manage Personas**

   - Switch between regions (AU/UK)
   - Select a route (Business Info, KYC, etc.)
   - Click "Add Item" to create a new persona
   - Fill in:
     - **Display Label**: Name shown in the popup (e.g., "Company")
     - **Identifier**: Unique ID (optional, auto-generated from label)
     - **Fields (JSON)**: Array of field definitions
   - Edit or delete existing personas using the action buttons

4. **Persona Field Format**
   ```json
   [
     {
       "role": "textbox",
       "name": "ABN or ACN",
       "value": "12345678901"
     },
     {
       "role": "textbox",
       "name": "Company name",
       "value": "Test Company Pty Ltd"
     }
   ]
   ```

### Screen Recording

1. **Start Recording**

   - Click the video icon (🎥) in the extension popup
   - Choose which screen/window/tab to record
   - Recording starts immediately with on-screen overlay

2. **During Recording**

   - **Timer Overlay**: Shows elapsed recording time
   - **Pause/Resume**: Click pause button in overlay or popup
   - **Screenshot**: Capture a screenshot frame (saves separately)
   - **Stop**: Click the stop button in popup or overlay

3. **After Recording**

   - Video automatically downloads to your Downloads folder
   - Desktop notification shows recording duration
   - Filename follows your configured pattern
   - Format: WebM (playable in Chrome, VLC, modern video players)

4. **Recording Tips**
   - Configure quality in Settings before recording
   - Use auto-stop to prevent accidentally long recordings
   - Medium quality is recommended for most use cases
   - Recordings are saved locally (not uploaded anywhere)

## Development

### Project Structure

```
.
├── manifest.json              # Extension manifest (v3)
├── popup.html                 # Popup UI
├── popup.css                  # Popup styles
├── settings.html              # Settings page UI
├── settings.css               # Settings page styles
├── offscreen.html             # Offscreen document for recording
├── offscreen.js               # MediaRecorder implementation
├── src/
│   ├── popup/
│   │   ├── index.js          # Popup entry point
│   │   ├── features/
│   │   │   ├── emailManager.js       # Email generation logic
│   │   │   ├── loginHelper.js        # Log back in feature
│   │   │   ├── regionSelector.js     # Region switcher
│   │   │   ├── autofill.js           # Form autofill configs
│   │   │   ├── recordingManager.js   # Recording UI controls
│   │   │   └── settingsModal.js      # Settings modal component
│   │   └── ui/
│   │       └── routePanel.js         # URL matching panel
│   ├── content/
│   │   ├── index.js              # Content script (phone autofill + widget)
│   │   └── settingsOverlay.js    # Settings overlay injector
│   ├── background/
│   │   ├── router.js         # Background service worker
│   │   └── recorder.js       # Screen recording engine
│   ├── settings/
│   │   └── index.js          # Settings page entry point
│   ├── shared/
│   │   ├── storage.js        # Storage utilities
│   │   ├── tabs.js           # Tab utilities
│   │   ├── domEvents.js      # DOM event helpers
│   │   └── routes.js         # Route configurations
│   └── config/
│       └── routes.js         # Route definitions
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
- **Recording**: MediaRecorder API with offscreen document
- **Video Codecs**: VP9, VP8, H264 (WebM format)
- **Permissions**: desktopCapture, offscreen, downloads, notifications

### Key Architecture Patterns

#### Storage Layer

- Uses `chrome.storage.local` for cross-context data sharing
- Fallback to `localStorage` for compatibility
- Async/await pattern for all storage operations
- Atomic counter increments with nonce-based compare-and-swap
- Fast-fail error handling for quota and permission issues

#### Content Script

- ES6 modules with dynamic imports
- MutationObserver for dynamic form detection
- Smart positioning with conflict detection
- Automatic cleanup on element removal and context invalidation
- Duplicate widget prevention with synchronous guards

#### Popup

- Modular feature organization
- Event-driven architecture
- Persistent settings across sessions

#### Screen Recording (Manifest V3)

- **Offscreen Document**: Uses offscreen HTML document to access MediaRecorder API
  - Service workers cannot directly access `getUserMedia()`
  - Offscreen document acts as media capture bridge
- **Message Passing**: Communication between service worker, popup, and offscreen document
  - `START_CAPTURE`, `STOP_CAPTURE`, `PAUSE_CAPTURE`, `RESUME_CAPTURE`
  - `RECORDING_STARTED`, `RECORDING_STOPPED`, `RECORDING_COMPLETE`
- **State Management**: Recording state tracked in background service worker
  - Supports pause/resume with accurate duration tracking
  - Handles paused duration calculation
  - Automatic cleanup with timeout protection
- **Desktop Capture**: Uses `chrome.tabCapture.getMediaStreamId()` API
  - Presents native OS picker for screen/window/tab selection
  - Stream ID passed to offscreen document for MediaRecorder
- **Memory-Efficient File Handling**: Uses object URLs to avoid memory spikes
  - Blob URLs created in offscreen document and passed to service worker
  - Downloads managed through Chrome Downloads API with direct URL download
  - Automatic filename generation with template support
  - Supports long recordings (15+ minutes) without browser crashes

#### Settings & Persona Management

- **Modal Component**: Reusable settings modal with tab navigation
- **Persona Editor**: CRUD interface for managing test data configurations
- **Region & Route System**: Hierarchical organization of personas
  - Two-level structure: Region (AU/UK) → Route → Personas
  - JSON-based field definitions with validation
- **Standalone Page**: Full settings page (`settings.html`) with enhanced UI
- **Storage Integration**: Personas stored in Chrome local storage by region

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
        value: "test value",
      },
    ],
  },
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

### Recording not starting

- Ensure you selected a screen/window/tab in the picker dialog
- Check that `desktopCapture` permission is enabled in manifest.json
- Verify offscreen document is loading correctly (check for errors)
- Try reloading the extension
- Check browser console for `[Recorder]` error logs

### Recording stops immediately

- Check available disk space
- Verify codec support (VP9 recommended)
- Try lowering video quality in settings
- Check browser console for MediaRecorder errors

### Settings not saving

- Verify `storage` permission in manifest.json
- Check browser console for storage errors
- Try clearing extension storage and reconfiguring
- Ensure settings.html is accessible

### Personas not appearing

- Check that you've selected the correct region (AU/UK)
- Verify you're on a matching route
- Ensure JSON field definitions are valid
- Try refreshing the popup or settings page

## Contributing

This is an internal tool for Zeller. For bug reports or feature requests, please contact the development team.

## License

Internal use only - Zeller Pty Ltd

---

**Maintained by**: Zeller Engineering Team
**Last Updated**: December 2025
