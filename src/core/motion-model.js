const magnitude3 = ({ x = 0, y = 0, z = 0 }) => Math.hypot(x, y, z);

export function velocityBetween(previous, current) {
  if (!previous || !current) return 0;
  const dt = (current.t - previous.t) / 1000;
  if (!Number.isFinite(dt) || dt <= 0) return 0;
  return magnitude3({
    x: current.x - previous.x,
    y: current.y - previous.y,
    z: current.z - previous.z,
  }) / dt;
}

export function averageVisibility(landmarks = [], indices = []) {
  if (!indices.length) return 0;
  const values = indices.map((index) => landmarks[index]?.visibility ?? 0);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function inFrameRatio(landmarks = [], indices = [], margin = 0.04) {
  if (!indices.length) return 0;
  let inside = 0;
  for (const index of indices) {
    const point = landmarks[index];
    if (!point) continue;
    if (
      point.x >= margin &&
      point.x <= 1 - margin &&
      point.y >= margin &&
      point.y <= 1 - margin &&
      (point.visibility ?? 0) >= 0.5
    ) {
      inside += 1;
    }
  }
  return inside / indices.length;
}

export function qualityGate({ visibility = 0, fps = 0, bodyCoverage = 0 } = {}) {
  const reasons = [];
  if (visibility < 0.72) reasons.push("low-visibility");
  if (fps < 20) reasons.push("low-frame-rate");
  if (bodyCoverage < 0.75) reasons.push("poor-framing");
  return { ok: reasons.length === 0, reasons };
}

export function straightnessScore(points = []) {
  if (points.length < 3) return 0;
  const start = points[0];
  const end = points.at(-1);
  const direct = magnitude3({
    x: end.x - start.x,
    y: end.y - start.y,
    z: end.z - start.z,
  });
  let travelled = 0;
  for (let i = 1; i < points.length; i += 1) {
    travelled += magnitude3({
      x: points[i].x - points[i - 1].x,
      y: points[i].y - points[i - 1].y,
      z: points[i].z - points[i - 1].z,
    });
  }
  if (travelled <= 1e-6) return 0;
  return Math.min(1, Math.max(0, direct / travelled));
}
