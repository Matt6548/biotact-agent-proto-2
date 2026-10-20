# Stage 23 — Device readiness report

## Goal
Turn Stage 21 runtime telemetry into a small, privacy-minimized field diagnostic for real phone acceptance.

## What is measured
The report keeps only aggregate runtime performance:
- pose delegate: GPU / CPU;
- median and p10 processed FPS;
- median and p90 pose inference latency;
- median and maximum busy skips per second;
- sample count.

It deliberately excludes:
- body landmarks or motion coordinates;
- raw frames, video or audio;
- device name, user agent or persistent device identifier.

## Engineering status
The status is an engineering estimate, not a biomechanical, medical or fitness score.

- **Ready**: median processed FPS >= 20 and p90 inference <= 50 ms.
- **Constrained**: median FPS >= 15 and p90 inference <= 80 ms.
- **Limited**: below those bounds.
- **Collecting**: fewer than 30 valid performance samples.

The 20 FPS reference matches the application's existing tracking quality gate. The inference boundaries are product engineering budgets for this runtime, not scientific claims about human motion.

## UX
The main training surface is unchanged. Device readiness lives only inside `Tracking details`.

After enough live samples, `Field test data` enables **Export device report**. The JSON can be shared separately from a sensitive motion trace.

## Acceptance
Unit tests cover percentile math, status classification and privacy fields. Fake-camera browser acceptance requires a non-placeholder readiness status and an enabled report-export control.
