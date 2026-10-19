# Martial Training Lab

A local-first martial-arts training game prototype rebooted from the old Biotact project.

## Current checkpoint — Stage 16
The active branch is `martial-training-lab`.

### Training loop
- one stateful path: Start training → stable pose → personal calibration → 5-strike round → next/repeat;
- four fixed training levels with round-level goals;
- advancement requires 3/5 target hits;
- deterministic candle/flame scoring and concise measured coaching;
- personal-reference strike intensity rather than raw camera speed for gameplay;
- local recent-attempt history.

### Vision / privacy
- MediaPipe Pose Landmarker runs in a Web Worker;
- model + WASM are self-hosted from the app origin;
- worker blocks cross-origin fetch/XHR;
- production CSP uses `connect-src 'self'`;
- numeric field traces contain landmarks/timestamps/FPS only, never camera frames/audio;
- record → export → import → replay loop for reproducible tuning.

### Reliability
- stable-pose gate before calibration;
- calibration uses 5 seconds of valid pose time rather than wall-clock time;
- 3-frame median suppresses one-frame wrist-speed spikes;
- tracking loss is a hard boundary: detectors/speed history reset and recovery primes from zero;
- WebGL failure falls back to a CSS candle target;
- camera-permission failure returns to a retryable state;
- mobile uses a lazy mini-target and pauses the full renderer while live.

### QA
GitHub Actions runs:
- unit/regression tests,
- production build,
- desktop + mobile Chromium acceptance,
- fake-webcam Pose Landmarker initialization with no third-party runtime HTTP(S) requests,
- WebGL/camera resilience checks,
- screenshots/videos as QA artifacts.

## Scientific guardrails
Camera-derived kinematics remain estimates, not laboratory force measurements. Personal normalization reduces session/device bias but is not a validated biomechanical effort measure. The virtual flame model is physics-inspired, not CFD, and still requires real physical-candle calibration and multi-device field traces before scientific accuracy claims.

## Main remaining blocker
Real HTTPS device testing with actual human movement is still required. Automated fake-camera tests prove runtime/privacy/recovery behavior, not punch-recognition quality in real lighting, clothing, camera angles, or devices.

See `docs/` for stage-by-stage evidence.
