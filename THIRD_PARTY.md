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

## Privacy note
MediaPipe documentation current in 2026 states that task input data is processed on device, while Tasks APIs may send performance/utilization metrics to Google. This project therefore:
1. self-hosts the model and WASM assets,
2. dynamically imports the SDK only after installing a same-origin worker egress guard,
3. blocks cross-origin `fetch` and XHR from the pose worker,
4. sets production CSP `connect-src 'self'`.

See `docs/STAGE11_PRIVATE_RUNTIME.md`.
