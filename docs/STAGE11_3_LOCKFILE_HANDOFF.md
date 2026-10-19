# Stage 11.3 — Tested lockfile handoff

The CI now commits the exact `package-lock.json` produced by the same run that passes:
- unit tests,
- production build,
- desktop/mobile browser acceptance,
- fake-webcam Pose Landmarker initialization,
- same-origin runtime request assertion.

This avoids manually reconstructing the lockfile outside the verified build environment.

After the lock commit exists, the workflow will be changed from `npm install` to `npm ci` and rerun as the final reproducibility gate.
