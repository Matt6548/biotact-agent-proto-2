import { straightnessScore } from "./motion-model.js";

export class StrikeDetector {
  constructor({
    startSpeed = 1.8,
    releaseSpeed = 0.9,
    minPeakSpeed = 2.2,
    minDurationMs = 55,
    maxDurationMs = 650,
    refractoryMs = 350,
  } = {}) {
    this.config = { startSpeed, releaseSpeed, minPeakSpeed, minDurationMs, maxDurationMs, refractoryMs };
    this.reset();
  }

  reset() {
    this.active = false;
    this.startedAt = 0;
    this.lastStrikeAt = -Infinity;
    this.peakSpeed = 0;
    this.path = [];
  }

  update({ t, speed, point }) {
    const { startSpeed, releaseSpeed, minPeakSpeed, minDurationMs, maxDurationMs, refractoryMs } = this.config;
    if (!Number.isFinite(t) || !Number.isFinite(speed) || !point) return null;

    if (!this.active) {
      if (speed >= startSpeed && t - this.lastStrikeAt >= refractoryMs) {
        this.active = true;
        this.startedAt = t;
        this.peakSpeed = speed;
        this.path = [point];
      }
      return null;
    }

    this.peakSpeed = Math.max(this.peakSpeed, speed);
    this.path.push(point);
    const durationMs = t - this.startedAt;

    if (durationMs > maxDurationMs) {
      this.active = false;
      this.path = [];
      this.peakSpeed = 0;
      return null;
    }

    if (speed <= releaseSpeed) {
      const event = {
        detected: this.peakSpeed >= minPeakSpeed && durationMs >= minDurationMs,
        t,
        durationMs,
        peakSpeed: this.peakSpeed,
        straightness: straightnessScore(this.path),
        sampleCount: this.path.length,
      };
      this.active = false;
      this.path = [];
      this.peakSpeed = 0;
      if (event.detected) {
        this.lastStrikeAt = t;
        return event;
      }
    }
    return null;
  }
}
