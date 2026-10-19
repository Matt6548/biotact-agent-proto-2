# Stage 21 — Device diagnostics

## Goal
Collect enough performance evidence to tune the real phone without turning the training surface into a technical dashboard.

## Tracking details now expose
- **Model** — MediaPipe delegate reported by the worker (GPU or CPU).
- **Inference** — time spent inside `detectForVideo` for the latest processed frame.
- **Busy skips/s** — video-frame opportunities from the last second that were not sent because the pose worker was still processing the previous frame.
- existing processed FPS and wrist-speed estimates remain.

## Interpretation
These are engineering diagnostics, not training scores.

- Higher inference latency usually means less headroom for pose processing.
- Busy skips indicate worker saturation, not camera failure.
- A zero busy-skip count is not required for correct training.
- Processed FPS remains the quality-gate input.

The app intentionally does not display these values in the main live surface; they stay behind `Tracking details`.

## Acceptance
The fake-camera browser test must initialize the actual self-hosted pose runtime and observe:
- GPU or CPU delegate,
- numeric inference milliseconds,
- numeric busy skips per second.

This proves the diagnostic path is fed by real worker results rather than placeholder values.
