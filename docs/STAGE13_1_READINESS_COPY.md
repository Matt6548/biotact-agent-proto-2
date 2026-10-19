# Stage 13.1 — Readiness copy consistency

Browser acceptance found a real UI contradiction:
- primary action correctly changed to disabled `Step into frame`,
- setup status still said `Motion model ready · calibrate next`.

The setup status now says `Motion model ready · step into frame` until stable pose frames satisfy the readiness gate. Only then does the live analysis state say `Pose stable · calibrate next`.
