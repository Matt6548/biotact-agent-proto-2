# Stage 25.1 — Briefing-aware camera QA budget

Stage 25 browser acceptance reached the complete mobile live-camera state and passed all functional assertions.

The only failure occurred while taking the final full-page QA screenshot at Playwright's default 30-second total test timeout. The mandatory briefing now runs before camera startup, so this visual acceptance path has more legitimate setup work than before.

Fix:
- only the camera/UI visual acceptance test receives a 45-second total budget;
- no assertion timeout is relaxed;
- no product requirement is removed;
- the separate device-readiness integration test keeps its own independent budget.

The captured failure evidence confirmed the mobile focus layout, framing guide, mini candle and Stop camera control were already rendered correctly before timeout.
