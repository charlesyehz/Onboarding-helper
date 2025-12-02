/**
 * Screen Recording Engine (Manifest V3)
 * Uses offscreen document for getUserMedia access
 */

import { loadRecordingSettings } from "../shared/storage.js";

// Recorder state
const recorderState = {
  isRecording: false,
  isPaused: false,
  startTime: null,
  pausedDuration: 0,
  pauseStartTime: null,
  tabId: null,
  filenameTemplate: null,
  screenshotFormat: "png",
};

// Quality presets
const QUALITY_PRESETS = {
  low: {
    videoBitsPerSecond: 1000000, // 1 Mbps
  },
  medium: {
    videoBitsPerSecond: 2500000, // 2.5 Mbps
  },
  high: {
    videoBitsPerSecond: 5000000, // 5 Mbps
  },
};

let offscreenDocumentCreated = false;

/**
 * Ensure offscreen document exists
 */
async function ensureOffscreenDocument() {
  if (offscreenDocumentCreated) {
    return;
  }

  // Check if offscreen document already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });

  if (existingContexts.length > 0) {
    offscreenDocumentCreated = true;
    return;
  }

  // Create offscreen document
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["USER_MEDIA"],
    justification: "Recording screen for testing purposes",
  });

  offscreenDocumentCreated = true;
  console.log("[Recorder] Offscreen document created");
}

/**
 * Start recording a tab
 */
export async function startRecording(tabId) {
  if (recorderState.isRecording) {
    throw new Error("Recording already in progress");
  }

  console.log("[Recorder] Starting recording for tab:", tabId);

  try {
    // Reset state
    recorderState.isRecording = false;
    recorderState.isPaused = false;
    recorderState.startTime = null;
    recorderState.pausedDuration = 0;
    recorderState.pauseStartTime = null;
    recorderState.tabId = tabId;

    // Get recording settings
    const settings = await loadRecordingSettings();
    const quality = QUALITY_PRESETS[settings.videoQuality] || QUALITY_PRESETS.medium;
    recorderState.filenameTemplate = buildFilenameTemplate(settings.filenamePattern);
    recorderState.screenshotFormat = settings.screenshotFormat === "jpeg" ? "jpeg" : "png";

    // Determine MIME type based on codec selection
    const codec = settings.videoCodec || "vp9";
    let mimeType;
    switch (codec) {
      case "vp8":
        mimeType = "video/webm;codecs=vp8";
        break;
      case "h264":
        mimeType = "video/webm;codecs=h264";
        break;
      case "vp9":
      default:
        mimeType = "video/webm;codecs=vp9";
        break;
    }

    // Ensure offscreen document exists
    await ensureOffscreenDocument();

    // Get media stream ID from tab
    console.log("[Recorder] Getting media stream ID for tab:", tabId);
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId,
    });

    console.log("[Recorder] Got stream ID:", streamId);

    // Send start message to offscreen document
    const response = await chrome.runtime.sendMessage({
      type: "START_CAPTURE",
      streamId: streamId,
      options: {
        mimeType: mimeType,
        videoBitsPerSecond: quality.videoBitsPerSecond,
      },
    });

    if (!response.success) {
      throw new Error(response.error || "Failed to start capture");
    }

    // Update state
    recorderState.isRecording = true;
    recorderState.startTime = Date.now();

    // Notify popup and content script
    broadcastMessage({
      type: "RECORDING_STARTED",
      tabId: tabId,
      startTime: recorderState.startTime,
      isPaused: recorderState.isPaused,
      pausedDuration: recorderState.pausedDuration,
      pauseStartTime: recorderState.pauseStartTime,
    });

    console.log("[Recorder] Recording started successfully");
    return { success: true, startTime: recorderState.startTime };
  } catch (error) {
    console.error("[Recorder] Failed to start recording:", error);
    cleanupRecording();
    throw error;
  }
}

/**
 * Stop recording
 */
export async function stopRecording() {
  if (!recorderState.isRecording) {
    throw new Error("No recording in progress");
  }

  try {
    console.log("[Recorder] Stopping recording...");

    // Send stop message to offscreen document
    const response = await chrome.runtime.sendMessage({
      type: "STOP_CAPTURE",
    });

    if (!response.success) {
      throw new Error(response.error || "Failed to stop capture");
    }

    // State will be cleaned up when RECORDING_COMPLETE message is received
    return { success: true };
  } catch (error) {
    console.error("[Recorder] Failed to stop recording:", error);
    cleanupRecording();
    throw error;
  }
}

/**
 * Pause recording
 */
export async function pauseRecording() {
  if (!recorderState.isRecording || recorderState.isPaused) {
    throw new Error("Cannot pause: not recording or already paused");
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: "PAUSE_CAPTURE",
    });

    if (response.success) {
      recorderState.isPaused = true;
      recorderState.pauseStartTime = Date.now();

      broadcastMessage({
        type: "RECORDING_PAUSED",
        pauseTime: recorderState.pauseStartTime,
        pausedDuration: recorderState.pausedDuration,
      });

      console.log("[Recorder] Recording paused");
      return { success: true };
    }
  } catch (error) {
    console.error("[Recorder] Failed to pause recording:", error);
    throw error;
  }
}

/**
 * Resume recording
 */
export async function resumeRecording() {
  if (!recorderState.isRecording || !recorderState.isPaused) {
    throw new Error("Cannot resume: not paused");
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: "RESUME_CAPTURE",
    });

    if (response.success) {
      // Calculate paused duration
      const resumeTime = Date.now();
      if (recorderState.pauseStartTime) {
        recorderState.pausedDuration += resumeTime - recorderState.pauseStartTime;
        recorderState.pauseStartTime = null;
      }

      recorderState.isPaused = false;

      broadcastMessage({
        type: "RECORDING_RESUMED",
        resumeTime,
        pausedDuration: recorderState.pausedDuration,
      });

      console.log("[Recorder] Recording resumed");
      return { success: true };
    }
  } catch (error) {
    console.error("[Recorder] Failed to resume recording:", error);
    throw error;
  }
}

/**
 * Capture screenshot during recording
 */
export async function captureScreenshot() {
  if (!recorderState.isRecording) {
    throw new Error("No recording in progress");
  }

  try {
    const format = recorderState.screenshotFormat || "png";

    const response = await chrome.runtime.sendMessage({
      type: "CAPTURE_SCREENSHOT_FRAME",
      format,
    });

    if (!response?.success || !response?.dataUrl) {
      throw new Error(response?.error || "Failed to capture screenshot");
    }

    const duration = recorderState.startTime
      ? Date.now() - recorderState.startTime - recorderState.pausedDuration
      : 0;
    const baseFilename = await getBaseFilename(duration);
    const filename = `${baseFilename}-screenshot-${Date.now()}.${format}`;

    await chrome.downloads.download({
      url: response.dataUrl,
      filename: filename,
      saveAs: false,
      conflictAction: "uniquify",
    });

    broadcastMessage({
      type: "SCREENSHOT_CAPTURED",
    });

    console.log("[Recorder] Screenshot captured:", filename);
    return { success: true };
  } catch (error) {
    console.error("[Recorder] Failed to capture screenshot:", error);
    throw error;
  }
}

/**
 * Get current recorder state
 */
export function getRecorderState() {
  return {
    isRecording: recorderState.isRecording,
    isPaused: recorderState.isPaused,
    startTime: recorderState.startTime,
    tabId: recorderState.tabId,
    duration: recorderState.startTime
      ? Date.now() - recorderState.startTime - recorderState.pausedDuration
      : 0,
    pausedDuration: recorderState.pausedDuration,
    pauseStartTime: recorderState.pauseStartTime,
  };
}

/**
 * Handle recording completion from offscreen document
 */
export async function handleRecordingComplete(data, mimeType) {
  try {
    console.log("[Recorder] Handling recording completion, data size:", data.length);

    // Convert array back to Blob
    const blob = new Blob([new Uint8Array(data)], { type: mimeType });
    console.log("[Recorder] Created blob, size:", blob.size, "bytes");

    // Generate filename
    const duration = Date.now() - recorderState.startTime - recorderState.pausedDuration;
    const filename = await generateFilename(duration);

    // Download video
    await downloadFile(blob, filename);

    // Show notification
    const settings = await loadRecordingSettings();
    if (settings.notifyOnComplete) {
      showNotification(filename, formatDuration(duration));
    }

    // Notify success
    broadcastMessage({
      type: "RECORDING_STOPPED",
      filename: filename,
      duration: duration,
    });

    console.log("[Recorder] Recording saved successfully:", filename);
  } catch (error) {
    console.error("[Recorder] Failed to save recording:", error);
    broadcastMessage({
      type: "RECORDING_ERROR",
      error: error.message || "Failed to save recording",
    });
  } finally {
    cleanupRecording();
  }
}

/**
 * Generate filename from pattern
 */
async function generateFilename(duration) {
  const base = await getBaseFilename(duration);
  return `${base}.webm`;
}

/**
 * Format duration
 */
function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}-${minutes.toString().padStart(2, "0")}-${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}-${seconds.toString().padStart(2, "0")}`;
}

async function getBaseFilename(duration) {
  if (!recorderState.filenameTemplate) {
    const settings = await loadRecordingSettings();
    recorderState.filenameTemplate = buildFilenameTemplate(settings.filenamePattern);
  }

  const template = recorderState.filenameTemplate || "zeller-recording-{date}-{time}";
  const durationStr = formatDuration(duration);

  if (template.includes("{duration}")) {
    return template.replace(/\{duration\}/g, durationStr);
  }

  return template;
}

function buildFilenameTemplate(patternInput) {
  const pattern = patternInput || "zeller-recording-{date}-{time}";
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().split(" ")[0].replace(/:/g, "-");
  const timestamp = now.getTime();

  let template = pattern.replace(/\{date\}/g, date);
  template = template.replace(/\{time\}/g, time);
  template = template.replace(/\{timestamp\}/g, timestamp.toString());
  template = template.replace(/[<>:"/\\|?*]/g, "-");

  return template;
}

/**
 * Download file
 */
async function downloadFile(blob, filename) {
  // Convert blob to data URL (service workers can't use URL.createObjectURL)
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  const dataUrl = `data:${blob.type};base64,${base64}`;

  await chrome.downloads.download({
    url: dataUrl,
    filename: filename,
    saveAs: false,
    conflictAction: "uniquify",
  });

  console.log("[Recorder] Download started:", filename);
}

/**
 * Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Show notification
 */
function showNotification(filename, duration) {
  const message = `Recording saved (${duration})`;

  chrome.notifications.create(
    {
      type: "basic",
      iconUrl: chrome.runtime.getURL("images/zeller-logo.png"),
      title: "Recording Complete",
      message: message,
      priority: 2,
    },
    (notificationId) => {
      if (chrome.runtime.lastError) {
        console.error("[Recorder] Notification error:", chrome.runtime.lastError);
      } else {
        setTimeout(() => chrome.notifications.clear(notificationId), 5000);
      }
    }
  );
}

/**
 * Cleanup recording state
 */
function cleanupRecording() {
  recorderState.isRecording = false;
  recorderState.isPaused = false;
    recorderState.startTime = null;
    recorderState.pausedDuration = 0;
    recorderState.pauseStartTime = null;
    recorderState.tabId = null;
  recorderState.filenameTemplate = null;
  recorderState.screenshotFormat = "png";

  console.log("[Recorder] Cleanup complete");
}

/**
 * Broadcast message
 */
function broadcastMessage(message) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {});
    });
  });

  chrome.runtime.sendMessage(message).catch(() => {});
}
