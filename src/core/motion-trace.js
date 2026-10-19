const LANDMARK_INDICES=[11,12,13,14,15,16,23,24];
const WORLD_INDICES=[15,16];

function compactPoint(point){
  if(!point)return null;
  const out={
    x:Number(point.x)||0,
    y:Number(point.y)||0,
    z:Number(point.z)||0,
  };
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
  }

  start(startedAt=Date.now()){
    this.active=true;
    this.frames=[];
    this.startedAt=startedAt;
    this.stoppedAt=null;
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
      privacy:"Numeric pose landmarks only. No image, video, audio, name or location.",
      frameCount:this.frames.length,
      frames:this.frames,
    };
  }
}

export function validateMotionTrace(trace){
  if(!trace||trace.schema!=="martial-training-motion-trace/v1")return{ok:false,reason:"unsupported-schema"};
  if(!Array.isArray(trace.frames)||trace.frames.length===0)return{ok:false,reason:"empty-trace"};
  if(trace.frames.length>5000)return{ok:false,reason:"trace-too-large"};
  return{ok:true,frameCount:trace.frames.length};
}
