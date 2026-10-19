# Stage 22 — Portable Windows demo

## Goal
Make visual/device acceptance possible without Git, VS Code, Node.js, npm, Netlify or TinyFish.

The CI now produces a `martial-training-windows-demo` artifact after the full browser acceptance suite succeeds.

## Artifact contents
- prebuilt `dist/` including the self-hosted Pose Landmarker model and MediaPipe WASM;
- `OPEN_DEMO.cmd` — one-click launcher;
- `RUN_DEMO_SERVER.cmd` — local server window;
- `PORTABLE_SERVER.py` — stdlib-only local HTTP server with the production security headers;
- `README_PORTABLE.txt`.

## Why not plain `python -m http.server`
The application uses a worker + WASM and intentionally relies on isolation/security headers. The bundled server mirrors the important production headers:
- CSP with same-origin runtime traffic;
- camera-only Permissions Policy;
- COOP/COEP/CORP;
- no-sniff/frame deny/referrer policy.

The server binds only to `127.0.0.1`.

## CI acceptance
CI starts the portable server against the freshly built `dist` and verifies:
- HTTP 200;
- CSP exists;
- COOP = same-origin;
- COEP = require-corp;
- Permissions-Policy includes camera=(self).

The existing Playwright suite remains the behavioral acceptance gate before the portable artifact is uploaded.
