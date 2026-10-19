import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

const WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let landmarker = null;
let processing = false;

async function makeLandmarker(vision, delegate) {
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.55,
    minPosePresenceConfidence: 0.55,
    minTrackingConfidence: 0.55,
    outputSegmentationMasks: false,
  });
}

async function init() {
  const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
  try {
    landmarker = await makeLandmarker(vision, "GPU");
    self.postMessage({ type: "ready", delegate: "GPU" });
  } catch (gpuError) {
    landmarker = await makeLandmarker(vision, "CPU");
    self.postMessage({
      type: "ready",
      delegate: "CPU",
      fallback: String(gpuError?.message || gpuError),
    });
  }
}

self.onmessage = async (event) => {
  if (event.data?.type === "init") {
    try {
      await init();
    } catch (error) {
      self.postMessage({ type: "error", error: String(error?.message || error) });
    }
    return;
  }

  if (event.data?.type !== "frame") return;
  const bitmap = event.data.bitmap;

  if (!landmarker || processing) {
    bitmap?.close?.();
    return;
  }

  processing = true;
  const started = performance.now();
  try {
    const result = landmarker.detectForVideo(bitmap, event.data.timestampMs);
    self.postMessage({
      type: "result",
      timestampMs: event.data.timestampMs,
      inferenceMs: performance.now() - started,
      landmarks: result.landmarks?.[0] ?? null,
      worldLandmarks: result.worldLandmarks?.[0] ?? null,
    });
  } catch (error) {
    self.postMessage({ type: "detect-error", error: String(error?.message || error) });
  } finally {
    bitmap?.close?.();
    processing = false;
  }
};
