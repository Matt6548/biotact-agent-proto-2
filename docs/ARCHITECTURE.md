# Architecture

```text
Camera / Simulation Input
        |
        v
Pose Worker (MediaPipe)
        |
        v
Quality Gate
(visibility, processed fps, framing)
        |
        v
Motion Extractor
(wrist speed + trajectory)
        |
        v
Strike Detector
(acceleration -> peak -> release)
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
- `src/core/`: pure deterministic logic.
- `src/vision/`: MediaPipe worker + camera transport.
- `src/features/`: training-session analysis/composition.
- `src/render/`: reserved for Three.js Stage 3 renderer.
- A future AI coach may explain deterministic metrics but may not fabricate measurements.

## Stage 1 choices
- Pose Landmarker Lite is used first for device reach.
- Pose inference is off the main thread.
- GPU is attempted first; worker falls back to CPU.
- The transport never sends camera frames to an application server.
- First trusted metrics are wrist speed trend, strike timing and trajectory straightness.
- The virtual candle distance used for a live strike is a simulation parameter, not camera-measured physical distance.

## Known Stage 1 limits
- Model/WASM assets are downloaded from pinned external URLs on first use.
- Single-camera world landmarks are estimates and require field validation.
- No impact-force claim.
- No real candle airflow calibration yet.
- Fast motion may need device-specific thresholds.

## Validation ladder
1. Pure unit tests.
2. Recorded motion fixtures.
3. Browser camera tests.
4. Desktop/mobile performance.
5. Real-video/manual labeling comparison.
6. Candle airflow calibration.
