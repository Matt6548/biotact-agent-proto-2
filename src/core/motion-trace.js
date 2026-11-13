const LANDMARK_INDICES=[11,12,13,14,15,16,23,24];
const WORLD_INDICES=[15,16];

function compactPoint(point){
  if(!point)return null;
  const out={x:Number(point.x)||0,y:Number(point.y)||0,z:Number(point.z)||0};
  if(Number.isFinite(point.visibility))out.v=point.visibility;
  return out;
}

function expandPoint(point){
  if(!point)return null;
  return{
    x:Number(point.x)||0,
    y:Number(point.y)||0,
    z:Number(point.z)||0,
    visibility:Number.isFinite(point.v)?point.v:1,
  };
}

export function compactPoseFrame({landmarks,worldLandmarks,timestampMs,fps}={}){
  if(!landmarks||!worldLandmarks)return null;
  const l={},w={};
  for(const index of LANDMARK_INDICES)l[index]=compactPoint(landmarks[index]);
  for(const index of WORLD_INDICES)w[index]=compactPoint(worldLandmarks[index]);
  return{
    t:Math.round(Number(timestampMs)||0),
    fps:Math.max(0,Math.round(Number(fps)||0)),
    l,w
  };
}

export function expandPoseFrame(frame){
  if(!frame)return null;
  const landmarks=Array(33).fill(null);
  const worldLandmarks=Array(33).fill(null);
  for(const [index,point] of Object.entries(frame.l||{}))landmarks[Number(index)]=expandPoint(point);
  for(const [index,point] of Object.entries(frame.w||{}))worldLandmarks[Number(index)]=expandPoint(point);
  return{
    landmarks,
    worldLandmarks,
    timestampMs:Number(frame.t)||0,
    fps:Number(frame.fps)||0,
  };
}

export class MotionTraceRecorder{
  constructor({maxFrames=900}={}){
    this.maxFrames=maxFrames;
    this.reset();
  }

  reset(){
    this.active=false;
    this.frames=[];
    this.startedAt=null;
    this.stoppedAt=null;
    this.detectorProfile=null;
  }

  start({startedAt=Date.now(),detectorProfile=null}={}){
    this.active=true;
    this.frames=[];
    this.startedAt=startedAt;
    this.stoppedAt=null;
    this.detectorProfile=detectorProfile?.detector?{
      baseline:Number(detectorProfile.baseline)||0,
      peak:Number(detectorProfile.peak)||0,
      detector:{...detectorProfile.detector},
    }:null;
  }

  add(result){
    if(!this.active||this.frames.length>=this.maxFrames)return false;
    const frame=compactPoseFrame(result);
    if(!frame)return false;
    this.frames.push(frame);
    if(this.frames.length>=this.maxFrames)this.active=false;
    return true;
  }

  stop(stoppedAt=Date.now()){
    this.active=false;
    this.stoppedAt=stoppedAt;
    return this.export();
  }

  export(){
    return{
      schema:"martial-training-motion-trace/v1",
      createdAt:new Date(this.startedAt||Date.now()).toISOString(),
      stoppedAt:this.stoppedAt?new Date(this.stoppedAt).toISOString():null,
      privacy:"Numeric motion landmarks only. No image, video, audio, name or location. Motion traces can still be sensitive movement data; they remain local unless you explicitly export or share the file.",
      detectorProfile:this.detectorProfile,
      frameCount:this.frames.length,
      frames:this.frames,
    };
  }
}

// Stage 30: Replay untrusted imported traces only after validating each compact frame.
// Numeric landmarks are sensitive data; never allow arbitrary metadata to travel in frames.
function exactKeys(object,keys){
  return object!==null&&typeof object==="object"&&!Array.isArray(object)&&
    Object.keys(object).length===keys.length&&keys.every((key)=>Object.hasOwn(object,key));
}

function validPoint(point){
  if(point===null)return true; // Lost/occluded landmarks are expected in real recordings.
  if(!point||typeof point!=="object"||Array.isArray(point))return false;
  const keys=Object.keys(point);
  if(keys.some((key)=>!["x","y","z","v"].includes(key)))return false;
  if(!["x","y","z"].every((key)=>typeof point[key]==="number"&&Number.isFinite(point[key])&&Math.abs(point[key])<=1000))return false;
  return !Object.hasOwn(point,"v")||
    (typeof point.v==="number"&&Number.isFinite(point.v)&&point.v>=0&&point.v<=1);
}

function validPointMap(map,indices){
  const keys=indices.map(String);
  return exactKeys(map,keys)&&keys.every((key)=>validPoint(map[key]));
}

export function validateMotionTrace(trace){
  if(!trace||trace.schema!=="martial-training-motion-trace/v1")return{ok:false,reason:"unsupported-schema"};
  if(!Array.isArray(trace.frames)||trace.frames.length===0)return{ok:false,reason:"empty-trace"};
  if(trace.frames.length>5000)return{ok:false,reason:"trace-too-large"};
  if(Object.hasOwn(trace,"frameCount")&&trace.frameCount!==trace.frames.length)return{ok:false,reason:"invalid-frame-count"};
  let previousT=-Infinity;
  for(const frame of trace.frames){
    if(!exactKeys(frame,["t","fps","l","w"])||
       !Number.isSafeInteger(frame.t)||frame.t<0||
       !Number.isInteger(frame.fps)||frame.fps<0||frame.fps>1000||
       !validPointMap(frame.l,LANDMARK_INDICES)||
       !validPointMap(frame.w,WORLD_INDICES)){
      return{ok:false,reason:"invalid-frame"};
    }
    if(frame.t<previousT)return{ok:false,reason:"nonmonotonic-timestamps"};
    previousT=frame.t;
  }
  return{ok:true,frameCount:trace.frames.length};
}

export async function replayMotionTrace(trace,{onFrame,speed=4}={}){
  const validation=validateMotionTrace(trace);
  if(!validation.ok)throw new Error(validation.reason);
  if(typeof onFrame!=="function")throw new Error("onFrame callback is required");

  let previousT=null;
  for(const compact of trace.frames){
    const currentT=Number(compact.t)||0;
    if(previousT!==null){
      const delta=Math.max(0,currentT-previousT);
      const delay=Number.isFinite(speed)&&speed>0?Math.min(100,delta/speed):0;
      if(delay>0)await new Promise((resolve)=>setTimeout(resolve,delay));
    }
    onFrame(expandPoseFrame(compact));
    previousT=currentT;
  }
  return validation;
}
