# Martial Training Lab

A local-first martial-arts training game prototype rebooted from the old Biotact project.

## Current checkpoint — Stage 24.1
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
- numeric field traces contain landmarks/timestamps/FPS only, never raw camera frames/audio; motion traces are still treated as sensitive data and are never uploaded automatically;
- record → export → import → replay loop for reproducible tuning, with explicit in-tab trace clearing.

### Reliability
- stable-pose gate before calibration;
- calibration uses 5 seconds of valid pose time rather than wall-clock time;
- 3-frame median suppresses one-frame wrist-speed spikes;
- tracking loss is a hard boundary: detectors/speed history reset and recovery primes from zero;
- WebGL failure falls back to a CSS candle target;
- camera-permission failure returns to a retryable state;
- mobile uses a lazy mini-target and pauses the full renderer while live;
- mobile live focus mode hides nonessential page sections while the camera is active;
- a temporary framing guide helps acquire a stable pose and disappears once readiness is reached.

### QA
GitHub Actions runs:
- unit/regression tests,
- production build,
- desktop + mobile Chromium acceptance,
- fake-webcam Pose Landmarker initialization with no third-party runtime HTTP(S) requests,
- real worker diagnostics for delegate, inference latency and busy-frame skips,
- privacy-minimized device readiness report with aggregate FPS/inference performance only,
- WebGL/camera resilience checks,
- screenshots/videos as QA artifacts.

## Scientific guardrails
Camera-derived kinematics remain estimates, not laboratory force measurements. Personal normalization reduces session/device bias but is not a validated biomechanical effort measure. The virtual flame model is physics-inspired, not CFD, and still requires real physical-candle calibration and multi-device field traces before scientific accuracy claims.

## Easy Windows launch
On Windows, run `START_TRAINING.cmd`. It installs missing locked dependencies, prepares/verifies the local MediaPipe model, starts Vite on `http://127.0.0.1:5173`, waits for the server, and opens the browser.

Run `CHECK_TRAINING.cmd` for a quick unit/build/runtime check before a demo.

## Portable demo
Every successful CI run now publishes a `martial-training-windows-demo` artifact. It contains the already-built app, local MediaPipe model/WASM and a one-click `OPEN_DEMO.cmd` launcher. Runtime requires Python 3 only; no Node/npm is needed for the packaged demo.

## Deployment readiness
A separate Vercel configuration is now committed for a new Martial Training HTTPS deployment. It keeps the same production security headers as the verified local server. The existing GitHub Pages site remains the legacy Biotact app and is intentionally untouched.

## Main remaining blocker
Real HTTPS device testing with actual human movement is still required. Automated fake-camera tests prove runtime/privacy/recovery behavior, not punch-recognition quality in real lighting, clothing, camera angles, or devices.

See `docs/` for stage-by-stage evidence.
