const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

export class FlameModel {
  constructor(options = {}) {
    this.extinctionThreshold = options.extinctionThreshold ?? 0.86;
    // A visually tuned damped angular oscillator, not measured air dynamics.
    // theta'' + 2*zeta*omega*theta' + omega^2*theta = 0 between impulses.
    this.naturalFrequency = options.naturalFrequency ?? 6.4;
    this.dampingRatio = options.dampingRatio ?? 0.65;
    this.maxAngle = 0.58;
    this.reset();
  }
  reset() {
    this.angle = 0;
    this.angularVelocity = 0;
    this.turbulence = 0;
    this.tilt = 0;
    this.instability = 0;
    this.stability = 1;
    this.extinguished = false;
  }
  applyAirImpulse({ impulse = 0, alignment = 1, distance = 0.3, direction = 1 } = {}) {
    if (this.extinguished) return this.snapshot();
    const safeImpulse = Math.max(0, finite(impulse));
    const safeAlignment = clamp(finite(alignment, 1), 0, 1);
    const safeDistance = Math.max(0, finite(distance, 0.3));
    const attenuation = Math.exp(-safeDistance / 0.55);
    const effectiveStress = safeImpulse * safeAlignment * attenuation;
    const sign = finite(direction, 1) < 0 ? -1 : 1;
    const kick = clamp(effectiveStress, 0, 2);
    // A video frame spans a finite interval, so apply a small initial bend
    // together with the change in angular velocity.
    this.angle = clamp(this.angle + sign * kick * 0.08, -this.maxAngle, this.maxAngle);
    this.angularVelocity = clamp(this.angularVelocity + sign * kick * 4.1, -8, 8);
    this.turbulence = Math.max(this.turbulence, clamp(effectiveStress / this.extinctionThreshold, 0, 1));
    this.updateDerived();
    if (effectiveStress >= this.extinctionThreshold) {
      this.extinguished = true;
      this.tilt = sign;
      this.instability = 1;
      this.stability = 0;
    }
    return this.snapshot({ effectiveStress });
  }
  step(dtSeconds) {
    if (this.extinguished) return this.snapshot();
    const dt = clamp(finite(dtSeconds), 0, 0.1);
    const steps = Math.max(1, Math.ceil(dt * 120));
    const h = dt / steps;
    const omega = this.naturalFrequency;
    for (let i = 0; i < steps; i += 1) {
      const angularAcceleration = -omega * omega * this.angle
        - 2 * this.dampingRatio * omega * this.angularVelocity;
      this.angularVelocity += angularAcceleration * h;
      this.angle = clamp(this.angle + this.angularVelocity * h, -this.maxAngle, this.maxAngle);
    }
    this.turbulence *= Math.exp(-2.7 * dt);
    this.updateDerived();
    return this.snapshot();
  }
  updateDerived() {
    this.tilt = clamp(this.angle / this.maxAngle, -1, 1);
    this.instability = clamp(Math.max(
      this.turbulence * 0.85,
      Math.abs(this.angularVelocity) * 0.065,
      Math.abs(this.tilt) * 0.28,
    ), 0, 1);
    this.stability = 1 - this.instability;
  }
  snapshot(extra = {}) {
    return { tilt: this.tilt, instability: this.instability, stability: this.stability, extinguished: this.extinguished, ...extra };
  }
}
