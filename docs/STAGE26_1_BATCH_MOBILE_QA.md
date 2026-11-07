# Stage 26.1 — Batch mobile live-focus QA

Repeated Stage 25/26 failures were traced to Playwright test overhead on slow CI runners, not product behavior.

While the real MediaPipe worker was active, each separate locator/visibility assertion could consume 1–4 seconds of wall time. The mobile test performed many sequential browser round-trips and reached the final screenshot near the total timeout.

The test now captures one DOM/computed-style snapshot for the mobile focus surface and performs the same assertions in-process:
- mini target canvas exists;
- arena status is sticky;
- hero/target/history/field-test/simulation are hidden;
- camera and framing guide are visible;
- ready status pill is hidden;
- Stop camera is nowrap and does not overflow.

No product requirement was removed or weakened. The change reduces browser round-trips while preserving the same acceptance conditions.
