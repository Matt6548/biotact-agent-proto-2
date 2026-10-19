# Stage 16 — Tracking discontinuity safety

## Review finding
The quality gate previously suppressed bad frames only at the final strike-emission step. The left/right `StrikeDetector` state could still span a period of poor visibility or bad framing.

That creates a real field risk: a strike can start before tracking loss and finish after tracking returns, producing a path that never existed continuously in reliable camera data.

## New invariant
A bad tracking frame is now a hard motion boundary.

If any of these occur:
- no pose result,
- quality gate failure,
- missing left/right world wrist coordinate,

the analyzer:
1. clears both strike detectors,
2. clears the 3-frame speed filters,
3. clears previous wrist points,
4. marks tracking invalid,
5. emits no strike.

The first subsequent good frame only primes the new wrist positions and reports zero speed. Detection starts from the following valid frame.

## Why
This is deliberately conservative. Missing a borderline strike is safer than inventing a continuous trajectory across missing evidence.

## Regression gates
Tests now cover:
- a strike interrupted by tracking loss never completes,
- the first recovered frame cannot create a velocity spike,
- missing world-wrist data fails safely.
