# Stage 27 — Candle Training Quality

## Priority
Training remains the product core. Registration, global ranking and social competition are optional layers and must not compete with the candle-training flow.

## Changes

### Post-round repeatability insight
After a five-strike round the app now summarizes repeatability using only values the current pipeline already measures:
- normalized personal-reference intensity spread;
- trajectory straightness and its spread;
- score spread;
- target-hit rate.

The displayed repeatability index is explicitly an engineering training index, not a biomechanical or medical measurement.

### One next drill
The round insight chooses one focused candle drill:
- **Line-control drill** when the wrist path is weak or inconsistent;
- **Tempo-control drill** when normalized intensity varies too much;
- **Candle-effect drill** when line/tempo are controlled but target-hit rate is still low;
- **Repeatability drill** when the current pattern is already stable enough to repeat.

The purpose is to avoid generic coaching and give exactly one next action.

### Optional ranking layer
The local player/personal-best/global-rank block is now collapsed by default. It remains available, but it no longer occupies the primary training path.

## Guardrail
The system still does not claim to measure punch force. Repeatability is a product engineering heuristic over camera-derived estimates and personal normalization.

## Acceptance
- deterministic unit tests cover stable, line-control, tempo-control, candle-effect and insufficient-data cases;
- the five-strike browser simulation must reveal a round insight;
- player/ranking details must remain collapsed by default;
- existing camera/privacy/mobile acceptance remains unchanged.
