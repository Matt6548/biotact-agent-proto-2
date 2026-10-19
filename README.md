# Martial Training Lab

A clean reboot of the old Biotact prototype into a local-first martial-arts training simulator.

## Current checkpoint — Stage 3
The working branch now has:
- MediaPipe camera tracking in a Web Worker,
- adaptive 5-second personal motion calibration,
- quality gating and punch-event detection,
- wrist-speed / trajectory metrics,
- deterministic virtual-airflow response,
- an interactive Three.js 3D candle,
- shader-driven flame deformation/instability,
- dynamic flame light and post-extinction smoke,
- local-only attempt history,
- GitHub CI for unit tests, production build and Playwright/Chromium smoke testing.

The 3D scene visualizes deterministic state from the training core. It does not substitute visual effects for measurement.

## Privacy / limitations
Camera frames stay in the browser processing path. MediaPipe WASM/model assets are currently downloaded from pinned external URLs on first use. Single-camera motion values remain estimates and are not presented as true impact force. Physical candle calibration is still pending.

## Branches
- Legacy Biotact: `legacy/biotact-ie-agent-2025`
- Active: `martial-training-lab`

## Run
Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
npm test
npx playwright install
npm run test:e2e
```
