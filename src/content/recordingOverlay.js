/**
 * Recording Overlay - Floating control UI displayed during recording
 */

let overlay = null;
let timerInterval = null;
let startTime = null;
let isPaused = false;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let overlayPosition = null;
let isMinimized = false;
let bodyReadyPromise = null;
let overlayPausedDuration = 0;
let overlayPauseStart = null;

function ensureBodyReady() {
  if (document.body) {
    return Promise.resolve();
  }

  if (!bodyReadyPromise) {
    bodyReadyPromise = new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        if (document.body) {
          observer.disconnect();
          resolve();
        }
      });

      observer.observe(document.documentElement || document, {
        childList: true,
        subtree: true,
      });

      document.addEventListener(
        "DOMContentLoaded",
        () => {
          observer.disconnect();
          resolve();
        },
        { once: true }
      );
    }).finally(() => {
      bodyReadyPromise = null;
    });
  }

  return bodyReadyPromise;
}

/**
 * Inject recording overlay into page
 */
export async function injectOverlay(recordingStartTime, options = {}) {
  await ensureBodyReady();

  console.log("[RecordingOverlay] injectOverlay called with startTime:", recordingStartTime);

  // Prevent duplicate overlays
  if (overlay && document.body.contains(overlay)) {
    console.log("[RecordingOverlay] Overlay already exists, skipping");
    return;
  }

  startTime = recordingStartTime;
  isPaused = Boolean(options.isPaused);
  overlayPausedDuration = Number(options.pausedDuration) || 0;
  overlayPauseStart = isPaused ? options.pauseStartTime || Date.now() : null;

  console.log("[RecordingOverlay] Creating overlay elements...");

  // Create overlay container
  overlay = document.createElement("div");
  overlay.id = "zeller-recording-overlay";
  overlay.setAttribute("data-zeller-extension", "true");

  // Header section
  const header = document.createElement("div");
  header.className = "recording-header";
  header.style.cursor = "move";

  const badge = document.createElement("span");
  badge.className = "recording-badge";
  badge.textContent = "REC";

  const timer = document.createElement("span");
  timer.className = "recording-timer";
  timer.id = "zeller-recording-timer";
  timer.textContent = "00:00";

  const minimizeBtn = document.createElement("button");
  minimizeBtn.className = "minimize-btn";
  minimizeBtn.title = "Minimize";
  minimizeBtn.setAttribute("aria-label", "Minimize overlay");
  minimizeBtn.textContent = "−";
  minimizeBtn.addEventListener("click", toggleMinimize);

  header.appendChild(badge);
  header.appendChild(timer);
  header.appendChild(minimizeBtn);

  // Controls section
  const controls = document.createElement("div");
  controls.className = "recording-controls";

  // Pause/Resume button
  const pauseBtn = document.createElement("button");
  pauseBtn.className = "icon-btn pause-btn";
  pauseBtn.title = "Pause";
  pauseBtn.setAttribute("aria-label", "Pause recording");
  pauseBtn.textContent = "⏸️";
  pauseBtn.addEventListener("click", handlePauseResume);

  // Stop button
  const stopBtn = document.createElement("button");
  stopBtn.className = "icon-btn stop-btn";
  stopBtn.title = "Stop Recording";
  stopBtn.setAttribute("aria-label", "Stop recording");
  stopBtn.textContent = "⏹️";
  stopBtn.addEventListener("click", handleStop);

  // Screenshot button
  const screenshotBtn = document.createElement("button");
  screenshotBtn.className = "icon-btn screenshot-btn";
  screenshotBtn.title = "Take Screenshot";
  screenshotBtn.setAttribute("aria-label", "Take screenshot");
  screenshotBtn.textContent = "📷";
  screenshotBtn.addEventListener("click", handleScreenshot);

  controls.appendChild(pauseBtn);
  controls.appendChild(stopBtn);
  controls.appendChild(screenshotBtn);

  // Assemble overlay
  overlay.appendChild(header);
  overlay.appendChild(controls);

  // Inject styles
  injectStyles();

  // Inject overlay into page
  document.body.appendChild(overlay);

  // Load and apply position
  loadOverlayPosition().then(() => {
    applyOverlayPosition();
  });

  // Setup drag handlers
  setupDragHandlers(header);

  // Fade in animation
  setTimeout(() => {
    overlay.classList.add("visible");
  }, 10);

  // Respect current pause state and start timer
  if (isPaused) {
    pauseBtn.textContent = "▶️";
    pauseBtn.title = "Resume";
    pauseBtn.setAttribute("aria-label", "Resume recording");
  }
  setTimerPausedClass(isPaused);
  startTimer();

  console.log("[RecordingOverlay] Overlay injected");
}

/**
 * Remove recording overlay from page
 */
export function removeOverlay() {
  if (!overlay) {
    return;
  }

  stopTimer();

  // Cleanup drag handlers
  if (overlay._dragCleanup) {
    overlay._dragCleanup();
  }

  // Fade out animation
  overlay.classList.remove("visible");

  setTimeout(() => {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    overlay = null;
    startTime = null;
    overlayPausedDuration = 0;
    overlayPauseStart = null;
    isPaused = false;
    isMinimized = false;
  }, 300);

  console.log("[RecordingOverlay] Overlay removed");
}

/**
 * Toggle minimize/maximize overlay
 */
function toggleMinimize(event) {
  if (event) {
    event.stopPropagation();
  }

  isMinimized = !isMinimized;

  const controls = overlay.querySelector(".recording-controls");
  const minimizeBtn = overlay.querySelector(".minimize-btn");

  if (isMinimized) {
    controls.style.display = "none";
    minimizeBtn.textContent = "⤢";
    minimizeBtn.title = "Expand";
    minimizeBtn.setAttribute("aria-label", "Expand overlay");
    overlay.classList.add("minimized");
  } else {
    controls.style.display = "flex";
    minimizeBtn.textContent = "−";
    minimizeBtn.title = "Minimize";
    minimizeBtn.setAttribute("aria-label", "Minimize overlay");
    overlay.classList.remove("minimized");
  }
}

/**
 * Handle pause/resume button click
 */
async function handlePauseResume(event) {
  event.stopPropagation();

  const btn = event.currentTarget;

  if (!isPaused) {
    // Pause recording
    try {
      const response = await chrome.runtime.sendMessage({
        type: "PAUSE_RECORDING",
      });

      if (response.success) {
        btn.textContent = "▶️";
        btn.title = "Resume";
        btn.setAttribute("aria-label", "Resume recording");
        setPausedState(Date.now());
      }
    } catch (error) {
      console.error("[RecordingOverlay] Pause error:", error);
    }
  } else {
    // Resume recording
    try {
      const response = await chrome.runtime.sendMessage({
        type: "RESUME_RECORDING",
      });

      if (response.success) {
        btn.textContent = "⏸️";
        btn.title = "Pause";
        btn.setAttribute("aria-label", "Pause recording");
        setResumedState(Date.now());
      }
    } catch (error) {
      console.error("[RecordingOverlay] Resume error:", error);
    }
  }
}

/**
 * Handle stop button click
 */
async function handleStop(event) {
  event.stopPropagation();

  const btn = event.currentTarget;
  btn.disabled = true;
  btn.style.opacity = "0.5";

  try {
    await chrome.runtime.sendMessage({
      type: "STOP_RECORDING",
    });

    // Overlay will be removed by RECORDING_STOPPED message
  } catch (error) {
    console.error("[RecordingOverlay] Stop error:", error);
    btn.disabled = false;
    btn.style.opacity = "1";
  }
}

/**
 * Handle screenshot button click
 */
async function handleScreenshot(event) {
  event.stopPropagation();

  const btn = event.currentTarget;

  // Flash animation
  btn.classList.add("flash");
  setTimeout(() => {
    btn.classList.remove("flash");
  }, 300);

  try {
    const response = await chrome.runtime.sendMessage({
      type: "CAPTURE_SCREENSHOT",
    });
  } catch (error) {
    console.error("[RecordingOverlay] Screenshot error:", error);
  }
}

/**
 * Start recording timer
 */
function startTimer() {
  stopTimer(); // Clear any existing timer
  updateTimerDisplay();

  if (isPaused) {
    return;
  }

  // Update every second
  timerInterval = setInterval(updateTimerDisplay, 1000);
}

/**
 * Stop recording timer
 */
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function getElapsedTime() {
  if (!startTime) {
    return 0;
  }
  const now = Date.now();
  const pausedPortion =
    overlayPausedDuration +
    (overlayPauseStart ? Math.max(0, now - overlayPauseStart) : 0);
  return Math.max(0, now - startTime - pausedPortion);
}

function updateTimerDisplay() {
  const timer = document.getElementById("zeller-recording-timer");
  if (!timer) {
    return;
  }
  timer.textContent = formatDuration(getElapsedTime());
}

function setTimerPausedClass(paused) {
  const timer = document.getElementById("zeller-recording-timer");
  if (timer) {
    if (paused) {
      timer.classList.add("paused");
    } else {
      timer.classList.remove("paused");
    }
  }
}

export function setPausedState(pauseTime = Date.now()) {
  if (!overlay || !startTime) {
    return;
  }
  isPaused = true;
  overlayPauseStart = pauseTime;
  setTimerPausedClass(true);
  stopTimer();
  updateTimerDisplay();
}

export function setResumedState(resumeTime = Date.now()) {
  if (!overlay || !startTime) {
    return;
  }

  if (overlayPauseStart) {
    overlayPausedDuration += Math.max(0, resumeTime - overlayPauseStart);
  }
  overlayPauseStart = null;
  isPaused = false;
  setTimerPausedClass(false);
  startTimer();
}

/**
 * Format duration as MM:SS or HH:MM:SS
 */
function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Inject overlay styles
 */
function injectStyles() {
  if (document.getElementById("zeller-recording-overlay-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "zeller-recording-overlay-styles";
  style.textContent = `
    #zeller-recording-overlay {
      position: fixed !important;
      background: rgba(15, 23, 42, 0.72) !important;
      border-radius: 8px !important;
      padding: 12px 16px !important;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.25) !important;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
      color: white !important;
      min-width: 240px !important;
      opacity: 0;
      transition: opacity 0.3s ease !important;
      user-select: none !important;
      backdrop-filter: blur(10px) !important;
    }

    #zeller-recording-overlay.visible {
      opacity: 1 !important;
    }

    #zeller-recording-overlay .recording-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin-bottom: 8px !important;
      gap: 8px !important;
    }

    #zeller-recording-overlay.minimized {
      min-width: 140px !important;
      padding: 10px 14px !important;
    }

    #zeller-recording-overlay.minimized .recording-header {
      margin-bottom: 0 !important;
    }

    #zeller-recording-overlay.minimized .recording-controls {
      display: none !important;
    }

    #zeller-recording-overlay .recording-badge {
      color: #ff4444 !important;
      font-weight: 600 !important;
      font-size: 14px !important;
      display: flex !important;
      align-items: center !important;
      gap: 4px !important;
    }

    #zeller-recording-overlay .recording-badge::before {
      content: '●' !important;
      animation: zellerPulse 1s ease-in-out infinite !important;
    }

    @keyframes zellerPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    #zeller-recording-overlay .recording-timer {
      font-family: 'Courier New', Courier, monospace !important;
      font-size: 14px !important;
      color: #e0e0e0 !important;
      opacity: 0.7 !important;
      min-width: 60px !important;
      text-align: right !important;
    }

    #zeller-recording-overlay .recording-timer.paused {
      color: #ffa500 !important;
      opacity: 0.8 !important;
    }

    #zeller-recording-overlay .recording-controls {
      display: flex !important;
      gap: 8px !important;
      justify-content: center !important;
    }

    #zeller-recording-overlay .icon-btn {
      background: rgba(255, 255, 255, 0.1) !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      border-radius: 6px !important;
      width: 36px !important;
      height: 36px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      font-size: 18px !important;
      transition: all 0.2s ease !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    #zeller-recording-overlay .icon-btn:hover {
      background: rgba(255, 255, 255, 0.2) !important;
      border-color: rgba(255, 255, 255, 0.4) !important;
      transform: translateY(-1px) !important;
    }

    #zeller-recording-overlay .icon-btn:active {
      transform: translateY(0) !important;
    }

    #zeller-recording-overlay .icon-btn:disabled {
      opacity: 0.4 !important;
      cursor: not-allowed !important;
    }

    #zeller-recording-overlay .stop-btn:hover {
      background: rgba(255, 68, 68, 0.2) !important;
      border-color: #ff4444 !important;
    }

    #zeller-recording-overlay .screenshot-btn.flash {
      animation: zellerCameraFlash 0.3s ease !important;
    }

    @keyframes zellerCameraFlash {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.2);
        background: rgba(255, 255, 255, 0.3) !important;
      }
    }

    #zeller-recording-overlay .minimize-btn {
      background: transparent !important;
      border: none !important;
      color: rgba(255, 255, 255, 0.6) !important;
      cursor: pointer !important;
      font-size: 20px !important;
      line-height: 1 !important;
      padding: 0 4px !important;
      margin: 0 !important;
      transition: color 0.2s ease !important;
    }

    #zeller-recording-overlay .minimize-btn:hover {
      color: rgba(255, 255, 255, 1) !important;
    }
  `;

  document.head.appendChild(style);
}

/**
 * Setup drag handlers for overlay
 */
function setupDragHandlers(dragHandle) {
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click

    isDragging = true;
    const rect = overlay.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;

    // Add grabbing cursor
    dragHandle.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    let x = e.clientX - dragOffset.x;
    let y = e.clientY - dragOffset.y;

    // Constrain to viewport
    const rect = overlay.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;

    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));

    // Update position
    overlay.style.left = `${x}px`;
    overlay.style.top = `${y}px`;
    overlay.style.right = "auto";

    overlayPosition = { x, y };

    e.preventDefault();
  };

  const handleMouseUp = () => {
    if (isDragging) {
      isDragging = false;
      dragHandle.style.cursor = "move";
      document.body.style.userSelect = "";

      // Save position
      saveOverlayPosition();
    }
  };

  // Add event listeners
  dragHandle.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);

  // Cleanup function would need to remove these listeners
  overlay._dragCleanup = () => {
    dragHandle.removeEventListener("mousedown", handleMouseDown);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };
}

/**
 * Load overlay position from storage
 */
async function loadOverlayPosition() {
  try {
    const result = await chrome.storage.local.get("recording-overlay-position");
    if (result["recording-overlay-position"]) {
      overlayPosition = result["recording-overlay-position"];
    } else {
      // Default position (top-right)
      overlayPosition = { x: window.innerWidth - 260, y: 20 };
    }
  } catch (error) {
    console.error("[RecordingOverlay] Failed to load position:", error);
    overlayPosition = { x: window.innerWidth - 260, y: 20 };
  }
}

/**
 * Apply overlay position
 */
function applyOverlayPosition() {
  if (!overlay || !overlayPosition) return;

  // Constrain to current viewport
  const rect = overlay.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width;
  const maxY = window.innerHeight - rect.height;

  let x = Math.max(0, Math.min(overlayPosition.x, maxX));
  let y = Math.max(0, Math.min(overlayPosition.y, maxY));

  overlay.style.left = `${x}px`;
  overlay.style.top = `${y}px`;
  overlay.style.right = "auto";
}

/**
 * Save overlay position to storage
 */
async function saveOverlayPosition() {
  if (!overlayPosition) return;

  try {
    await chrome.storage.local.set({
      "recording-overlay-position": overlayPosition,
    });
  } catch (error) {
    console.error("[RecordingOverlay] Failed to save position:", error);
  }
}
