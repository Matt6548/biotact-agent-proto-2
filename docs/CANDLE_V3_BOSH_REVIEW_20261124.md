# BOSH — Candle V3 visual acceptance, 2026-11-24

Baseline PR #9: f535407e3e3b3da2555670b99b00fbd345795cc4; CI 45353655560: 121 unit tests, 12 browser passed, 2 skipped. Vercel V2 preview remains intact.

## OGON PR #11
Source: ec046b1a7b9fb487aef691b93373b63167f746fd; scoped CI 45355631472: 125/125 Node tests, build, 2/2 actual WebGL tests PASS. Artifact 14902582067 reviewed by BOSH: desktop/mobile framing, steady flame, side response, extinguished wick/smoke, manual relight. Appearance improved but still stylized; no claim of photographic realism. At rest 11 draw calls, 5852 triangles, 1 texture, no horizontal overflow at 360/390/1366/1440. Headless rAF sample 34.9–60 FPS (no camera, not real Redmi FPS). During simulated side response 12 draw calls; after extinction 9; relight 11. Keep 46 degree framing and existing privacy configuration.

This candidate imports exactly the reviewed seven OGON files, plus this report. Full combined CI and independent visual evidence required before a new isolated Vercel Preview.

## CV PR #10 — HOLD
Source e2af11e30e9d63f704eb1c67fae488a5e7f7295e; CI 45356382766: 131 unit tests, default build, pinned model and fixture PASS. Actual hand WASM CPU case PASS; auto delegate case FAIL with egress-blocked https://odml.pa.googleapis.com. Existing Pose browser regression 6 passed/1 skipped. Prior run 45355596709 demonstrated actual model on public still-image and transformed-image fixture, not live human camera: cloud CPU median 57.40 ms; GPU median 690.70 ms. Do not infer phone latency.

Do not import PR #10 until the external-request attempt and switch lifecycle are resolved. Preserve strict same-origin CSP, worker egress guard and stop-on-error semantics. Do not allowlist the external origin or suppress failure. Need true browser-model initialization and inference across the selected delegate policy, with zero external network requests and no attempted external egress. If automatic switching cannot be made local and reliable, explicitly isolate or disable it, with tested CPU-only experimental route and preserved Pose path. Real human hand detection, false positives, latency, battery and heat remain unverified.

No production merge or promotion. User screenshots must stay private. One candle, free exercise, no mandatory levels or registration.
