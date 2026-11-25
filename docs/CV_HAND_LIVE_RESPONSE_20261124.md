# CV V2: early visual response and isolated hand inference
Control HEAD: `f535407e3e3b3da2555670b99b00fbd345795cc4` (PR #9). Baseline CI [45353655560](https://github.com/Matt6548/biotact-agent-proto-2/actions/runs/45353655560): 121 Node tests, 12 browser PASS/2 conditional skips; build/security PASS. That run did not invoke the hand worker.

## Changes
- Outbound coherent expansion yields a bounded visual-only cue after two rising samples and ≥12% apparent growth. Overlay tilt ≤0.193, decays exponentially, never enters the oscillator, counts, or extinguishes. Confirmation still requires the existing larger expansion and consecutive retreat. Direction from outward peak, not return. Tracking loss clears preview; no unbounded history.
- Retraction evidence must be consecutive; cooldown survives tracking gaps. Relight cancels the partial trajectory. Default Pose remains intact; no main/style/render changes.
- Old async bitmap/worker callbacks cannot target a new generation; stopping an obsolete tracker does not clear its replacement's video stream. Exposes capture-submission-to-result elapsed ms (not display latency).
- Test-only worker accepts forced CPU for independent model verification, default stays GPU then CPU.

## Actual inference gate (not human accuracy)
Isolated Vite harness compiles the same hand worker; downloads pinned model at build time via existing script, downloads Google's public single-hand sample from official Gesture Recognizer example to RUNNER_TEMP. No fixture, pixels or landmarks committed or uploaded. Local-only browser requests; no test harness in normal app entry/build. Test initializes auto delegate and explicit CPU separately, runs 15 static image frames, a transformed-photo sequence, and 8 blank frames. Requires actual 21 finite landmarks on ≥3 static frames, zero static previews/events, blank tail absent, zero external HTTP requests. Numeric output contains fixture SHA, delegate, init, median/p90 inference, round trip, and exploratory transformed-photo results. No fabricated numbers: result depends on completed CI.

Run in a network-capable environment:
```sh
npm ci
npm test
npm run prepare:vision
node scripts/prepare-hand-landmarker-assets.mjs
npx playwright install chromium
curl -f https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/thumbs_up.jpg -o /tmp/hand-fixture.jpg
export HAND_FIXTURE_PATH=/tmp/hand-fixture.jpg
npx vite build --config tests/hand-runtime/vite.config.js
npx playwright test --config playwright.hand.config.js
```
Fixture provenance: https://colab.research.google.com/github/googlesamples/mediapipe/blob/main/examples/gesture_recognizer/python/gesture_recognizer.ipynb (public example downloads thumbs_up.jpg). No redistribution of image.

## Remaining field gate
Public photo pixels are genuine model input, but transformed photos/timestamps are not real punches. On Redmi Note 9S and desktop with explicit camera permission: 20 controlled forward/return gestures, 20 sideways/slow/static negatives, near/far, dark light, partial fist and two hands. Log only aggregate manual TP/FP/FN, delegate/init/inference p50/p90, processed FPS and motion-to-visible-response using independent timing; no upload of private media. Check loss/reacquisition, pause/resume/stop, mirror, fallback Pose after explicit user choice. No force or airflow measurement. BOSH may wire opt-in hand mode after gate; default UI stays Pose. No production deployment.

## Measured follow-up on first implementation
At exact first CV V2 candidate `8919b1169c565feed634037b00d692963a24be1a`, CI [45355596709](https://github.com/Matt6548/biotact-agent-proto-2/actions/runs/45355596709) and [numeric artifact](https://github.com/Matt6548/biotact-agent-proto-2/actions/runs/45355596709/artifacts/14902591089) both actual model cases PASS, 128/128 Node PASS. Pinned Google hand task SHA/length verified, public image SHA-256 `2aee0e3a69ba5f0d3287597e61d265f4f3ac2a44ccec198dddd2639b0c8ef7ba`.
- Auto selected GPU: init 597.48ms, inference median 690.70ms, p90 1010.25ms.
- Forced CPU: init 594.77ms, inference median 57.40ms, p90 82.11ms.
- Each had 15/15 static frames with one real hand/21 finite landmarks, zero false events/previews on static frames, one confirmed event and four preview frames on the transformed photo, no hand in the final three blank frames, no external HTTP requests observed.
- **FAIL for interactive GPU latency in that cloud runner**, despite successful GPU initialization. Cloud GPU may be software emulated; this is not a Redmi benchmark.

Therefore the next candidate adds one-time CPU fallback if three consecutive GPU inference times exceed 120ms after two warmup frames. It closes the GPU graph before creating the CPU graph; transition frame is neutral and resets tracking, same stream/worker. Forced CPU is unchanged. The test now includes a wall-clock cadence phase with actual timestamps/observed processing FPS instead of relying solely on simulated 33ms; it still uses a public photograph and is not a human-camera field test. New results must be read from the new exact-HEAD CI.
