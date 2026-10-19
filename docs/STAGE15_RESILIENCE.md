# Stage 15 — Graceful capability failures

## Review finding
The deterministic training core does not actually require WebGL, but a failed Three.js WebGL context could previously prevent the whole app from booting.

## WebGL fallback
`createCandleTarget()` now attempts the normal Three.js target first. If WebGL construction fails, it swaps in a lightweight CSS target implementing the same runtime methods:
- `setState`,
- `triggerImpulse`,
- `reset`,
- `setActive`,
- `dispose`.

The fallback still visualizes airflow, flame deflection/extinction and smoke. It is intentionally less rich and is not used when WebGL works.

## Camera permission recovery
A browser test explicitly rejects `getUserMedia`. The app must:
- explain that camera permission/device is unavailable,
- restore the primary action to a retryable `Start training` state,
- keep the rest of the application usable.

## Acceptance
A dedicated resilience Playwright project disables WebGL through a pre-page canvas hook, completes a simulated strike using the fallback target, and separately verifies camera-permission recovery.
