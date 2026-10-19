# Stage 10 — Field Test Foundation

## Goal
Make real-device tuning possible without collecting camera footage.

## Motion trace format
A field-test trace stores only:
- timestamp,
- processed FPS,
- eight normalized pose landmarks used by the quality gate,
- left/right wrist world coordinates used for speed.

It does **not** store:
- camera frames,
- video,
- audio,
- names,
- account identifiers,
- GPS/location.

Default cap: 900 frames (~30 seconds at 30 processed FPS).

## Jitter handling
A 3-frame median is applied to wrist speed, not to the pose itself. This is intentionally conservative:
- a single-frame spike is suppressed,
- a multi-frame real acceleration survives,
- extra latency stays around one processed frame rather than using aggressive smoothing.

This follows the general markerless-motion-capture tradeoff documented in real-time HPE literature: temporal filtering reduces jitter but can add latency and suppress fast movement.

## Field-test workflow
1. Start camera and wait for real Pose Model Ready.
2. Calibrate using 3–5 comfortable straight punches.
3. Open Field test data.
4. Start motion trace.
5. Perform 5–10 normal training strikes.
6. Stop and export JSON.
7. Use the JSON for deterministic replay/tuning; video is not required.

## Remaining validation
The trace pipeline itself can be unit-tested now. Detector thresholds still need actual traces from different devices/users before being called robust.
