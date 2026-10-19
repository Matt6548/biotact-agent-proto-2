export function buildCoachFeedback({strike,result}={}){
  if(!strike||!result)return{outcome:"Waiting for a valid strike",cues:[]};

  let outcome="Flame disturbed";
  if(result.flame.extinguished)outcome="Flame extinguished";
  else if((result.flame.instability??0)>.65)outcome="Strong flame instability";
  else if((result.flame.tilt??0)>.3)outcome="Clear flame deflection";

  const cues=[];
  if(strike.straightness<.68){
    cues.push("Make the wrist path straighter before adding more speed.");
  }else if(strike.straightness<.82){
    cues.push("Good line. Reduce side-to-side drift on the next attempt.");
  }

  if(!result.flame.extinguished&&(result.flame.effectiveStress??0)<.5){
    cues.push("The strike registered, but the virtual airflow effect was low. Build acceleration smoothly.");
  }else if(result.flame.extinguished&&strike.straightness>=.82){
    cues.push("Clean result. Repeat it at the same control level before increasing difficulty.");
  }

  return{outcome,cues:cues.slice(0,2)};
}
