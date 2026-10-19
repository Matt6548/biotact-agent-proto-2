# Stage 20 — Windows Launch Pack

## Goal
Make the current Martial Training Lab easy to open later without remembering npm commands.

## Files
### START_TRAINING.cmd
One-click local launcher:
1. verifies Node.js 20.19+;
2. installs exact locked dependencies only when missing;
3. prepares the pinned local MediaPipe WASM + Pose Landmarker model;
4. verifies the model SHA-256 and runtime files;
5. opens a dedicated Vite server window on `127.0.0.1:5173`;
6. waits until localhost responds;
7. opens the browser automatically.

Localhost is intentionally used because camera APIs are allowed in a trustworthy localhost context without publishing the app.

### RUN_SERVER.cmd
Small helper used by the launcher. Closing its window stops the local server.

### CHECK_TRAINING.cmd
Quick pre-demo verification:
- local model/runtime integrity,
- Node/unit tests,
- production build.

The full GitHub Actions pipeline remains the authoritative desktop/mobile/fake-camera acceptance suite.

## First-run network behavior
The first clean machine run can require internet for:
- `npm ci`,
- downloading the pinned MediaPipe Pose Landmarker Lite model.

After dependencies/model are present, runtime inference and model loading are local.

## Phone limitation
`127.0.0.1` is the PC itself. This launcher is ideal for PC camera testing. A real phone camera test still needs a trusted HTTPS URL (or a separately trusted local HTTPS setup); do not claim the LAN HTTP address is phone-camera ready.
