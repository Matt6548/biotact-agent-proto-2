# Architecture

```text
Camera / Simulation Input
        |
        v
Quality Gate
(visibility, fps, framing)
        |
        v
Motion Extractor
(speed, trajectory, timing, alignment)
        |
        v
Strike Event Model
        |
        +------------------+
        |                  |
        v                  v
Flame Response Core    Technique Metrics
(deterministic)        (deterministic)
        |                  |
        +--------+---------+
                 v
              Scoring
                 |
                 v
           Feedback Layer
        outcome + 1–2 cues
                 |
                 v
           Session Progress
```

## Boundaries
- `src/core/`: pure deterministic logic; no camera, Three.js or AI dependency.
- `src/vision/`: MediaPipe + frame processing.
- `src/render/`: Three.js candle and training visuals.
- `src/features/`: training-session composition.
- Any later AI coach may explain deterministic metrics but may not fabricate measurements.

## Performance
MediaPipe video inference can block the main thread. Stage 1 should move inference off the rendering path where browser support permits it and allow frame skipping under load.

## Validation ladder
1. Unit tests for attenuation, extinction and scoring.
2. Recorded motion fixtures for strike detection.
3. Browser tests for complete training flow.
4. Device performance checks.
5. Real candle/video calibration before stronger physical-realism claims.
