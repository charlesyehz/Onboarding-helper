# Screen Recording Feature - Task Breakdown

## Phase 1: Core Recording (MVP)

### 1. Setup & Configuration

#### 1.1 Update Manifest
- [ ] Add `tabCapture` permission to manifest.json
- [ ] Add `notifications` permission to manifest.json
- [ ] Verify existing `activeTab`, `downloads`, `storage` permissions
- [ ] Test extension loads with new permissions

#### 1.2 Add Recording Settings Schema
- [ ] Update `src/config/defaultSettings.js` with recording defaults
  - [ ] Add `recordingSettings` object
  - [ ] Set default filename pattern: `"zeller-recording-{date}-{time}"`
  - [ ] Set default video quality: `"medium"`
  - [ ] Set default auto-stop: `30` minutes
  - [ ] Set default showCountdown: `true`
- [ ] Update `SETTINGS_VERSION` constant

#### 1.3 Storage Helpers
- [ ] Add `loadRecordingSettings()` function to `src/shared/storage.js`
- [ ] Add `saveRecordingSettings(settings)` function
- [ ] Add `getRecordingFilenamePattern()` helper
- [ ] Add unit tests for storage helpers

---

### 2. Background Recording Engine

#### 2.1 Create Recorder Module
- [ ] Create `src/background/recorder.js` file
- [ ] Create recorder state object structure
  ```javascript
  {
    isRecording: false,
    isPaused: false,
    startTime: null,
    tabId: null,
    streamId: null,
    mediaRecorder: null,
    recordedChunks: [],
    screenshots: []
  }
  ```

#### 2.2 Implement Recording Start
- [ ] Create `startRecording(tabId)` async function
- [ ] Request tab capture stream with `chrome.tabCapture.capture()`
- [ ] Handle permission denial errors
- [ ] Create MediaStream from capture
- [ ] Initialize MediaRecorder with stream
  - [ ] Set MIME type: `'video/webm;codecs=vp9'`
  - [ ] Set video bitrate based on quality setting
- [ ] Set up MediaRecorder event handlers:
  - [ ] `ondataavailable` - collect chunks
  - [ ] `onstop` - trigger file save
  - [ ] `onerror` - handle recording errors
- [ ] Call `mediaRecorder.start(1000)` to record in 1s chunks
- [ ] Update recorder state
- [ ] Notify popup and content script of recording start

#### 2.3 Implement Recording Stop
- [ ] Create `stopRecording()` async function
- [ ] Stop MediaRecorder
- [ ] Stop all media stream tracks (cleanup)
- [ ] Wait for final `ondataavailable` event
- [ ] Combine recorded chunks into single Blob
- [ ] Generate filename using pattern
- [ ] Save file using `chrome.downloads.download()`
- [ ] Show notification with download link
- [ ] Clear recorder state
- [ ] Notify popup and content script of recording stop

#### 2.4 Helper Functions
- [ ] Create `getRecorderState()` function
- [ ] Create `generateFilename(pattern)` function
  - [ ] Replace `{date}` with YYYY-MM-DD
  - [ ] Replace `{time}` with HH-mm-ss
  - [ ] Replace `{timestamp}` with Unix timestamp
  - [ ] Replace `{duration}` with recording duration
  - [ ] Sanitize filename (remove invalid characters)
- [ ] Create `formatDuration(milliseconds)` helper
- [ ] Create `createBlobUrl(blob)` helper

#### 2.5 Message Handlers
- [ ] Create `handleStartRecording` message handler
- [ ] Create `handleStopRecording` message handler
- [ ] Create `handleGetRecorderState` message handler
- [ ] Register message listeners in background service worker

#### 2.6 Update Router
- [ ] Import recorder module in `src/background/router.js`
- [ ] Register recorder message handlers
- [ ] Test message routing

---

### 3. Popup UI

#### 3.1 Create Recording Manager Module
- [ ] Create `src/popup/features/recordingManager.js`
- [ ] Import recording state helpers
- [ ] Import runtime messaging helpers

#### 3.2 UI Elements
- [ ] Add record button to `popup.html`
  - [ ] Add button with ID `record-btn`
  - [ ] Add icon (red circle or camera icon)
  - [ ] Add tooltip: "Start Recording"
- [ ] Add recording status section
  - [ ] Status text element (Recording/Stopped)
  - [ ] Timer display element
  - [ ] Stop button (hidden when not recording)
- [ ] Style recording UI in `popup.css`
  - [ ] Record button styling (red accent)
  - [ ] Recording indicator (pulsing red dot)
  - [ ] Timer styling

#### 3.3 Recording Manager Logic
- [ ] Implement `initRecordingManager()` function
- [ ] Get current recording state on popup open
- [ ] Update UI based on state
- [ ] Add record button click handler
  - [ ] Get active tab ID
  - [ ] Send START_RECORDING message to background
  - [ ] Handle errors (show user-friendly message)
  - [ ] Update UI to recording state
- [ ] Add stop button click handler
  - [ ] Send STOP_RECORDING message to background
  - [ ] Update UI to stopped state
- [ ] Implement recording timer update
  - [ ] Use `setInterval` to update every second
  - [ ] Calculate elapsed time
  - [ ] Format as MM:SS or HH:MM:SS
  - [ ] Clear interval on stop

#### 3.4 State Listeners
- [ ] Listen for recording state changes from background
- [ ] Update UI when recording starts (from content script trigger)
- [ ] Update UI when recording stops
- [ ] Handle errors and show notifications

#### 3.5 Integration
- [ ] Import `recordingManager.js` in `src/popup/index.js`
- [ ] Call `initRecordingManager()` in DOMContentLoaded
- [ ] Test popup UI updates correctly

---

### 4. Floating Overlay (Content Script)

#### 4.1 Create Overlay Module
- [ ] Create `src/content/recordingOverlay.js`
- [ ] Create overlay HTML structure
  ```html
  <div id="zeller-recording-overlay">
    <div class="recording-badge">REC</div>
    <div class="recording-timer">00:00</div>
    <button class="stop-btn">Stop</button>
  </div>
  ```

#### 4.2 Overlay Styling
- [ ] Create inline styles in module
- [ ] Position: fixed, top-right corner
- [ ] z-index: Very high (2147483647)
- [ ] Background: Semi-transparent dark
- [ ] Border-radius for rounded corners
- [ ] Red recording indicator
- [ ] Style timer display
- [ ] Style stop button

#### 4.3 Overlay Injection
- [ ] Create `injectOverlay()` function
- [ ] Check if overlay already exists (prevent duplicates)
- [ ] Create overlay DOM elements
- [ ] Inject styles
- [ ] Append to document.body
- [ ] Make overlay visible with fade-in animation

#### 4.4 Overlay Controls
- [ ] Implement stop button click handler
  - [ ] Send STOP_RECORDING message to background
  - [ ] Show "Stopping..." feedback
- [ ] Implement timer update
  - [ ] Receive start time from background
  - [ ] Update every second with `setInterval`
  - [ ] Format as MM:SS

#### 4.5 Overlay Removal
- [ ] Create `removeOverlay()` function
- [ ] Fade-out animation
- [ ] Remove from DOM
- [ ] Clear timer interval
- [ ] Clean up event listeners

#### 4.6 Message Handlers
- [ ] Listen for RECORDING_STARTED message
  - [ ] Inject overlay
  - [ ] Start timer
- [ ] Listen for RECORDING_STOPPED message
  - [ ] Remove overlay
- [ ] Handle page navigation/reload
  - [ ] Check recording state on page load
  - [ ] Re-inject overlay if recording in progress

#### 4.7 Integration with Content Script
- [ ] Import overlay module in `src/content/index.js`
- [ ] Initialize message listeners
- [ ] Test overlay injection/removal

---

### 5. File Handling & Download

#### 5.1 Blob Processing
- [ ] Implement `combineBlobChunks(chunks)` function
- [ ] Create Blob with correct MIME type
- [ ] Verify Blob size is reasonable
- [ ] Handle empty recordings (error case)

#### 5.2 Download Implementation
- [ ] Implement `downloadRecording(blob, filename)` function
- [ ] Create object URL from Blob
- [ ] Use `chrome.downloads.download()` API
  - [ ] Set filename
  - [ ] Set saveAs: false (auto-save to Downloads)
  - [ ] Set conflictAction: 'uniquify'
- [ ] Handle download errors
- [ ] Revoke object URL after download starts

#### 5.3 Download Notifications
- [ ] Create `showDownloadNotification(filename)` function
- [ ] Use `chrome.notifications.create()` API
  - [ ] Type: 'basic'
  - [ ] Title: "Recording Saved"
  - [ ] Message: "Recording saved as {filename}"
  - [ ] Icon: Extension icon
- [ ] Add click handler to open Downloads folder
- [ ] Auto-dismiss after 5 seconds

#### 5.4 Error Handling
- [ ] Handle disk space errors
- [ ] Handle permission errors
- [ ] Handle download cancellation
- [ ] Show user-friendly error messages

---

### 6. Testing & Bug Fixes

#### 6.1 Unit Tests
- [ ] Test filename pattern generation
  - [ ] Test all placeholder variables
  - [ ] Test sanitization
  - [ ] Test edge cases (special characters)
- [ ] Test duration formatting
- [ ] Test Blob combination
- [ ] Test state management

#### 6.2 Integration Tests
- [ ] Test full recording flow (start → stop → save)
- [ ] Test popup UI updates
- [ ] Test overlay injection
- [ ] Test file download
- [ ] Test notification display

#### 6.3 Manual Testing
- [ ] Test on fresh Chrome profile
- [ ] Test permission prompt acceptance/denial
- [ ] Record 10 second video → verify file
- [ ] Record 1 minute video → verify file size
- [ ] Test popup open/close during recording
- [ ] Test page navigation during recording
- [ ] Test multiple start/stop cycles
- [ ] Test browser tab close during recording
- [ ] Verify Downloads folder location
- [ ] Verify filename pattern

#### 6.4 Bug Fixes
- [ ] Fix any memory leaks (check with Chrome Task Manager)
- [ ] Fix any state synchronization issues
- [ ] Fix any UI glitches
- [ ] Fix any race conditions

---

## Phase 2: Screenshots & Enhanced Controls

### 7. Screenshot Capability

#### 7.1 Screenshot Storage
- [ ] Add screenshots array to recorder state
- [ ] Create screenshot object schema:
  ```javascript
  {
    timestamp: number,
    dataUrl: string,
    filename: string
  }
  ```

#### 7.2 Screenshot Capture
- [ ] Create `captureScreenshot()` function in recorder.js
- [ ] Use `chrome.tabs.captureVisibleTab()` API
  - [ ] Format: PNG or JPEG (based on settings)
  - [ ] Quality: 90 for JPEG
- [ ] Generate screenshot filename
  - [ ] Pattern: `{video-filename}-screenshot-{index}.png`
- [ ] Store in screenshots array with timestamp
- [ ] Increment screenshot counter

#### 7.3 Screenshot Download
- [ ] Download each screenshot when recording stops
- [ ] Use same download folder as video
- [ ] Show count in notification ("3 screenshots saved")

#### 7.4 Overlay Screenshot Button
- [ ] Add screenshot button to overlay UI
- [ ] Button icon: camera icon
- [ ] Add click handler
  - [ ] Send CAPTURE_SCREENSHOT message to background
  - [ ] Show visual feedback (flash effect)
  - [ ] Update screenshot counter in overlay
- [ ] Display screenshot count: "📷 3"

#### 7.5 Testing
- [ ] Test screenshot capture during recording
- [ ] Test multiple screenshots
- [ ] Verify screenshot quality
- [ ] Test screenshot download

---

### 8. Pause/Resume Functionality

#### 8.1 State Management
- [ ] Add `isPaused` to recorder state
- [ ] Add `pausedDuration` to track total pause time
- [ ] Add `pauseStartTime` for current pause

#### 8.2 Pause Implementation
- [ ] Create `pauseRecording()` function
- [ ] Call `mediaRecorder.pause()`
- [ ] Update state
- [ ] Notify popup and overlay

#### 8.3 Resume Implementation
- [ ] Create `resumeRecording()` function
- [ ] Call `mediaRecorder.resume()`
- [ ] Update state
- [ ] Calculate paused duration
- [ ] Notify popup and overlay

#### 8.4 UI Updates
- [ ] Add pause/resume button to overlay
  - [ ] Toggle icon: pause ⏸️ / play ▶️
- [ ] Add pause/resume button to popup
- [ ] Show "PAUSED" indicator in overlay
- [ ] Pause timer updates when paused
- [ ] Resume timer when resumed

#### 8.5 Message Handlers
- [ ] Add PAUSE_RECORDING message handler
- [ ] Add RESUME_RECORDING message handler
- [ ] Test pause/resume flow

---

### 9. Draggable Overlay

#### 9.1 Drag Implementation
- [ ] Add mousedown event listener to overlay header
- [ ] Implement drag logic:
  - [ ] Calculate offset from mouse to overlay position
  - [ ] Update overlay position on mousemove
  - [ ] Stop drag on mouseup
- [ ] Constrain to viewport bounds
- [ ] Smooth dragging with CSS cursor

#### 9.2 Position Persistence
- [ ] Save overlay position to storage
- [ ] Restore position on next recording
- [ ] Default position: top-right corner

#### 9.3 Minimize/Maximize
- [ ] Add minimize button to overlay
- [ ] Minimized state: small indicator with timer
- [ ] Maximize button in minimized state
- [ ] Animate transition
- [ ] Persist minimize state

---

### 10. Settings Page Integration

#### 10.1 HTML Structure
- [ ] Add "Recording" section to `settings.html`
- [ ] Add filename pattern input field
- [ ] Add video quality dropdown (Low/Medium/High)
- [ ] Add auto-stop duration input (minutes)
- [ ] Add screenshot format dropdown (PNG/JPEG)
- [ ] Add countdown toggle switch
- [ ] Add preview of generated filename

#### 10.2 Settings UI Logic
- [ ] Create recording settings section handler in `src/settings/index.js`
- [ ] Load settings on page load
- [ ] Populate form fields
- [ ] Add form validation
  - [ ] Validate filename pattern
  - [ ] Validate auto-stop duration (0-120 minutes)
- [ ] Add save button handler
- [ ] Show save success feedback

#### 10.3 Filename Pattern Builder
- [ ] Add "Insert Variable" buttons for each pattern variable
  - [ ] {date}, {time}, {timestamp}, {duration}
- [ ] Live preview of filename
- [ ] Show example: "zeller-recording-2025-12-02-14-30-45.webm"

#### 10.4 Quality Presets
- [ ] Create quality preset configurations:
  ```javascript
  Low: 1280x720, 1 Mbps
  Medium: 1920x1080, 2.5 Mbps
  High: 1920x1080, 5 Mbps
  ```
- [ ] Show estimated file size per minute for each quality
- [ ] Apply quality setting when starting recording

---

## Phase 3: Polish & Production-Ready

### 11. Error Handling & Edge Cases

#### 11.1 Permission Errors
- [ ] Handle tabCapture permission denial
- [ ] Show clear error message to user
- [ ] Provide instructions to enable permission
- [ ] Add "Retry" button

#### 11.2 Tab Closure During Recording
- [ ] Listen for tab close event
- [ ] Automatically stop recording
- [ ] Save partial recording
- [ ] Notify user that recording was stopped early

#### 11.3 Browser Crash Recovery
- [ ] Cannot prevent, but handle gracefully
- [ ] Clear recording state on extension startup
- [ ] Don't show stale "Recording..." status

#### 11.4 Disk Space
- [ ] Estimate file size before recording
- [ ] Warn if approaching disk space limits (if detectable)
- [ ] Handle download failure due to space

#### 11.5 Long Recording Warnings
- [ ] Show warning before 15-minute mark
- [ ] Auto-stop at configured duration (default 30 min)
- [ ] Show countdown before auto-stop (last 10 seconds)

#### 11.6 Memory Management
- [ ] Clear recorded chunks after download
- [ ] Revoke object URLs after use
- [ ] Monitor memory usage during development

---

### 12. User Experience Enhancements

#### 12.1 Countdown Timer
- [ ] Show 3-2-1 countdown before recording starts
- [ ] Display in center of screen with large numbers
- [ ] Fade out before recording begins
- [ ] Make configurable in settings (enable/disable)

#### 12.2 Recording Indicator
- [ ] Update extension icon when recording
  - [ ] Add red dot badge
  - [ ] Or replace icon with recording version
- [ ] Remove indicator when stopped

#### 12.3 Keyboard Shortcuts
- [ ] Add keyboard shortcut for start/stop: Alt+Shift+R
- [ ] Add keyboard shortcut for screenshot: Alt+Shift+S
- [ ] Make configurable in settings
- [ ] Register with chrome.commands API

#### 12.4 Confirmation Dialogs
- [ ] Confirm before stopping recordings > 5 minutes
- [ ] "Are you sure? Recording will be saved."
- [ ] Don't show again checkbox

#### 12.5 File Size Estimation
- [ ] Calculate estimated file size during recording
- [ ] Display in overlay: "~45 MB"
- [ ] Update every 5 seconds
- [ ] Warn if exceeds 500 MB

#### 12.6 Success Feedback
- [ ] Show success animation when recording stops
- [ ] Play success sound (optional, configurable)
- [ ] Show file size and duration in notification
- [ ] "Open Folder" and "Open Video" buttons in notification

---

### 13. Performance Optimization

#### 13.1 Memory Optimization
- [ ] Use chunked recording (1 second chunks)
- [ ] Stream chunks to file instead of accumulating in memory
  - [ ] Research if possible with chrome.downloads API
  - [ ] Or implement periodic flush
- [ ] Clear old chunks after writing

#### 13.2 CPU Optimization
- [ ] Use appropriate video codec settings
- [ ] Don't re-encode unnecessarily
- [ ] Profile CPU usage during recording

#### 13.3 Chunk Size Tuning
- [ ] Experiment with optimal chunk interval (500ms vs 1000ms)
- [ ] Balance between file continuity and memory usage

---

### 14. Documentation

#### 14.1 Update CLAUDE.md
- [ ] Add "Screen Recording" section
- [ ] Document recording feature architecture
- [ ] Document settings and configuration
- [ ] Document file naming patterns
- [ ] Document limitations (WebM format, save path)
- [ ] Add troubleshooting section

#### 14.2 User Guide
- [ ] Create user-facing documentation
- [ ] Add screenshots of UI
- [ ] Add step-by-step instructions
- [ ] Document keyboard shortcuts
- [ ] Add FAQ section

#### 14.3 Code Documentation
- [ ] Add JSDoc comments to all public functions
- [ ] Document state object structure
- [ ] Document message protocol
- [ ] Add inline comments for complex logic

---

### 15. Final Testing & Release

#### 15.1 Cross-Browser Testing
- [ ] Test on Chrome (latest)
- [ ] Test on Chrome (version - 1)
- [ ] Test on Edge
- [ ] Document any browser-specific issues

#### 15.2 Regression Testing
- [ ] Verify existing features still work
  - [ ] Autofill functionality
  - [ ] Email generation
  - [ ] Settings page
  - [ ] Inline widgets
- [ ] No performance degradation

#### 15.3 Performance Testing
- [ ] Record 5-minute video → verify file size
- [ ] Record 15-minute video → verify memory usage
- [ ] Record 30-minute video → verify no crashes
- [ ] Take 20 screenshots during recording
- [ ] Test on slow machine

#### 15.4 Security Review
- [ ] Review permissions (only request necessary)
- [ ] Verify no data sent to external servers
- [ ] Verify files stay local
- [ ] Check for any potential privacy issues

#### 15.5 Pre-Release Checklist
- [ ] All tests passing
- [ ] No console errors
- [ ] Documentation complete
- [ ] Version number bumped in manifest.json
- [ ] Changelog updated
- [ ] Code reviewed
- [ ] Tested on clean Chrome profile

#### 15.6 Release
- [ ] Create release branch
- [ ] Tag release version
- [ ] Create release notes
- [ ] Deploy to team for testing
- [ ] Gather feedback
- [ ] Fix critical bugs
- [ ] Final release

---

## Optional Future Enhancements (Post-Release)

### 16. Advanced Features

- [ ] **Audio Recording**
  - [ ] Add tab audio capture
  - [ ] Add microphone audio option
  - [ ] Audio quality settings
  - [ ] Mute/unmute during recording

- [ ] **Mouse Highlighting**
  - [ ] Show click effects during recording
  - [ ] Highlight cursor position
  - [ ] Configurable highlight style

- [ ] **Annotation Tools**
  - [ ] Draw on screen during recording
  - [ ] Add text annotations
  - [ ] Arrow and shape tools

- [ ] **Video Editing**
  - [ ] Trim video (start/end)
  - [ ] Cut sections
  - [ ] Add title cards

- [ ] **Recording Gallery**
  - [ ] View recent recordings in extension
  - [ ] Play videos in popup
  - [ ] Delete old recordings

- [ ] **MP4 Export**
  - [ ] Add FFmpeg.js for MP4 conversion
  - [ ] Format selection (WebM vs MP4)
  - [ ] Show conversion progress

- [ ] **Cloud Integration**
  - [ ] Upload to Google Drive
  - [ ] Upload to Dropbox
  - [ ] Share links

---

## Task Summary by Estimated Time

### Quick Tasks (< 30 minutes)
- Update manifest permissions
- Add UI buttons
- Add storage helpers
- Create notification functions
- Add keyboard shortcuts

### Medium Tasks (30 min - 2 hours)
- Implement recording start/stop logic
- Create overlay UI
- Implement screenshot capture
- Add pause/resume
- Settings page section

### Large Tasks (2+ hours)
- Full recording engine implementation
- Draggable overlay with all features
- Comprehensive error handling
- Complete testing suite
- Documentation writing

---

## Dependencies & Order

**Must Complete First:**
1. Setup & Configuration (Tasks 1.1 - 1.3)
2. Background Recording Engine (Tasks 2.1 - 2.6)

**Then Parallel:**
- Popup UI (Tasks 3.1 - 3.5)
- Floating Overlay (Tasks 4.1 - 4.7)
- File Handling (Tasks 5.1 - 5.4)

**Then:**
6. Testing & Bug Fixes (Task 6)

**Phase 2 can start after Phase 1 complete**

**Phase 3 is polish and can be ongoing**
