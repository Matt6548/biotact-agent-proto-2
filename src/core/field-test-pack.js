const LANDMARK_INDICES=[11,12,13,14,15,16,23,24];
const WORLD_INDICES=[15,16];

const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;

function cleanPoint(point){
  if(!point||typeof point!=="object")return null;
  const out={x:finite(point.x),y:finite(point.y),z:finite(point.z)};
  if(Number.isFinite(Number(point.v)))out.v=Number(point.v);
  return out;
}

function cleanPointMap(source,indices){
  const out={};
  for(const index of indices)out[index]=cleanPoint(source?.[index]);
  return out;
}

function cleanDate(value){
  const time=Date.parse(value);
  return Number.isFinite(time)?new Date(time).toISOString():null;
}

function cleanDetectorProfile(profile){
  if(!profile||typeof profile!=="object")return null;
  return{
    baseline:finite(profile.baseline),
    peak:finite(profile.peak),
    detector:{
      startSpeed:finite(profile.detector?.startSpeed),
      releaseSpeed:finite(profile.detector?.releaseSpeed),
      minPeakSpeed:finite(profile.detector?.minPeakSpeed),
    },
  };
}

function cleanMotionTrace(trace){
  const frames=trace.frames.map((frame)=>({
    t:Math.round(finite(frame?.t)),
    fps:Math.max(0,Math.round(finite(frame?.fps))),
    l:cleanPointMap(frame?.l,LANDMARK_INDICES),
    w:cleanPointMap(frame?.w,WORLD_INDICES),
  }));

  return{
    schema:"martial-training-motion-trace/v1",
    createdAt:cleanDate(trace.createdAt),
    stoppedAt:cleanDate(trace.stoppedAt),
    privacy:"Numeric movement coordinates only. No image, video, audio, player name, account or location. Motion traces can still be sensitive movement data.",
    detectorProfile:cleanDetectorProfile(trace.detectorProfile),
    frameCount:frames.length,
    frames,
  };
}

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
    checkpoint:"stage-29.1",
    privacy:{
      containsPlayerName:false,
      containsAccount:false,
      containsVideo:false,
      containsAudio:false,
      containsRawDeviceIdentifier:false,
      containsMotionCoordinates:true,
      note:"This pack is created only by explicit export. The embedded allowlisted motion trace contains numeric movement coordinates and should be treated as sensitive movement data.",
    },
    round:{
      levelId:Number(roundEvidence.levelId)||1,
      levelName:String(roundEvidence.levelName||"Candle training").slice(0,40),
      attempts:Number(roundEvidence.attempts)||0,
      successes:Number(roundEvidence.successes)||0,
      averageScore:Number(roundEvidence.averageScore)||0,
      bestIntensityRatio:Number(roundEvidence.bestIntensityRatio)||0,
      bestStraightness:Number(roundEvidence.bestStraightness)||0,
      repeatabilityIndex:Number(roundEvidence.repeatabilityIndex)||0,
      limiter:String(roundEvidence.limiter||"repeatability").slice(0,40),
    },
    device:{
      sampleCount:Number(deviceReport.sampleCount)||0,
      observedWindowMs:Number(deviceReport.observedWindowMs)||0,
      delegate:["GPU","CPU"].includes(deviceReport.delegate)?deviceReport.delegate:null,
      status:["ready","constrained","limited"].includes(deviceReport.status)?deviceReport.status:"unknown",
      metrics:{
        medianFps:finite(deviceReport.metrics?.medianFps,null),
        p10Fps:finite(deviceReport.metrics?.p10Fps,null),
        medianInferenceMs:finite(deviceReport.metrics?.medianInferenceMs,null),
        p90InferenceMs:finite(deviceReport.metrics?.p90InferenceMs,null),
        medianBusySkipsPerSecond:finite(deviceReport.metrics?.medianBusySkipsPerSecond,null),
        maxBusySkipsPerSecond:finite(deviceReport.metrics?.maxBusySkipsPerSecond,null),
      },
    },
    motionTrace:cleanMotionTrace(motionTrace),
  };

  return{ok:true,value};
}
