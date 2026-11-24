# Third-party components

## MediaPipe Tasks Vision
- Package: `@mediapipe/tasks-vision@1.1.1`
- Upstream: https://github.com/google-ai-edge/mediapipe
- License: Apache License 2.0
- Runtime use: on-device pose landmark inference in a Web Worker.

## MediaPipe Pose Landmarker Lite
- Source model: https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task
- Model family: MediaPipe Pose Landmarker
- License basis: Google/MediaPipe documentation and maintainer clarification describe Pose Landmarker task bundles as Apache 2.0.
- The build records the downloaded model SHA-256 in `dist/models/pose_landmarker_lite.provenance.txt`.


## Experimental MediaPipe Hand Landmarker Full FP16 v1 (opt-in only)
- Source model: https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
- Runtime engine: already-declared `@mediapipe/tasks-vision@1.1.1`, no new package.
- License basis: Google MediaPipe repository Apache 2.0; re-check bundled model terms before release.
- Expected bytes: 7,819,105; SHA-256: `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1` (published independent provenance; the build verifies the downloaded bytes).
- Model is downloaded only by explicit `node scripts/prepare-hand-landmarker-assets.mjs` at build time, never from Google by a client. The runtime worker loads same-origin WASM/model, rejects external fetch/XHR and sends numeric landmarks to the local main thread.
- A single hand cannot establish a punch, physical force, depth, airflow or the identity of the person; this is an opt-in hand-approach experiment, not a proven fitness measurement.
- No external code, textures or video examples have been copied into the project. See `docs/CV_HAND_FORWARD_EXPERIMENT_20261123.md`.

## Privacy note
MediaPipe documentation current in 2026 states that task input data is processed on device, while Tasks APIs may send performance/utilization metrics to Google. This project therefore:
1. self-hosts the model and WASM assets,
2. dynamically imports the SDK only after installing a same-origin worker egress guard,
3. blocks cross-origin `fetch` and XHR from the pose worker,
4. sets production CSP `connect-src 'self'`.

See `docs/STAGE11_PRIVATE_RUNTIME.md`.
