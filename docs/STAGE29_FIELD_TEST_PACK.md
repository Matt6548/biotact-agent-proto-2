# Stage 29 — Explicit Field-Test Pack

## Goal
Make the next real-device test useful for detector tuning without adding another gameplay mode.

## Export contract
A field-test pack is available only after all three pieces exist:
1. the user explicitly recorded a motion trace;
2. device diagnostics reached Ready / Constrained / Limited;
3. at least one candle round completed.

The export combines:
- the recorded numeric motion trace;
- aggregate device performance;
- the latest completed candle-round evidence and repeatability insight.

## Privacy
The builder deliberately does not copy:
- player name;
- account or rank information;
- user agent or raw device identifier;
- image, video or audio.

The pack **does contain numeric movement coordinates**, so it is still sensitive movement data. It is created only by explicit export and is never uploaded automatically.

## Why
Automated fake-camera acceptance proves runtime behavior but cannot tune punch recognition for real lighting, clothing, body proportions, camera placement or phone performance. One explicit evidence file makes that field loop reproducible.

## Acceptance
- unit tests enforce required evidence and identity-field exclusion;
- the normal product flow keeps field-test export disabled until evidence exists;
- all existing training/camera/security/deployment acceptance remains required.
