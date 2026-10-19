# Stage 21.1 — Pose readiness race fix

Stage 21 diagnostics exposed a real startup race.

## Failure
The camera loop started immediately after creating the worker. A video frame could be posted while the worker was still loading MediaPipe / the Pose Landmarker. The worker correctly discarded frames while no landmarker existed, but the tracker had already set `frameBusy=true`. Because no result came back for that discarded frame, the tracker could remain permanently busy and never send another frame.

Symptoms:
- `Pose model ready · GPU/CPU` appeared;
- framing stayed at “step into frame”;
- inference diagnostics stayed blank;
- no subsequent pose results were processed.

## Fix
`PoseTracker` now has an explicit `modelReady` state.

Frames are sent only after the worker emits its `ready` message. The state resets on stop and initialization failure.

This fixes the state machine instead of weakening the Stage 21 browser assertion.

## Regression
The fake-webcam acceptance test still requires:
- model backend GPU/CPU,
- actual numeric inference latency,
- numeric busy-skips/second.

That makes the startup race observable if it ever returns.
