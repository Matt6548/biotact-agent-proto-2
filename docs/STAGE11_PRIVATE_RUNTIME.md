# Stage 11 — Private Runtime

## Why this stage exists
The app previously processed camera frames locally, but loaded MediaPipe WASM/model assets from third-party URLs. In addition, current MediaPipe documentation states that Tasks APIs may send performance/utilization metrics even though input media itself remains on-device.

Therefore the product must not claim "no network" merely because inference is local.

## Architecture change

### Same-origin assets
`npm run prepare:vision`:
- copies the installed `@mediapipe/tasks-vision` WASM bundle into `public/mediapipe/wasm`,
- downloads the pinned Pose Landmarker Lite v1 task into `public/models`,
- records its SHA-256 and source URL.

Vite then includes those files in `dist`.

### Worker egress guard
Before dynamically importing MediaPipe, the pose worker wraps `fetch` and XHR:
- same-origin requests are allowed,
- cross-origin requests are rejected before network transmission,
- a privacy-block status is surfaced to the UI.

### Production network policy
Netlify headers set:
- `connect-src 'self'`,
- camera allowed only for self,
- microphone/geolocation disabled,
- frame embedding denied.

This provides a second boundary in deployed builds.

## What is and is not claimed
We can claim:
- camera frames are processed locally,
- model/WASM assets are served from the app origin after build,
- the pose worker rejects cross-origin fetch/XHR,
- production CSP forbids cross-origin connections.

We should not claim:
- that upstream MediaPipe contains no telemetry code,
- that every browser/network stack behavior is mathematically impossible,
- laboratory-grade privacy certification.

## Acceptance
A Playwright Chromium project uses a fake webcam, actually initializes Pose Landmarker, waits for `Pose model ready`, and asserts that no HTTP(S) request leaves the local app origin during initialization.
