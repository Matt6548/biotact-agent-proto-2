# Stage 18 — Framing guidance and live cleanup

## Visual review findings from Stage 17
The focused mobile surface worked, but:
1. the ready model status duplicated the setup text;
2. Stop camera wrapped awkwardly on a narrow viewport;
3. Step into frame had no spatial visual cue.

## Changes
- A subtle body-framing guide appears only while the live camera lacks a stable valid pose.
- The guide asks the trainee to keep shoulders and hips inside the region.
- It disappears after the stable-pose gate passes.
- On mobile live mode, the redundant `Pose model ready` pill is hidden once ready; loading/error states remain available.
- Stop camera is forced to a compact single-line control.

The guide is not used to measure body dimensions and makes no biomechanical claim. It is only a placement aid for the existing quality gate.

## Acceptance
Fake-camera mobile QA verifies:
- framing guide visible while no person is detected,
- the ready status pill does not duplicate live UI,
- Stop camera does not wrap,
- mobile live screenshot is saved for visual review.
