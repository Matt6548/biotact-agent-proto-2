const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function scoreCandleStrike({ effectiveStress = 0, extinguished = false, alignment = 0, distance = 0, contact = false } = {}) {
  if (contact) return { score: 0, grade: "invalid", reason: "contact" };
  const effect = clamp(effectiveStress / 0.86, 0, 1);
  const precision = clamp(alignment, 0, 1);
  const control = clamp(distance / 0.55, 0, 1);
  let score = Math.round((effect * 0.55 + precision * 0.3 + control * 0.15) * 100);
  if (extinguished) score = Math.max(score, 80);
  const grade = score >= 90 ? "master" : score >= 75 ? "clean" : score >= 50 ? "developing" : "weak";
  return { score, grade, reason: extinguished ? "extinguished" : "flame-response" };
}
