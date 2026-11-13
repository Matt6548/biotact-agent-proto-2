# Stage 30 — Trust boundary for imported movement traces

## Why
The existing field-test loop imports JSON motion traces and replays them through the same training analyzer. Prior validation checked only schema and frame count; corrupted timestamps, landmarks, impossible coordinates and arbitrary embedded frame keys could enter the replay path.

## Implemented in this draft
- Validate all compacted frames **before** any replay callback runs.
- Enforce the exact v1 compact frame shape and expected landmark index allowlist.
- Accept null landmarks for tracking loss; reject non-finite coordinates and arbitrary point metadata.
- Reject negative, noninteger or implausibly high FPS, unsafe timestamps, out-of-order frames, and inconsistent frame counts.
- Limit imported file size to 5 MiB **before** browser file reading/JSON parsing.
- Add deterministic tests for valid replay, malformed frames, hidden metadata, timestamp ordering, and no partial replay on invalid input.

## Privacy and behavior
Numeric movement data remains sensitive. No automatic uploads, registration requirements, media capture changes or ranking dependencies were added. Normal recording, training levels and offline local replay remain intact.

## Verification status
Code and tests committed on isolated branch. Full GitHub Actions and actual Android/desktop human-motion field validation are required before merging or claiming field-ready punch accuracy. Fake-camera tests cannot validate real punch recognition.

## Next field-test pass (after CI)
On HTTPS, record a short controlled session in good lighting and another with imperfect lighting; export the trace explicitly, replay both locally and compare detected events with actual performed moves. Export only after informed consent; avoid publishing raw movement traces in GitHub issues.
