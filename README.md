# Martial Training Lab

A local-first martial-arts training simulator rebooted from the old Biotact prototype.

## Current checkpoint — Stage 4
Working features:
- MediaPipe pose tracking in a Web Worker,
- adaptive personal strike calibration,
- quality gate for framing/visibility/processed FPS,
- left/right wrist-speed and trajectory analysis,
- punch-event state machine,
- deterministic flame-response/scoring core,
- interactive Three.js candle with animated shader flame, lighting and smoke,
- local-only attempt history,
- deterministic coaching limited to measured signals,
- four-step training progression that advances after repeatable successful attempts,
- GitHub CI: unit tests + production build + real Chromium/Playwright smoke test.

## Scientific guardrails
- Camera values are estimates, not laboratory force measurements.
- Coaching does not invent shoulder/hip faults that the current model does not explicitly measure.
- The flame is physics-inspired but not CFD and still needs real-world candle calibration.
- The level distance is a virtual challenge parameter, not camera-measured fist-to-candle distance.

## Branches
- Legacy: `legacy/biotact-ie-agent-2025`
- Active: `martial-training-lab`
