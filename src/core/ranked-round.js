import { CandleTrainingSession } from "../features/candle-training.js";
import { TRAINING_LEVELS } from "./progression.js";

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const PROHIBITED_KEYS=new Set([
  "score","landmarks","worldLandmarks","frames","trace","motionTrace",
  "video","audio","image","deviceReport","peakSpeed","rawSpeed",
]);

function hasProhibitedKey(value){
  if(!value||typeof value!=="object")return false;
  if(Array.isArray(value))return value.some(hasProhibitedKey);
  for(const [key,nested] of Object.entries(value)){
    if(PROHIBITED_KEYS.has(key))return true;
    if(hasProhibitedKey(nested))return true;
  }
  return false;
}

export function validateRankedRoundPayload(payload){
  if(!payload||typeof payload!=="object"||Array.isArray(payload)){
    return{ok:false,reason:"invalid-payload"};
  }
  if(hasProhibitedKey(payload)){
    return{ok:false,reason:"prohibited-client-data"};
  }

  const levelId=Number(payload.levelId);
  if(!Number.isInteger(levelId)||!TRAINING_LEVELS.some((level)=>level.id===levelId)){
    return{ok:false,reason:"invalid-level"};
  }
  if(!Array.isArray(payload.attempts)||payload.attempts.length!==5){
    return{ok:false,reason:"five-attempts-required"};
  }

  let previousOffset=-1;
  for(const attempt of payload.attempts){
    if(!attempt||typeof attempt!=="object"||Array.isArray(attempt)){
      return{ok:false,reason:"invalid-attempt"};
    }
    const allowed=new Set(["hand","intensityRatio","straightness","offsetMs","qualityOk"]);
    if(Object.keys(attempt).some((key)=>!allowed.has(key))){
      return{ok:false,reason:"unexpected-attempt-field"};
    }
    if(attempt.hand!=="left"&&attempt.hand!=="right"){
      return{ok:false,reason:"invalid-hand"};
    }
    if(!Number.isFinite(attempt.intensityRatio)||attempt.intensityRatio<0||attempt.intensityRatio>2){
      return{ok:false,reason:"invalid-intensity"};
    }
    if(!Number.isFinite(attempt.straightness)||attempt.straightness<0||attempt.straightness>1){
      return{ok:false,reason:"invalid-straightness"};
    }
    if(attempt.qualityOk!==true){
      return{ok:false,reason:"quality-required"};
    }
    if(!Number.isFinite(attempt.offsetMs)||attempt.offsetMs<0||attempt.offsetMs>120000||attempt.offsetMs<=previousOffset){
      return{ok:false,reason:"invalid-attempt-order"};
    }
    previousOffset=attempt.offsetMs;
  }

  return{ok:true,reason:null,levelId};
}

export function computeRankedRound(payload){
  const validation=validateRankedRoundPayload(payload);
  if(!validation.ok)return validation;

  const level=TRAINING_LEVELS.find((item)=>item.id===validation.levelId);
  const scored=payload.attempts.map((attempt)=>{
    const session=new CandleTrainingSession();
    const result=session.strike({
      speed:clamp(attempt.intensityRatio,0,2)*6,
      alignment:attempt.straightness,
      distance:level.distance,
    });
    return{
      score:result.score.score,
      success:Boolean(level.success(result)),
      intensityRatio:attempt.intensityRatio,
      straightness:attempt.straightness,
    };
  });

  const totalScore=scored.reduce((sum,item)=>sum+item.score,0);
  const successes=scored.filter((item)=>item.success).length;
  return{
    ok:true,
    levelId:level.id,
    levelName:level.name,
    attempts:scored.length,
    averageScore:Math.round(totalScore/scored.length),
    successes,
    passed:successes>=3,
    bestIntensityRatio:Math.max(...scored.map((item)=>item.intensityRatio)),
    bestStraightness:Math.max(...scored.map((item)=>item.straightness)),
  };
}

export const RANKED_ROUND_PRIVACY=Object.freeze({
  rawLandmarks:false,
  motionTrace:false,
  video:false,
  audio:false,
  deviceReport:false,
  clientScore:false,
});
