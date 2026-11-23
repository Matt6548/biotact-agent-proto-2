# СВЕЧА / ДВИЖЕНИЕ — free-practice engine handoff

Base: `martial-training-lab`. Scope: independent CV/training modules only; `src/main.js`, `src/style.css`, production and legacy rounds remain unchanged for BOSH to integrate separately.

## Contract for BOSH

```js
import { FreePracticeCameraController } from "./features/free-practice.js";

const practice = new FreePracticeCameraController({
  video,
  onUpdate: ({ state, analysis, strike, response, strikeCount }) => {
    // "framing" means pose was lost or quality is poor; show one positioning cue.
    // "practicing" is continuous and NEVER ends at 5/100/500 strikes.
    // analysis?.quality.reasons contains machine-readable tracking diagnostics.
    // response is emitted only for a validated motion event.
    if (response) {
      candleRenderer.setState(response.flame);
      candleRenderer.triggerImpulse(response.visualImpulse);
    }
    renderSmallOptionalCounter(strikeCount);
  },
  onStatus: (status) => renderCameraStatus(status),
});

await practice.start(); // Must originate from a user click: browser camera permission.
practice.pause();       // Releases camera tracks and worker.
await practice.resume(); // New permission/request and a fresh tracking baseline.
practice.relight();     // Flame only; session and camera continue.
practice.stop();        // Releases camera, resets flame, returns preview.
practice.dispose();     // On screen teardown: stop + remove visibility listener.

// In the existing renderer's animation/update loop only while active:
candleRenderer.setState(practice.tick(deltaSeconds));
```

The new controller also pauses and releases the camera if the document becomes hidden. It does not resume automatically when the tab becomes visible: the user should explicitly choose **Resume**. A denied camera request rejects `start()`/`resume()` and leaves the engine paused, ready for a user-initiated retry. Stop during a pending permission prompt invalidates that request; late-granted tracks are closed by `PoseTracker` and cannot bootstrap a worker.

Do **not** wire the old `TrainingRound`, `TrainingProgression`, `calibrationClock` or mandatory name/mission gate into this flow. Keep separate simulation/demo controls clearly marked as non-camera training. Current UI will still show old rounds until BOSH changes `src/main.js` and `src/style.css`; this PR alone is not a finished visual release.

## Deterministic motion and flame policy

- Existing self-hosted MediaPipe Pose worker, same-origin egress guard and CSP remain unchanged. MediaPipe world coordinates are estimated, not ground-truth metres or physical force.
- No pose, a hidden wrist/elbow, bad framing, low processed fps, missing wrist data, time rewind/gap over 180 ms, or an implausible world-wrist speed over 9 units/s resets the active trajectory. The next good frame only re-primes velocity.
- A validated event requires a speed rise and release, a plausible 55–650 ms duration, displacement of at least 0.12 estimated world units, path straightness at least 0.78, and (if a reliable world shoulder is available) wrist extension of at least 0.06 world units. Per-hand refractory = 350 ms; global emitted-event spacing = 300 ms. These are *heuristics*, not medically or experimentally calibrated thresholds.
- Event `confidence` is a bounded geometric/speed signal-quality indicator, **not** a probability that a real punch happened. Do not show it as a percentage of detection accuracy.
- The first accepted movements use a conservative visual default. From the fifth accepted movement onward, a rolling median of at most 16 observed peak speeds gives a personalized **relative visual reference**, not a force measurement. `referenceStatus` is `learning` or `personalized`; no mandatory calibration wizard, server training, or persistent user profile. Legacy explicit calibration remains available for separate opt-in flows.
- Accepted movement → bounded dimensionless `visualImpulse` → virtual fixed-distance attenuation and path-alignment in `FlameModel` → existing renderer's interpolation and `tick(dt)` recovery. The virtual distance is a simulation setting, not measured user-to-candle distance. Extinction never closes the exercise; `relight()` is explicit.
- The engine only keeps a count and up to 16 speed aggregates. It never stores frames. Existing opt-in `MotionTraceRecorder` still stores sensitive numeric motion sequences locally; exporting them requires a separate deliberate action and correct privacy wording.

## Reproducible acceptance

```bash
npm ci
npm test
npm run build
npm run test:e2e
```

New deterministic tests cover 500 events without session completion, relight, pause, stop/restart, framing loss, occluded wrist, long frame gaps, timestamp rewind, sudden jumps, simple guard jitter, shoulder-directed retraction, repeated numeric trace replay, background visibility, late camera permission and pending video playback. No real camera/Redmi Note 9S benchmark has been performed by this module's tests.

### Integration and field checks still owed

1. BOSH connects single-screen start/pause/stop/reignite, renderer and privacy copy without editing the old training UI in this branch.
2. QA tests actual camera grant/deny, camera device removal, browser tab hiding, 360/390 mobile and 1440 desktop, controlled movements vs guard/fidget, and verifies that **100+ real movements** do not terminate training.
3. QA manually checks Redmi Note 9S Android 11 for at least 60 seconds: pose fps, lost frame recovery, heat, visual latency, false positives and false negatives. Synthetic replay PASS is **not** a real-world accuracy measurement.
4. Human-labeled field traces are needed to tune the thresholds; until then, keep metrics descriptive and avoid efficacy or force claims.

No third-party algorithm, model or asset was copied into these changes; existing MediaPipe ownership and `THIRD_PARTY.md` remain applicable.
