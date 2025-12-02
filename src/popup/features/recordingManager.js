/**
 * Recording Manager - Handles recording UI in popup
 */

import { getActiveTab } from "../../shared/tabs.js";

let timerInterval = null;
let isRecording = false;

/**
 * Initialize recording manager
 */
export async function initRecordingManager() {
  const recordBtn = document.getElementById("record-btn");

  if (!recordBtn) {
    console.warn("[RecordingManager] Record button not found");
    return;
  }

  // Get current recording state
  const state = await getRecorderState();
  updateButtonState(state);

  // Record button click handler
  recordBtn.addEventListener("click", async () => {
    if (isRecording) {
      // Stop recording
      await handleStopRecording(recordBtn);
    } else {
      // Start recording
      await handleStartRecording(recordBtn);
    }
  });

  // Listen for recording state changes from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "RECORDING_STARTED") {
      const state = {
        isRecording: true,
        isPaused: false,
        startTime: message.startTime,
      };
      updateButtonState(state);
    } else if (message.type === "RECORDING_STOPPED") {
      const state = { isRecording: false, isPaused: false };
      updateButtonState(state);
    } else if (message.type === "RECORDING_ERROR") {
      alert(`Recording error: ${message.error}`);
      const state = { isRecording: false, isPaused: false };
      updateButtonState(state);
    }
  });
}

/**
 * Handle start recording
 */
async function handleStartRecording(button) {
  try {
    button.disabled = true;

    const tab = await getActiveTab();
    if (!tab || !tab.id) {
      throw new Error("No active tab found");
    }

    const response = await chrome.runtime.sendMessage({
      type: "START_RECORDING",
      tabId: tab.id,
    });

    if (!response.success) {
      throw new Error(response.error || "Failed to start recording");
    }

    chrome.tabs.sendMessage(
      tab.id,
      {
        type: "SHOW_RECORDING_OVERLAY",
        startTime: response.startTime,
        isPaused: false,
        pausedDuration: 0,
        pauseStartTime: null,
      },
      () => chrome.runtime.lastError
    );

    // UI will be updated by the message listener
  } catch (error) {
    console.error("[RecordingManager] Start error:", error);
    alert(`Failed to start recording: ${error.message}`);
    button.disabled = false;
  }
}

/**
 * Handle stop recording
 */
async function handleStopRecording(button) {
  try {
    button.disabled = true;

    const response = await chrome.runtime.sendMessage({
      type: "STOP_RECORDING",
    });

    if (!response.success) {
      throw new Error(response.error || "Failed to stop recording");
    }

    // UI will be updated by the message listener
  } catch (error) {
    console.error("[RecordingManager] Stop error:", error);
    alert(`Failed to stop recording: ${error.message}`);
    button.disabled = false;
  }
}

/**
 * Get current recorder state from background
 */
async function getRecorderState() {
  try {
    const state = await chrome.runtime.sendMessage({
      type: "GET_RECORDER_STATE",
    });
    return state || { isRecording: false };
  } catch (error) {
    console.error("[RecordingManager] Failed to get state:", error);
    return { isRecording: false };
  }
}

/**
 * Update button state based on recording state
 */
function updateButtonState(state) {
  const recordBtn = document.getElementById("record-btn");

  if (!recordBtn) {
    return;
  }

  if (state.isRecording) {
    // Recording active - show stop state
    isRecording = true;
    recordBtn.disabled = false;
    recordBtn.title = "Stop Recording";
    recordBtn.innerHTML = '<i class="fas fa-stop-circle" style="color: #ff4444"></i>';
    recordBtn.classList.add("recording-active");
  } else {
    // Not recording - show start state
    isRecording = false;
    recordBtn.disabled = false;
    recordBtn.title = "Start Recording";
    recordBtn.innerHTML = '<i class="fas fa-video"></i>';
    recordBtn.classList.remove("recording-active");
  }
}
