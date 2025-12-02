# Screen Recording Feature - Implementation Plan

## Overview

Add screen recording capability to the Zeller Onboarding Helper extension to capture browser tab activity during testing. This will help with bug reporting, documentation, training materials, and QA evidence.

## Feature Scope

### MVP Features (Phase 1)
- Record button in extension popup
- Capture current browser tab video (no audio initially)
- Floating overlay with stop/pause controls
- Screenshot capability during recording
- Save recordings to Downloads folder as WebM files
- Configurable filename pattern
- Recording timer display
- Visual recording indicator

### Enhanced Features (Phase 2)
- Audio recording (tab audio)
- Configurable video quality settings
- Draggable floating controls
- Auto-stop after configurable duration
- Recording notification with file location
- Minimize/maximize floating controls

### Future Enhancements (Phase 3+)
- Mouse click highlighting
- Annotation tools (draw, text)
- Webcam picture-in-picture overlay
- Basic video trimming
- Recording gallery/history
- MP4 export option

## Technical Architecture

### Chrome APIs Required

```javascript
{
  "permissions": [
    "tabCapture",      // Capture tab video stream
    "activeTab",       // For screenshots
    "downloads",       // Save files
    "storage",         // User preferences
    "notifications"    // Recording notifications
  ]
}
```

### Component Architecture

```
┌─────────────────┐
│   Popup UI      │ - Record button
│   (popup.html)  │ - Status indicator
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────┐
│  Background Service Worker       │
│  (background/recorder.js)        │
│  - MediaRecorder management      │
│  - Stream capture                │
│  - File generation & download    │
│  - State management              │
└────────┬────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Content Script                   │
│  (content/recordingOverlay.js)   │
│  - Floating control UI            │
│  - Screenshot triggers            │
│  - Visual feedback               │
│  - Timer display                 │
└──────────────────────────────────┘
```

### State Management

Recording state stored in background service worker:
```javascript
{
  isRecording: boolean,
  isPaused: boolean,
  startTime: timestamp,
  tabId: number,
  mediaRecorder: MediaRecorder,
  recordedChunks: Blob[],
  screenshots: Array<{timestamp, dataUrl}>
}
```

### File Structure Changes

```
src/
├── background/
│   ├── router.js (existing)
│   └── recorder.js (NEW) - Recording engine
├── content/
│   ├── index.js (existing)
│   └── recordingOverlay.js (NEW) - Floating controls
├── popup/
│   ├── features/
│   │   └── recordingManager.js (NEW) - Record button logic
│   └── index.js (UPDATE) - Add recording manager
├── shared/
│   ├── storage.js (UPDATE) - Add recording settings
│   └── recordingState.js (NEW) - State helpers
└── config/
    └── defaultSettings.js (UPDATE) - Add recording defaults

settings.html (UPDATE) - Add recording settings section
popup.html (UPDATE) - Add record button
manifest.json (UPDATE) - Add new permissions
```

## Implementation Phases

### Phase 1: Core Recording (MVP)

**Goal**: Basic recording functionality working end-to-end

1. **Setup & Permissions**
   - Update manifest.json with required permissions
   - Add recording settings to defaultSettings.js
   - Update storage.js with recording config helpers

2. **Background Recording Engine**
   - Create recorder.js service worker module
   - Implement startRecording() with tabCapture
   - Implement stopRecording() with file save
   - Handle MediaRecorder events
   - Manage recording state

3. **Popup UI**
   - Add record button with icon
   - Show recording status (recording/stopped)
   - Display recording duration
   - Add stop button when recording

4. **Floating Overlay**
   - Create basic overlay HTML structure
   - Inject into active tab
   - Stop button functionality
   - Recording timer display
   - Remove on recording stop

5. **File Handling**
   - Generate WebM from recorded chunks
   - Create filename with timestamp pattern
   - Download to Downloads folder
   - Show success notification

### Phase 2: Screenshots & Controls

**Goal**: Enhanced usability and screenshot capture

1. **Screenshot Capability**
   - Add screenshot button to overlay
   - Capture using chrome.tabs.captureVisibleTab
   - Store with timestamp
   - Save alongside video or separately
   - Show screenshot count in overlay

2. **Pause/Resume**
   - Add pause button to overlay
   - Implement MediaRecorder pause/resume
   - Update timer display (show paused state)
   - Visual feedback for paused state

3. **Improved Overlay UI**
   - Make overlay draggable
   - Add minimize/maximize toggle
   - Improve styling (Zeller brand colors)
   - Position persistence
   - Prevent overlay blocking content

4. **Settings Page Integration**
   - Add "Recording" section to settings.html
   - Filename pattern configuration
   - Video quality selector (low/medium/high)
   - Auto-stop duration setting
   - Screenshot format option (PNG/JPEG)

### Phase 3: Polish & Quality

**Goal**: Production-ready feature with good UX

1. **Error Handling**
   - Handle permission denials gracefully
   - Handle tab closure during recording
   - Handle browser crashes
   - Handle disk space issues
   - User-friendly error messages

2. **User Experience**
   - Countdown before recording starts (3-2-1)
   - Visual recording indicator (red dot in toolbar icon)
   - Keyboard shortcuts (configurable)
   - Confirmation before stopping long recordings
   - Show estimated file size

3. **Performance**
   - Memory management for long recordings
   - Chunk size optimization
   - Warn if recording exceeds size threshold
   - Auto-stop after max duration

4. **Testing & Documentation**
   - Unit tests for recorder.js
   - Integration tests for full flow
   - Update CLAUDE.md with recording feature docs
   - Add user guide section

## Technical Specifications

### MediaRecorder Configuration

```javascript
const options = {
  mimeType: 'video/webm;codecs=vp9',
  videoBitsPerSecond: 2500000 // 2.5 Mbps for medium quality
};
```

### Quality Presets

```javascript
const QUALITY_PRESETS = {
  low: {
    videoBitsPerSecond: 1000000,  // 1 Mbps
    width: 1280,
    height: 720
  },
  medium: {
    videoBitsPerSecond: 2500000,  // 2.5 Mbps
    width: 1920,
    height: 1080
  },
  high: {
    videoBitsPerSecond: 5000000,  // 5 Mbps
    width: 1920,
    height: 1080
  }
};
```

### Filename Pattern Variables

```javascript
const PATTERN_VARIABLES = {
  '{date}': 'YYYY-MM-DD',
  '{time}': 'HH-mm-ss',
  '{timestamp}': 'Unix timestamp',
  '{duration}': 'Recording duration',
  '{tab-title}': 'Current tab title (sanitized)'
};

// Default: "zeller-recording-{date}-{time}.webm"
// Example: "zeller-recording-2025-12-02-14-30-45.webm"
```

### Storage Schema

```javascript
{
  recordingSettings: {
    filenamePattern: "zeller-recording-{date}-{time}",
    videoQuality: "medium", // low|medium|high
    includeAudio: false,
    screenshotFormat: "png", // png|jpeg
    showCountdown: true,
    autoStopMinutes: 30, // 0 = no limit
    notifyOnComplete: true,
    keyboardShortcut: "Alt+Shift+R"
  }
}
```

## Known Limitations

### 1. **Save Path Restriction**
- **Limitation**: Cannot save to arbitrary filesystem paths
- **Reason**: Browser security model
- **Workaround**: Save to Downloads folder, user can configure Chrome's download location

### 2. **Format**
- **Limitation**: Native support only for WebM format
- **Reason**: Browser MediaRecorder API limitation
- **Workaround**: MP4 conversion requires FFmpeg.js (large library, complex)

### 3. **Audio**
- **Limitation**: Can only capture tab audio, not system/microphone audio
- **Reason**: Chrome API restrictions
- **Workaround**: None for system audio; microphone would require additional permission

### 4. **File Size**
- **Limitation**: Long recordings create large files (10 min ≈ 150-300 MB)
- **Reason**: Video compression limitations
- **Workaround**: Quality settings, auto-stop, file size warnings

### 5. **Multi-Tab**
- **Limitation**: Can only record one tab at a time
- **Reason**: tabCapture API limitation
- **Workaround**: Clear UI indication of which tab is being recorded

### 6. **Performance Impact**
- **Limitation**: Recording is CPU/memory intensive
- **Reason**: Video encoding in browser
- **Workaround**: Quality presets, warn user, monitor memory

### 7. **Page Navigation**
- **Limitation**: Overlay must be re-injected on navigation
- **Reason**: Content scripts don't persist across navigations
- **Workaround**: Listen for navigation events and re-inject

## Testing Strategy

### Unit Tests
- recorder.js functions (start, stop, pause, resume)
- Filename pattern generation
- Quality preset calculations
- Storage helpers

### Integration Tests
- Full recording flow (start → stop → save)
- Screenshot capture during recording
- Overlay injection and removal
- Settings persistence

### Manual Test Cases
1. Start recording → stop → verify file saved
2. Start recording → navigate → verify overlay persists
3. Take screenshots during recording → verify saved
4. Pause → resume → verify continuity
5. Close tab during recording → verify graceful handling
6. Test with different quality settings
7. Test filename patterns
8. Test auto-stop functionality

### Browser Compatibility
- Chrome (primary target)
- Edge (Chromium-based, should work)
- Other Chromium browsers

## Security & Privacy Considerations

1. **User Consent**
   - User explicitly clicks record button
   - Chrome shows native permission prompt for tabCapture
   - Clear visual indicator when recording

2. **Data Storage**
   - Videos saved locally to Downloads folder
   - No upload to external servers
   - No persistent storage of video data in extension

3. **Sensitive Information**
   - Warn users about recording sensitive data
   - Add disclaimer in settings
   - Consider adding watermark option

4. **Permissions**
   - Only request necessary permissions
   - Explain why each permission is needed
   - No access to other tabs except active tab

## Success Metrics

- Recording starts successfully within 2 seconds
- File saved correctly 100% of the time
- Overlay remains visible during navigation
- No memory leaks during long recordings
- File size within expected range for quality setting
- User can take screenshots without interrupting recording

## Future Considerations

### Potential Enhancements
- Cloud storage integration (Google Drive, Dropbox)
- Video compression optimization
- GIF generation from recording
- Video annotation tools
- Recording templates/presets
- Team sharing capabilities
- Integration with bug tracking tools (Jira, etc.)

### Technical Debt to Avoid
- Don't mix recording logic with UI logic
- Keep background service worker stateless where possible
- Proper cleanup of media streams
- Handle all async operations with error boundaries
- Document all Chrome API quirks

## References

- [Chrome TabCapture API](https://developer.chrome.com/docs/extensions/reference/tabCapture/)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Chrome Downloads API](https://developer.chrome.com/docs/extensions/reference/downloads/)
- [Chrome Notifications API](https://developer.chrome.com/docs/extensions/reference/notifications/)

## Timeline Estimate

- **Phase 1 (MVP)**: 2-3 days
- **Phase 2 (Screenshots & Controls)**: 1-2 days
- **Phase 3 (Polish)**: 1-2 days

**Total Estimated Time**: 4-7 days of development + testing
