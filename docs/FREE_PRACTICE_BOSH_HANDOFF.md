# Free Practice — BOSH UI integration draft

Parent product decision: docs/CANDLE_FREE_PRACTICE_REDESIGN.md in the separate
design/candle-free-practice-reboot-20261120 proposal (Draft PR #2).

This branch is a first **unmerged** UX and integration prototype, not a production release.

## User-visible changes

- Landing page immediately shows the large 3D candle and Start Exercise action.
- Mandatory name/safety modal is bypassed; a short safety and on-device camera
  processing note remains visible.
- The main experience has no missions, levels, chapter badges, score gates,
  finite rounds, or forced calibration wizard.
- Camera starts only after a click. While active, Start changes to Pause/Resume;
  a separate Stop action releases the camera.
- The candle stays full-size on mobile when the camera is active. The second,
  mobile-only WebGL renderer is not created.
- Technical/trace controls and attempt history remain under collapsed details.

## Technical adaptation and integration warnings

- To unblock UX without editing the shared detector implementation, the old
  TrainingRound aggregator currently runs with an infinite attempt limit. Its
  success state is never used to advance a game level, and a 500-event unit
  regression guards against premature completion.
- Existing modules for player/story/ranking/round summary are not deleted
  because they can still support historical diagnostics and tests; the live
  UI does not expose them. CV specialist may replace this adapter with a
  purpose-built free-practice session, keeping equivalent UX semantics.
- Live pose analysis currently uses the detector's built-in defaults without
  a mandatory personal calibration screen. In this state all movement and flame
  intensity feedback is provisional, not force or airflow measurement.
  Better opt-in/adaptive calibration is delegated to the movement workstream.
- Flame and wax artwork are unchanged here: the 3D specialist owns renderer
  improvements on a separate branch. Integrate them only after reviewing
  licenses, GPU budget and observed visuals.
- Field-test pack export remains tied to a completed fixed round and therefore
  remains disabled in continuous mode. Keep trace export/manual QA available;
  a later integration may define a free-practice evidence summary.

## Verification

- npm test: 73/73 PASS (including 500-event free practice).
- npm run build: PASS; Vite reports an existing >500 kB chunk warning.
- Browser E2E: attempted but **BLOCKED**, not a product failure; initial
  Playwright Chromium binary absent. Local /usr/bin/chromium is present but
  cannot create its ProcessSingleton socket (EPERM) inside this workspace.
  GitHub Actions should supply an unrestricted browser to verify the PR.
- No real device/real camera visual test was performed in this environment.

## Review checklist before merge

1. Verify initial page at 360/390/1440px with screenshots, no overflow.
2. Verify webcam granted, denied, idle, paused, resumed, stopped.
3. Verify 100+ hits do not complete a level or demand another click.
4. Check physical flame remains visible during live camera on Redmi Note 9S.
5. Check screen readers and keyboard reading order (camera markup currently
   precedes target markup, but CSS displays the candle first).
6. Resolve the field-test evidence pack semantics for continuous practice.
7. Confirm final artwork and camera behavior with the owner before merge.
