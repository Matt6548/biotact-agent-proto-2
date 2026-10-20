# Stage 24.1 — Camera acceptance time budget

Stage 24 deployment configuration checks passed, but the combined fake-camera browser test exhausted Playwright's default 30-second **total test timeout** after waiting for real MediaPipe initialization and the device-readiness observation window.

The product had already reached a real readiness state. The timeout happened later while evaluating the existing Stop camera wrapping assertion.

The camera acceptance test now has a 45-second total budget. Individual assertions and product requirements are unchanged:
- self-hosted Pose runtime must initialize;
- inference diagnostics must arrive;
- readiness must leave Collecting;
- device report control must enable;
- no external runtime HTTP(S) requests;
- desktop/mobile renderer/focus assertions still run.

This is a CI timing correction, not a relaxation of product acceptance.
