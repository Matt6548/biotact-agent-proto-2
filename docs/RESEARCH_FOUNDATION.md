# Research foundation — 2026-10-18

This file separates evidence, engineering inference and future validation.

## Camera motion analysis
MediaPipe Pose Landmarker for Web provides 33 body landmarks plus world-coordinate landmarks. Its video inference calls are synchronous and can block the browser main thread, so inference and rendering should be decoupled.
https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js

Lahkar et al. (2022), *Accuracy of a markerless motion capture system in estimating upper extremity kinematics during boxing*, reported strong agreement for segment-velocity magnitude in its validated multi-camera setup, while several elbow/wrist and internal/external-rotation angles were less reliable.
https://doi.org/10.3389/fspor.2022.939980

Duvelek et al. (2026), *Validation of Pose Estimation Models for Automated Kickboxing Technique Analysis Using 2TRAX3*, supports approximate feedback for selected technique characteristics while showing that many individual measures still have broad limits of agreement.

### V1 implication
Prioritize speed trends, trajectory, timing, coordination proxies, distance/alignment and confidence gates. Do not label camera-derived values as true impact force unless independently calibrated and validated.

## Flame response
Combustion research on lift-off/blow-off supports a qualitative sequence where greater effective flow/strain relative to flame stability drives deformation, instability and extinction. Candle-specific thresholds are not provided by jet-flame work.

Palacios, Bradley & Hu (2016), *Lift-Off and Blow-Off of Methane and Propane Subsonic Vertical Jet Flames, With and Without Diluent Air*.
https://doi.org/10.1016/j.fuel.2016.06.073

### V1 implication
Use a deterministic approximation:
air impulse -> effective stress -> tilt/deformation -> instability -> extinction.
Distance and alignment attenuate impulse. Never present the model as CFD.

## Feedback and learning
Augmented-feedback research supports task-linked feedback but does not justify constant correction. Separate knowledge of results (what happened) from knowledge of performance (how the movement was executed).

Moinuddin, Goel & Sethi (2021), *The Role of Augmented Feedback on Motor Learning: A Systematic Review*.

### V1 implication
During attempt: essential cues only.
After attempt: outcome + 1–2 technique cues.
Later test retention with reduced assistance, not only assisted performance.

## Architecture consequences
- Browser/local-first is feasible.
- MediaPipe is the initial pose layer.
- Three.js is the initial 3D layer.
- Pose inference and rendering are decoupled.
- Deterministic scoring sits outside renderer and any future AI coach.
- Unit tests validate the core; browser tests validate the workflow.
