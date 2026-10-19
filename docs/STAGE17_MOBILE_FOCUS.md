# Stage 17 — Mobile Live Focus Mode

## Review finding
Before the camera starts, the mobile page is useful as an explanation/setup screen. Once live training begins, the same long page becomes a liability: the user should be watching their body framing and the synchronized mini candle, not scrolling past a second large candle, history, field-test tools and engineering controls.

## Behavior
On screens up to 600 px while `data-live="on"`:
- the header/marketing copy collapses out;
- the arena goal/count/action remains sticky;
- the camera card becomes the dominant viewport surface;
- the synchronized mini candle stays inside the camera stage;
- the full target card is hidden (and its WebGL renderer is already paused by Stage 12);
- Recent attempts, Field test data and Engineering controls are hidden from the live movement view;
- the round summary is still allowed to appear after the five-strike set.

Stopping the camera restores the normal page automatically because `data-live` returns to `off`.

## Why
This is not a new feature. It removes nonessential attention during physical movement and reduces the mobile experience from a scrolling website to a training surface.

## Acceptance
The fake-webcam mobile browser test verifies:
- mini target exists;
- arena header is sticky;
- camera card remains visible;
- secondary sections are hidden only while live;
- a visual QA screenshot is saved.
