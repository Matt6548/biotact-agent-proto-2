# Stage 13 — Pose readiness and valid-time calibration

## Review finding
The previous flow allowed calibration to begin as soon as the Pose Landmarker model was ready. That did not prove a person was actually framed well enough. Once the 5-second timer started, wall-clock time continued even when pose quality dropped.

On a real phone this could produce a failed or noisy personal detector profile simply because the trainee stepped into position too late or briefly left the frame.

## New readiness gate
Before calibration:
- the model must be ready;
- the pose quality gate must pass for 6 consecutive processed frames;
- until then the main action reads **Step into frame** and stays disabled.

This absorbs short landmark/FPS startup instability before calibration is offered.

## Valid-time calibration
Calibration now needs 5 seconds of **valid pose time**, not 5 seconds of wall-clock time.
- valid frames advance the clock;
- lost/poor framing pauses it;
- returning to a valid pose resumes it;
- a single large timestamp gap can contribute at most 100 ms.

Calibration samples are also collected only when the full quality gate passes.

## Acceptance
Unit tests cover stable readiness, pause/resume behavior and protection against large frame gaps. Fake-camera privacy tests intentionally have no person, so after model initialization they must now stop at the safe **Step into frame** state rather than falsely offering calibration.
