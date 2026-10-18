const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export class FlameModel {
  constructor(options = {}) {
    this.extinctionThreshold = options.extinctionThreshold ?? 0.86;
    this.reset();
  }
  reset() {
    this.tilt = 0;
    this.instability = 0;
    this.stability = 1;
    this.extinguished = false;
  }
  applyAirImpulse({ impulse = 0, alignment = 1, distance = 0.3 } = {}) {
    if (this.extinguished) return this.snapshot();
    const safeImpulse = Math.max(0, impulse);
    const safeAlignment = clamp(alignment, 0, 1);
    const safeDistance = Math.max(0, distance);
    const attenuation = Math.exp(-safeDistance / 0.55);
    const effectiveStress = safeImpulse * safeAlignment * attenuation;
    this.tilt = clamp(effectiveStress / 0.9, 0, 1);
    this.instability = clamp(effectiveStress / this.extinctionThreshold, 0, 1);
    this.stability = clamp(1 - effectiveStress / 1.05, 0, 1);
    if (effectiveStress >= this.extinctionThreshold) {
      this.extinguished = true;
      this.tilt = 1;
      this.instability = 1;
      this.stability = 0;
    }
    return this.snapshot({ effectiveStress });
  }
  step(dtSeconds) {
    if (this.extinguished) return this.snapshot();
    const dt = clamp(dtSeconds, 0, 0.1);
    const recovery = dt * 2.5;
    this.tilt = clamp(this.tilt - recovery, 0, 1);
    this.instability = clamp(this.instability - recovery * 0.7, 0, 1);
    this.stability = clamp(this.stability + recovery * 0.6, 0, 1);
    return this.snapshot();
  }
  snapshot(extra = {}) {
    return { tilt: this.tilt, instability: this.instability, stability: this.stability, extinguished: this.extinguished, ...extra };
  }
}
