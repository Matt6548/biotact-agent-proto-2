# Stage 9 — camera readiness gate

## Problem
`PoseTracker.start()` can return after the camera stream is available but before the MediaPipe worker has finished loading the WASM/model. On slower devices this allowed the user to start calibration while no pose results were available.

## Change
The UI now distinguishes:
1. camera permission/stream started,
2. motion model loading,
3. Pose Landmarker ready,
4. calibration ready.

The primary action is disabled with `Loading motion model…` until the worker sends its real `ready` state.

If model initialization fails, the setup message explicitly asks the user to stop camera and retry instead of allowing a guaranteed failed calibration.

## Why this matters
This removes a race condition that is likely to appear on phones and slower networks even when desktop automation is green.
