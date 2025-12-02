/**
 * Offscreen Document for Screen Recording
 * This document has access to DOM APIs like getUserMedia that service workers don't have
 */

let mediaRecorder = null;
let recordedChunks = [];
let currentStream = null;
let videoElement = null;
let canvasElement = null;
let videoReadyPromise = null;

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Offscreen] Received message:", message.type);

  if (message.type === "START_CAPTURE") {
    startCapture(message.streamId, message.options)
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((error) => {
        console.error("[Offscreen] Capture failed:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Async response
  }

  if (message.type === "STOP_CAPTURE") {
    stopCapture()
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((error) => {
        console.error("[Offscreen] Stop failed:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Async response
  }

  if (message.type === "PAUSE_CAPTURE") {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.pause();
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: "Not recording" });
    }
    return true;
  }

  if (message.type === "RESUME_CAPTURE") {
    if (mediaRecorder && mediaRecorder.state === "paused") {
      mediaRecorder.resume();
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: "Not paused" });
    }
    return true;
  }

  if (message.type === "CAPTURE_SCREENSHOT_FRAME") {
    captureStreamFrame(message.format)
      .then((dataUrl) => sendResponse({ success: true, dataUrl }))
      .catch((error) => {
        console.error("[Offscreen] Screenshot failed:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

/**
 * Start capturing with the given stream ID
 */
async function startCapture(streamId, options) {
  console.log("[Offscreen] Starting capture with streamId:", streamId);

  try {
    // Get the media stream using the stream ID
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
      video: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
    });

    console.log("[Offscreen] Got media stream:", stream);
    currentStream = stream;
    await ensureVideoElement(stream);

    // Create MediaRecorder
    const mimeType = options.mimeType || "video/webm;codecs=vp9";
    const mediaRecorderOptions = {
      mimeType: MediaRecorder.isTypeSupported(mimeType)
        ? mimeType
        : "video/webm",
      videoBitsPerSecond: options.videoBitsPerSecond || 2500000,
    };

    mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);
    recordedChunks = [];

    // Set up event handlers
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      console.log("[Offscreen] MediaRecorder stopped, chunks:", recordedChunks.length);

      // Stop all tracks
      stream.getTracks().forEach((track) => track.stop());
      cleanupStreamResources();

      // Send chunks back to service worker
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const arrayBuffer = await blob.arrayBuffer();

      chrome.runtime.sendMessage({
        type: "RECORDING_COMPLETE",
        data: Array.from(new Uint8Array(arrayBuffer)),
        mimeType: blob.type,
      });

      // Clean up
      mediaRecorder = null;
      recordedChunks = [];
    };

    mediaRecorder.onerror = (event) => {
      console.error("[Offscreen] MediaRecorder error:", event.error);
      chrome.runtime.sendMessage({
        type: "RECORDING_ERROR",
        error: event.error?.message || "Recording error",
      });
    };

    // Start recording (1 second chunks)
    mediaRecorder.start(1000);

    console.log("[Offscreen] Recording started");
    return { success: true };
  } catch (error) {
    console.error("[Offscreen] Failed to start capture:", error);
    throw error;
  }
}

/**
 * Stop capturing
 */
async function stopCapture() {
  console.log("[Offscreen] Stopping capture");

  if (!mediaRecorder) {
    throw new Error("No active recording");
  }

  if (mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }

  return { success: true };
}

async function ensureVideoElement(stream) {
  if (!videoElement) {
    videoElement = document.createElement("video");
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.style.display = "none";
    document.body.appendChild(videoElement);
  }

  videoElement.srcObject = stream;

  if (
    videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    !videoElement.paused
  ) {
    return;
  }

  videoReadyPromise =
    videoReadyPromise ||
    new Promise((resolve) => {
      const cleanup = () => {
        videoElement.removeEventListener("loadeddata", handleLoaded);
        videoElement.removeEventListener("error", handleError);
      };

      const handleLoaded = () => {
        cleanup();
        videoElement.play().catch(() => {});
        resolve();
      };

      const handleError = () => {
        cleanup();
        resolve();
      };

      videoElement.addEventListener("loadeddata", handleLoaded);
      videoElement.addEventListener("error", handleError);
      videoElement.play().catch(() => {});
    });

  await videoReadyPromise;
}

async function captureStreamFrame(format) {
  if (!currentStream) {
    throw new Error("No active recording");
  }

  const videoTrack = currentStream.getVideoTracks()[0];
  if (!videoTrack) {
    throw new Error("Missing video track");
  }

  await (videoReadyPromise || ensureVideoElement(currentStream));

  if (!canvasElement) {
    canvasElement = document.createElement("canvas");
  }

  const width = videoElement?.videoWidth || videoTrack.getSettings().width || 1280;
  const height =
    videoElement?.videoHeight || videoTrack.getSettings().height || 720;

  canvasElement.width = width;
  canvasElement.height = height;

  const ctx = canvasElement.getContext("2d");
  ctx.drawImage(videoElement, 0, 0, width, height);

  const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
  const quality = format === "jpeg" ? 0.9 : undefined;
  return canvasElement.toDataURL(mimeType, quality);
}

function cleanupStreamResources() {
  currentStream = null;
  videoReadyPromise = null;
  if (videoElement) {
    videoElement.pause();
    videoElement.srcObject = null;
  }
  canvasElement = null;
}

console.log("[Offscreen] Document loaded and ready");
