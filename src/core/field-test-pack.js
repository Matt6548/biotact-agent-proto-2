export function buildFieldTestPack({motionTrace,deviceReport,roundEvidence}={}){
  if(!motionTrace||motionTrace.schema!=="martial-training-motion-trace/v1"||!Array.isArray(motionTrace.frames)||motionTrace.frames.length===0){
    return{ok:false,reason:"motion-trace-required"};
  }
  if(!deviceReport||deviceReport.kind!=="martial-training-device-performance"||deviceReport.status==="insufficient"){
    return{ok:false,reason:"device-report-required"};
  }
  if(!roundEvidence||!Number.isFinite(roundEvidence.attempts)||roundEvidence.attempts<=0){
    return{ok:false,reason:"completed-round-required"};
  }

  const value={
    schema:"martial-training-field-test/v1",
    createdAt:new Date().toISOString(),
    checkpoint:"stage-29",
    privacy:{
      containsPlayerName:false,
      containsAccount:false,
      containsVideo:false,
      containsAudio:false,
      containsRawDeviceIdentifier:false,
      containsMotionCoordinates:true,
      note:"This pack is created only by explicit export. The embedded motion trace contains numeric movement coordinates and should be treated as sensitive movement data.",
    },
    round:{
      levelId:Number(roundEvidence.levelId)||1,
      levelName:String(roundEvidence.levelName||"Candle training"),
      attempts:Number(roundEvidence.attempts)||0,
      successes:Number(roundEvidence.successes)||0,
      averageScore:Number(roundEvidence.averageScore)||0,
      bestIntensityRatio:Number(roundEvidence.bestIntensityRatio)||0,
      bestStraightness:Number(roundEvidence.bestStraightness)||0,
      repeatabilityIndex:Number(roundEvidence.repeatabilityIndex)||0,
      limiter:String(roundEvidence.limiter||"repeatability"),
    },
    device:{
      sampleCount:Number(deviceReport.sampleCount)||0,
      observedWindowMs:Number(deviceReport.observedWindowMs)||0,
      delegate:deviceReport.delegate||null,
      status:String(deviceReport.status||"unknown"),
      metrics:{...(deviceReport.metrics||{})},
    },
    motionTrace,
  };

  return{ok:true,value};
}
