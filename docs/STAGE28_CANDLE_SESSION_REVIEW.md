# Stage 28 — Candle Training Session Review

## Goal
Keep the product centered on training, not competition. A user should understand not only the last strike or last round, but the direction of the current practice session.

## Session review
Completed five-strike rounds now accumulate into an in-session review with:
- completed round count;
- total strikes and target hits;
- weighted average score;
- average repeatability index;
- one dominant training focus.

The focus is selected from the same measured limitations already used by Stage 27:
- line control;
- tempo control;
- candle effect;
- repeatability.

Online rank, social comparison and registration are not required for any of this.

## Lifecycle
A fresh live camera start begins a fresh training session review. Completed rounds remain visible while the user continues through levels. Simulation QA uses the same aggregation path.

## Guardrail
Session metrics remain engineering summaries of camera-derived estimates. They are not force measurements, clinical assessments or validated biomechanical scores.

## Acceptance
- deterministic unit tests verify aggregation, focus selection and reset;
- one simulated five-strike round must produce a visible session review;
- all existing camera/privacy/mobile/deployment checks remain required.
