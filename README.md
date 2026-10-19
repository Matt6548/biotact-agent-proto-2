# Martial Training Lab

A local-first martial-arts training game prototype rebooted from the old Biotact project.

## Current checkpoint — Stage 8 Round Integrity + Airflow Feedback
The training loop now includes:
- one stateful setup path: Start training -> Calibrate -> Start round -> Repeat,
- a fixed goal for all five strikes in a round,
- level advancement only after the round result (3/5 target hits),
- visible 3D airflow-pulse particles before the flame response,
- optional mobile haptic feedback for real detected strikes,
- MediaPipe pose tracking in a Web Worker,
- adaptive personal strike calibration,
- deterministic motion/flame/scoring core,
- full + synchronized mobile mini Three.js targets,
- immediate result feedback and measured coaching,
- local history, reduced-motion handling, desktop/mobile Chromium QA and videos.

Scientific guardrails remain unchanged: camera motion values are estimates, not true impact force; the flame model is physics-inspired and still requires physical calibration.
