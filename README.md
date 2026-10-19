# Martial Training Lab

A clean reboot of the old Biotact prototype into a local-first martial-arts training simulator.

## Safety / history
- Original Biotact IE-Agent is preserved in `legacy/biotact-ie-agent-2025`.
- Active development: `martial-training-lab`.
- First training target: **Candle Strike** — a controlled non-contact strike affecting a virtual flame.

## Current checkpoint — Stage 1
The browser can:
- request the camera,
- run MediaPipe Pose Landmarker in a Web Worker,
- draw the upper-body skeleton,
- gate bad framing / visibility / low processed FPS,
- estimate left/right wrist speed from MediaPipe world landmarks,
- detect a punch-like acceleration/release event,
- measure peak speed and trajectory straightness,
- feed a valid strike into the deterministic virtual-candle model.

The camera path does not claim laboratory-grade force measurement.

## External runtime assets
Stage 1 downloads MediaPipe WASM and the Pose Landmarker Lite model on first use. Camera frames are processed locally in the browser. A later offline-hardening stage will bundle these assets with the app.

## Stack
- Vite 8.3.4
- Three.js 0.186.1 (reserved for Stage 3 renderer)
- MediaPipe Tasks Vision 1.1.1
- Node test runner
- Playwright 1.64.1

## Run
Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
npm test
```

Browser regression:
```bash
npx playwright install
npm run test:e2e
```
