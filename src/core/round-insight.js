const clamp01=(value)=>Math.max(0,Math.min(1,value));

const median=(values=[])=>{
  const clean=values.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!clean.length)return 0;
  const mid=Math.floor(clean.length/2);
  return clean.length%2?clean[mid]:(clean[mid-1]+clean[mid])/2;
};

const range=(values=[])=>{
  const clean=values.filter(Number.isFinite);
  if(!clean.length)return 0;
  return Math.max(...clean)-Math.min(...clean);
};

export function buildRoundInsight(attempts=[]){
  const clean=attempts
    .filter(Boolean)
    .map((attempt)=>({
      score:Number.isFinite(attempt.score)?attempt.score:0,
      success:Boolean(attempt.success),
      straightness:clamp01(Number.isFinite(attempt.straightness)?attempt.straightness:0),
      intensityRatio:Math.max(0,Number.isFinite(attempt.intensityRatio)?attempt.intensityRatio:0),
    }));

  if(clean.length<2){
    return{
      ready:false,
      repeatabilityIndex:0,
      label:"Need more strikes",
      limiter:"insufficient",
      metrics:{medianStraightness:0,intensitySpread:0,successRate:0},
      drill:{
        title:"Complete the five-strike round",
        cue:"Use the same comfortable setup for each strike so the system can compare a repeatable pattern.",
      },
    };
  }

  const straightness=clean.map((attempt)=>attempt.straightness);
  const intensity=clean.map((attempt)=>attempt.intensityRatio);
  const scores=clean.map((attempt)=>attempt.score);

  const medianStraightness=median(straightness);
  const straightnessSpread=range(straightness);
  const medianIntensity=Math.max(.25,median(intensity));
  const intensitySpread=range(intensity)/medianIntensity;
  const scoreSpread=range(scores)/100;
  const successRate=clean.filter((attempt)=>attempt.success).length/clean.length;

  const penalty=
    .45*clamp01(intensitySpread/.6)+
    .35*clamp01(straightnessSpread/.3)+
    .20*clamp01(scoreSpread/.5);
  const repeatabilityIndex=Math.round(100*(1-clamp01(penalty)));

  let label="Variable";
  if(repeatabilityIndex>=80)label="Stable";
  else if(repeatabilityIndex>=60)label="Developing";

  let limiter="repeatability";
  let drill={
    title:"Repeatability drill",
    cue:"Repeat one more five-strike round at the same level before increasing difficulty.",
  };

  if(medianStraightness<.75||straightnessSpread>.18){
    limiter="line-control";
    drill={
      title:"Line-control drill",
      cue:"Make five slower straight punches and keep the wrist travelling through the same narrow lane.",
    };
  }else if(intensitySpread>.35){
    limiter="tempo-control";
    drill={
      title:"Tempo-control drill",
      cue:"Match the same comfortable acceleration across five strikes instead of chasing one fastest attempt.",
    };
  }else if(successRate<.6){
    limiter="candle-effect";
    drill={
      title:"Candle-effect drill",
      cue:"Keep the same clean line and build acceleration smoothly until the virtual flame response becomes repeatable.",
    };
  }

  return{
    ready:true,
    repeatabilityIndex,
    label,
    limiter,
    metrics:{
      medianStraightness:Math.round(medianStraightness*100),
      intensitySpread:Math.round(intensitySpread*100),
      successRate:Math.round(successRate*100),
    },
    drill,
  };
}
