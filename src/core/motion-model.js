const magnitude3 = ({ x = 0, y = 0, z = 0 }) => Math.hypot(x, y, z);

export function velocityBetween(previous, current) {
  if (!previous || !current) return 0;
  const dt = (current.t - previous.t) / 1000;
  if (!Number.isFinite(dt) || dt <= 0) return 0;
  return magnitude3({ x: current.x - previous.x, y: current.y - previous.y, z: current.z - previous.z }) / dt;
}

export function qualityGate({ visibility = 0, fps = 0, bodyCoverage = 0 } = {}) {
  const reasons = [];
  if (visibility < 0.75) reasons.push("low-visibility");
  if (fps < 24) reasons.push("low-frame-rate");
  if (bodyCoverage < 0.8) reasons.push("poor-framing");
  return { ok: reasons.length === 0, reasons };
}
