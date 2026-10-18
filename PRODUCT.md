# Product brief — Martial Training Lab

## Goal
Create an interactive martial-arts training system that turns real movement into understandable, progressive practice instead of a generic fitness dashboard.

The first skill is inspired by candle-punch training: the trainee performs a controlled non-contact strike and tries to create enough air disturbance to affect or extinguish a flame.

## Principles
1. Training first, game second.
2. Physics-inspired, not fake physics: the candle model is a calibrated approximation, not CFD.
3. Camera honesty: monocular video is useful for trends and selected kinematic features, not laboratory-grade force measurement.
4. Local-first pose estimation where practical.
5. Deterministic core: same measured motion => same flame response and score.
6. Progressive feedback: minimal cueing during the attempt; outcome + 1–2 actionable cues after it.
7. Anime may influence atmosphere and progression, never scientific claims.

## Stages
- Stage 0: clean repository + deterministic candle simulation + tests.
- Stage 1: MediaPipe pose pipeline, calibration and motion-quality gate.
- Stage 2: strike detector + speed/trajectory/timing metrics.
- Stage 3: responsive Three.js candle/flame and airflow visualization.
- Stage 4: coaching loop, progression and session history.
- Stage 5: mobile performance, accessibility, browser regression and field trials.
- Stage 6: richer techniques, targets, reaction drills and optional sparring scenarios.

## First acceptance target
A user can complete one Candle Strike session, see a believable flame response, receive a repeatable score, and understand which measurable motion feature most affected the result.
