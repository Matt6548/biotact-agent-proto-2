# Martial Training Lab

A local-first martial-arts training simulator rebooted from the old Biotact prototype.

## Current checkpoint — Stage 5
Working features:
- MediaPipe pose tracking in a Web Worker,
- adaptive personal strike calibration,
- framing/visibility/processed-FPS quality gate,
- left/right wrist-speed and trajectory analysis,
- punch-event state machine,
- deterministic flame-response/scoring core,
- interactive Three.js candle with shader flame, dynamic light and smoke,
- local-only attempt history,
- deterministic coaching limited to measured signals,
- four-step training progression,
- CI unit/build gates,
- desktop + Pixel-class mobile Chromium acceptance,
- visual QA screenshots saved as a GitHub Actions artifact.

## Scientific guardrails
- Camera values are estimates, not laboratory force measurements.
- Coaching does not invent faults the current model does not measure.
- Flame behavior is physics-inspired, not CFD; physical calibration remains pending.
- Training-level distance is virtual, not camera-measured fist-to-candle distance.

## Branches
- Legacy: `legacy/biotact-ie-agent-2025`
- Active: `martial-training-lab`

See `docs/QA.md` for acceptance evidence and remaining manual gates.
