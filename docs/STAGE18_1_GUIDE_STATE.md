# Stage 18.1 — Readiness/guide state alignment

The first Stage 18 browser acceptance found a real state mismatch:

- Pose Landmarker had reported `ready`;
- the primary action correctly changed to `Step into frame`;
- but the camera card still carried `data-pose="loading"` until the first pose-result frame;
- therefore the new framing guide stayed hidden.

Fix: when the model becomes ready and the camera is active, pose state becomes `missing` immediately. Subsequent analysis frames refine it to `adjust`, `stabilizing` or `ready`.

This keeps the action text, setup message and visual framing affordance on the same state machine.
