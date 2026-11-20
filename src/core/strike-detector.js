import { straightnessScore } from "./motion-model.js";

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const validPoint = (point) => point && [point.x, point.y, point.z].every(Number.isFinite);

export class StrikeDetector {
  constructor({
    startSpeed = 1.8,
    releaseSpeed = 0.9,
    minPeakSpeed = 2.2,
    minDurationMs = 55,
    maxDurationMs = 650,
    refractoryMs = 350,
    minDisplacement = 0.12,
    minStraightness = 0.78,
    minExtension = 0.06,
  } = {}) {
    this.config = { startSpeed, releaseSpeed, minPeakSpeed, minDurationMs, maxDurationMs, refractoryMs, minDisplacement, minStraightness, minExtension };
    this.reset();
  }

  configure(overrides = {}) {
    Object.assign(this.config, overrides);
    this.reset();
  }

  reset() {
    this.active = false;
    this.startedAt = 0;
    this.lastStrikeAt = -Infinity;
    this.peakSpeed = 0;
    this.path = [];
    this.lastPoint = null;
    this.startReach = null;
  }

  update({ t, speed, point, origin = null }) {
    const { startSpeed, releaseSpeed, minPeakSpeed, minDurationMs, maxDurationMs, refractoryMs,
      minDisplacement, minStraightness, minExtension } = this.config;
    if (!Number.isFinite(t) || !Number.isFinite(speed) || speed < 0 || !validPoint(point)) {
      this.reset();
      return null;
    }

    const precedingPoint = this.lastPoint;
    this.lastPoint = point;

    if (!this.active) {
      if (speed >= startSpeed && t - this.lastStrikeAt >= refractoryMs) {
        this.active = true;
        this.startedAt = t;
        this.peakSpeed = speed;
        this.path = precedingPoint ? [precedingPoint, point] : [point];
        this.startReach = validPoint(origin) ? distance(point, origin) : null;
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
      this.startReach = null;
      return null;
    }

    if (speed <= releaseSpeed) {
      const displacement = distance(this.path[0], point);
      const straightness = straightnessScore(this.path);
      const extension = this.startReach !== null && validPoint(origin)
        ? distance(point, origin) - this.startReach : null;
      const detected = this.peakSpeed >= minPeakSpeed && durationMs >= minDurationMs &&
        displacement >= minDisplacement && straightness >= minStraightness &&
        (extension === null || extension >= minExtension);
      const event = {
        detected,
        t,
        durationMs,
        peakSpeed: this.peakSpeed,
        straightness,
        displacement,
        extension,
        sampleCount: this.path.length,
        // A bounded signal-quality indicator, NOT a calibrated probability of a punch.
        confidence: Math.min(1, Math.max(0, .35 * straightness +
          .35 * Math.min(1, displacement / .30) +
          .30 * Math.min(1, this.peakSpeed / (minPeakSpeed * 1.5)))),
      };
      this.active = false;
      this.path = [];
      this.peakSpeed = 0;
      this.startReach = null;
      if (event.detected) {
        this.lastStrikeAt = t;
        return event;
      }
    }
    return null;
  }
}
