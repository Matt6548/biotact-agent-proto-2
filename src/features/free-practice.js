import { FlameModel } from "../core/flame-model.js";
import { LiveTrainingAnalyzer } from "./live-training.js";
import { PoseTracker } from "../vision/pose-tracker.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function median(values) {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

/**
 * Free practice has no round limit, score, level, or required calibration.
 * Frame data is processed in memory; only bounded aggregate motion references are retained.
 * A "strike" is a heuristic observation, never a measurement of force or airflow.
 */
export class FreePracticeEngine {
  constructor({ analyzer = new LiveTrainingAnalyzer(), flame = new FlameModel(), virtualDistance = 0.3 } = {}) {
    this.analyzer = analyzer;
    this.flame = flame;
    this.virtualDistance = clamp(virtualDistance, 0, 1);
    this.state = "preview";
    this.strikeCount = 0;
    this.recentPeaks = [];
    this.lastSessionCount = 0;
    this.previewTilt = 0;
  }

  start() {
    if (this.state !== "preview") return this.snapshot();
    this.analyzer.resetMotionState();
    this.previewTilt = 0;
    this.flame.reset();
    this.strikeCount = 0;
    this.recentPeaks = [];
    this.state = "framing";
    return this.snapshot();
  }

  pause() {
    if (this.state === "practicing" || this.state === "framing") {
      this.state = "paused";
      this.previewTilt = 0;
      this.analyzer.resetMotionState();
    }
    return this.snapshot();
  }

  resume() {
    if (this.state === "paused") {
      this.analyzer.resetMotionState();
      this.state = "framing";
    }
    return this.snapshot();
  }

  stop() {
    if (this.state !== "preview") this.lastSessionCount = this.strikeCount;
    this.state = "preview";
    this.previewTilt = 0;
    this.analyzer.resetMotionState();
    this.flame.reset();
    this.recentPeaks = [];
    return this.snapshot();
  }

  relight() {
    if (this.state === "practicing" || this.state === "framing" || this.state === "paused") {
      this.previewTilt = 0;
      this.analyzer.resetMotionState();
      this.flame.reset();
    }
    return this.snapshot();
  }

  tick(dtSeconds) {
    if (this.state === "practicing" || this.state === "framing") {
      this.flame.step(dtSeconds);
      const dt = Number.isFinite(dtSeconds) ? clamp(dtSeconds,0,1) : 0;
      // Release in elapsed time, not frame count; remain visible between
      // sparse samples without accumulating a physical oscillator impulse.
      this.previewTilt *= Math.exp(-dt*7.5);
      if (Math.abs(this.previewTilt)<.001) this.previewTilt=0;
    }
    return this.visualFlame();
  }

  visualFlame() {
    const flame=this.flame.snapshot();
    if (flame.extinguished || !this.previewTilt) return flame;
    const tilt=clamp(flame.tilt+this.previewTilt,-1,1);
    const instability=clamp(Math.max(flame.instability,Math.abs(this.previewTilt)*.7),0,1);
    return {...flame,tilt,instability,stability:1-instability};
  }

  onFrame(frame) {
    if (this.state !== "practicing" && this.state !== "framing") {
      return { ...this.snapshot(), strike: null, response: null, ignored: true };
    }
    const analysis = this.analyzer.analyze(frame);
    if (!analysis.quality.ok) this.state = "framing";
    else this.state = "practicing";

    const strike = analysis.quality.ok ? analysis.strike : null;
    const preview = analysis.previewMotion;
    // Preview is a bounded overlay, not repeated impulses into the oscillator.
    // It cannot extinguish the flame or increment the confirmed-motion counter.
    if (!analysis.quality.ok || strike || this.flame.snapshot().extinguished) this.previewTilt=0;
    else if (preview && Number.isFinite(preview.strength) && Number.isFinite(preview.direction)) {
      const target=clamp(preview.strength,0,.55)*Math.sign(preview.direction)*.35;
      const interval = Number.isFinite(preview.intervalMs) ? clamp(preview.intervalMs,0,180) : 33;
      const alpha = 1-Math.exp(-interval/45);
      this.previewTilt=clamp((1-alpha)*this.previewTilt+alpha*target,-.193,.193);
    }
    let response = null;
    if (strike) {
      // Before an individual reference exists use a deliberately conservative
      // visual default. After four accepted movements, use a rolling median.
      const stableReference = this.recentPeaks.length >= 4;
      const reference = stableReference ? median(this.recentPeaks) : 4;
      const relativeMotion = clamp(strike.peakSpeed / reference, 0, 2);
      const visualImpulse = clamp(relativeMotion * .95 * (.7 + .3 * strike.confidence), 0, 2.4);
      const flame = this.flame.applyAirImpulse({
        impulse: visualImpulse,
        alignment: strike.straightness,
        distance: this.virtualDistance,
        // Handedness is only a visual direction cue, not measured air flow.
        direction: strike.hand === "left" ? -1 : 1,
      });
      response = {
        flame,
        visualImpulse,
        reference: stableReference ? "personal-motion-median" : "preliminary-default",
        // This is a simulated distance, not the physical distance to a candle.
        virtualDistance: this.virtualDistance,
      };
      this.strikeCount += 1;
      this.recentPeaks.push(strike.peakSpeed);
      if (this.recentPeaks.length > 16) this.recentPeaks.shift();
    }

    return { ...this.snapshot(), analysis, strike, response, ignored: false };
  }

  snapshot() {
    return {
      state: this.state,
      strikeCount: this.strikeCount,
      lastSessionCount: this.lastSessionCount,
      referenceStatus: this.recentPeaks.length >= 4 ? "personalized" : "learning",
      referenceSamples: this.recentPeaks.length,
      flame: this.visualFlame(),
    };
  }
}

/**
 * Browser adapter. Camera ownership is exclusive: pause/stop release tracks.
 * Generation tokens discard late camera permission and worker callbacks.
 */
export class FreePracticeCameraController {
  constructor({ video, onUpdate, onStatus, engine = new FreePracticeEngine(), trackerFactory,
    visibilityTarget = globalThis.document ?? null } = {}) {
    this.video = video;
    this.onUpdate = onUpdate;
    this.onStatus = onStatus;
    this.engine = engine;
    this.trackerFactory = trackerFactory ?? ((args) => new PoseTracker(args));
    this.tracker = null;
    this.generation = 0;
    this.visibilityTarget = visibilityTarget;
    this.onVisibilityChange = () => {
      // A hidden tab must not leave the camera running in the background.
      if (this.visibilityTarget?.hidden) this.pause();
    };
    this.visibilityTarget?.addEventListener?.("visibilitychange", this.onVisibilityChange);
  }

  async openCamera() {
    const generation = ++this.generation;
    const tracker = this.trackerFactory({
      video: this.video,
      onResult: (frame) => {
        // The UI needs only transient frame diagnostics/pose drawing; the
        // engine does not store frames or include them in its snapshot.
        if (generation === this.generation) this.onUpdate?.({
          ...this.engine.onFrame(frame),
          frame,
        });
      },
      onStatus: (status) => {
        if (generation === this.generation) {
          // Release the camera and clear the partial gesture before the UI
          // reads the paused state. Late status from stop() is generation-gated.
          if (status?.state === "error" || status?.state === "privacy-block") this.pause();
          this.onStatus?.(status);
        }
      },
    });
    this.tracker = tracker;
    try {
      await tracker.start();
      if (generation !== this.generation) {
        tracker.stop();
        return this.engine.snapshot();
      }
      return this.engine.snapshot();
    } catch (error) {
      tracker.stop();
      if (generation !== this.generation) return this.engine.snapshot();
      if (generation === this.generation) {
        this.tracker = null;
        this.engine.pause();
      }
      throw error;
    }
  }

  start() {
    if (this.engine.state !== "preview") return Promise.resolve(this.engine.snapshot());
    this.engine.start();
    return this.openCamera();
  }

  pause() {
    this.generation += 1;
    this.tracker?.stop();
    this.tracker = null;
    return this.engine.pause();
  }

  resume() {
    if (this.engine.state !== "paused") return Promise.resolve(this.engine.snapshot());
    this.engine.resume();
    return this.openCamera();
  }

  stop() {
    this.generation += 1;
    this.tracker?.stop();
    this.tracker = null;
    return this.engine.stop();
  }

  relight() { return this.engine.relight(); }
  tick(dtSeconds) { return this.engine.tick(dtSeconds); }
  snapshot() { return this.engine.snapshot(); }
  dispose() {
    this.stop();
    this.visibilityTarget?.removeEventListener?.("visibilitychange", this.onVisibilityChange);
  }
}
