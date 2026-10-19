# Stage 8 visual review — 2026-10-19

Fresh desktop/mobile QA was inspected after Stage 8.

## What improved
- One primary setup action is much clearer than the earlier competing camera/round controls.
- Raw tracking metrics are now secondary.
- The five-strike summary is readable and makes the exercise feel like a repeatable drill.
- Level advancement happens only after a round rather than mid-round.
- The mobile layout still has no horizontal overflow.

## Follow-up issues found and corrected
1. **Mixed round context:** after a successful round the top goal switched to the new level while the 5/5 statistics still described the old round. The completed view now keeps the completed goal and labels the target panel with the next level separately.
2. **Threshold display:** five successful hits previously rendered as 5/3. The progress indicator now caps at the advancement requirement (3/3), while the round summary still reports the true 5/5.
3. **Airflow readability:** the physically motivated air-pulse visualization was too subtle in recorded QA. Particle size, lifetime and peak opacity were increased while retaining a neutral airflow appearance rather than an energy effect.

## Remaining blocker
Real camera acceptance is still required on a public HTTPS preview/device. Automated browser QA validates layout and deterministic behavior, not a physical user's pose-tracking experience.
