# Martial Training Lab

A local-first martial-arts training game prototype rebooted from the old Biotact project.

## Current checkpoint — Stage 7 Focused Arena
The experience now has:
- one stateful primary path: Start training -> Calibrate -> Start round -> Repeat,
- MediaPipe pose tracking in a Web Worker,
- adaptive personal strike calibration,
- framing/visibility/FPS quality gate,
- wrist-speed and trajectory analysis,
- deterministic punch-event and flame/scoring core,
- interactive Three.js candle with shader flame, light and smoke,
- synchronized mobile mini-target inside the camera view,
- immediate strike-result feedback in the arena,
- concise coaching based only on measured signals,
- four training levels and five-strike rounds,
- local attempt history and raw tracking details moved out of the primary flow,
- reduced-motion handling,
- desktop/mobile Chromium acceptance and QA video/screenshots.

See `docs/UX_AUDIT_STAGE6.md` for the review that drove this checkpoint.

## Scientific guardrails
Camera-derived values are estimates, not laboratory force measurements. The flame model is physics-inspired, not CFD, and still needs real-world calibration.
