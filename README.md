# Martial Training Lab

A clean reboot of the old Biotact prototype into a local-first martial-arts training simulator.

## Safety / history
- Original Biotact IE-Agent: `legacy/biotact-ie-agent-2025`.
- Active development: `martial-training-lab`.
- First target: **Candle Strike**.

## Current checkpoint — Stage 2
The browser now supports:
- camera + MediaPipe Pose Landmarker in a Web Worker,
- upper-body overlay,
- framing / visibility / processed-FPS quality gate,
- left/right wrist-speed estimation,
- punch-event detection,
- peak speed + trajectory straightness,
- a 5-second personal calibration pass that adapts strike thresholds,
- deterministic flame response and scoring,
- local-only recent-attempt history.

Calibration asks for comfortable practice punches rather than maximum effort. The resulting thresholds are detector thresholds, not a medical or laboratory assessment.

## Privacy / runtime
Camera frames stay in the browser processing path. Stage 2 downloads pinned MediaPipe WASM/model assets on first use; offline bundling remains a later hardening step.

## Stack
- Vite 8.3.4
- Three.js 0.186.1 (Stage 3 renderer)
- MediaPipe Tasks Vision 1.1.1
- Playwright 1.64.1
- Node tests + GitHub CI

## Run
Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
npm test
```
