# Stage 11.1 — Worker-compatible MediaPipe bootstrap

The first private-runtime camera test failed with `ModuleFactory not set.`.

This was not a model download failure. The MediaPipe Emscripten loader cannot use its normal loader-script injection path inside our module worker.

The current official `google-ai-edge/mediapipe-samples-web` worker implementation uses:
- `FilesetResolver.forVisionTasks(wasmPath, true)` for a worker-compatible fileset,
- a local model fetched by the application,
- `modelAssetBuffer` passed into `PoseLandmarker.createFromOptions`,
- module-worker Vite configuration.

Stage 11.1 mirrors that architecture while retaining:
- same-origin model/WASM,
- cross-origin fetch/XHR blocking in the worker,
- production CSP `connect-src 'self'`.

Vite dev/preview and Netlify also send COOP/COEP/CORP headers to keep worker/WASM behavior aligned with the official sample.
