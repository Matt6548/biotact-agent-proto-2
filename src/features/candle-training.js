import { FlameModel } from "../core/flame-model.js";
import { scoreCandleStrike } from "../core/scoring.js";

export class CandleTrainingSession {
  constructor() { this.flame = new FlameModel(); }
  strike({ speed, alignment, distance }) {
    const impulse = Math.max(0, speed) / 10;
    const flame = this.flame.applyAirImpulse({ impulse, alignment, distance });
    const score = scoreCandleStrike({
      effectiveStress: flame.effectiveStress ?? 0,
      extinguished: flame.extinguished,
      alignment,
      distance,
      contact: false
    });
    return { flame, score };
  }
  reset() { this.flame.reset(); }
}
