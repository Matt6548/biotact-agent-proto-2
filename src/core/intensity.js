const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

export function normalizeStrikeIntensity(peakSpeed,profile){
  const safePeak=Math.max(0,Number(peakSpeed)||0);
  const reference=Number(profile?.peak);

  if(Number.isFinite(reference)&&reference>=1.2){
    const ratio=clamp(safePeak/reference,0,2);
    return{
      ratio,
      trainingSpeed:ratio*6,
      source:"personal-reference",
      referenceSpeed:reference,
    };
  }

  // Preserve the engineering/simulation mapping when no personal
  // calibration exists. Camera rounds normally cannot reach this path.
  const trainingSpeed=clamp(safePeak*2.5,0,12);
  return{
    ratio:trainingSpeed/6,
    trainingSpeed,
    source:"fallback",
    referenceSpeed:null,
  };
}
