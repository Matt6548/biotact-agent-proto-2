/* Opt-in Hand Landmarker worker. No raw frames or hand sequences leave this worker. */
import {HandDelegateLatencyGate} from './hand-runtime-policy.js';
import {installHandEgressGuard} from './hand-egress.js';
let FilesetResolver;
let HandLandmarker;
const BASE=(import.meta.env.BASE_URL||'/').replace(/\/?$/,'/');
const sameOrigin=(path)=>new URL(BASE+path,self.location.origin).href;
const WASM_ROOT=sameOrigin('mediapipe/hand-0.10.35');
const MODEL_URL=sameOrigin('models/hand_landmarker.task');
let landmarker=null;
let processing=false;
let guard=null;
let phase='new';
let initialized=false;
let disposed=false;
let activeDelegate=null;
let graphCreations=0;
let cpuFallbackAssets=null;
const latencyGate=new HandDelegateLatencyGate();

async function create(vision,model,delegate){
  // 0.10.35 consumes and clears self.ModuleFactory. The module loader is
  // cached by URL; a second graph needs the same pinned LOCAL loader bytes
  // under a distinct, bounded module identity. No eval or external origin.
  const loader=new URL(vision.wasmLoaderPath,self.location.href);
  loader.searchParams.set('graph',String(++graphCreations));
  if(graphCreations>2)throw new Error('Hand graph creation limit exceeded');
  return HandLandmarker.createFromOptions({...vision,wasmLoaderPath:loader.href},{
    baseOptions:{modelAssetBuffer:model,delegate},
    runningMode:'VIDEO',numHands:2,
    minHandDetectionConfidence:.65,
    minHandPresenceConfidence:.65,
    minTrackingConfidence:.65,
  });
}
async function init(preferredDelegate){
  const started=performance.now();
  phase='import';
  guard=installHandEgressGuard(self,{getPhase:()=>phase,onBlock:event=>self.postMessage(event)});
  const sdk=await import('@mediapipe/hand-local');
  FilesetResolver=sdk.FilesetResolver;
  HandLandmarker=sdk.HandLandmarker;
  phase='resolve-wasm';
  const vision=await FilesetResolver.forVisionTasks(WASM_ROOT.replace(/\/$/,''),true);
  vision.wasmLoaderPath=vision.wasmLoaderPath+'?v=0.10.35';
  phase='fetch-model';
  const response=await fetch(MODEL_URL,{cache:'force-cache'});
  if(!response.ok)throw new Error('Local hand model unavailable: '+response.status);
  const model=new Uint8Array(await response.arrayBuffer());
  // Conservative opt-in default; automatic and GPU modes are explicit.
  if(preferredDelegate!=='auto'&&preferredDelegate!=='GPU'){
    phase='create-cpu';
    landmarker=await create(vision,model,'CPU');
    activeDelegate='CPU';
    if(guard.blocked)throw new Error('Privacy latch tripped');
    phase='idle';
    self.postMessage({type:'ready',delegate:'CPU',initMs:performance.now()-started,assetOrigin:self.location.origin,mode:'hands'});
    return;
  }
  try{
    phase='create-gpu';
    landmarker=await create(vision,model,'GPU');
    activeDelegate='GPU';
    cpuFallbackAssets=preferredDelegate==='auto'?{vision,model}:null;
    if(guard.blocked)throw new Error('Privacy latch tripped');
    phase='idle';
    self.postMessage({type:'ready',delegate:'GPU',initMs:performance.now()-started,assetOrigin:self.location.origin,mode:'hands'});
  }catch(error){
    if(guard.blocked||preferredDelegate==='GPU')throw error;
    phase='create-cpu-fallback';
    landmarker=await create(vision,model,'CPU');
    activeDelegate='CPU';
    cpuFallbackAssets=null;
    if(guard.blocked)throw new Error('Privacy latch tripped');
    phase='idle';
    self.postMessage({type:'ready',delegate:'CPU',initMs:performance.now()-started,assetOrigin:self.location.origin,mode:'hands',fallback:'GPU initialization failed'});
  }
}
self.onmessage=async({data})=>{
  if(data?.type==='init'){
    if(initialized||disposed)return;
    initialized=true;
    try{await init(data.delegate);}catch(error){self.postMessage({type:'error',error:String(error?.message||error)});}
    return;
  }
  if(data?.type==='dispose'){
    if(processing){self.postMessage({type:'error',error:'Cannot dispose during inference'});return;}
    disposed=true;phase='dispose';
    try{landmarker?.close();landmarker=null;cpuFallbackAssets=null;
      if(!guard?.blocked)self.postMessage({type:'disposed'});
    }catch(error){self.postMessage({type:'error',error:String(error?.message||error)});}
    return;
  }
  if(data?.type!=='frame')return;
  const bitmap=data.bitmap;
  if(!landmarker||processing||disposed||guard?.blocked){bitmap?.close?.();return;}
  processing=true;
  const started=performance.now();
  try{
    phase='inference';
    const delegateUsed=activeDelegate;
    const result=landmarker.detectForVideo(bitmap,data.timestampMs);
    const inferenceMs=performance.now()-started;
    let delegateChanged=false;
    let switchInitMs=null;
    if(cpuFallbackAssets&&latencyGate.observe(inferenceMs,activeDelegate)){
      // Close the GPU graph before creating the CPU graph. Same worker,
      // same camera, one-time fallback. Discard transition landmarks.
      const fallbackStarted=performance.now();
      const {vision,model}=cpuFallbackAssets;
      cpuFallbackAssets=null;
      phase='switch-close-gpu';
      landmarker.close();
      landmarker=null;
      if(guard.blocked)throw new Error('Privacy latch tripped');
      phase='switch-create-cpu';
      landmarker=await create(vision,model,'CPU');
      activeDelegate='CPU';
      delegateChanged=true;
      switchInitMs=performance.now()-fallbackStarted;
    }
    if(guard.blocked)throw new Error('Privacy latch tripped');
    phase='idle';
    // Only transient numeric landmarks cross to the main thread, never pixels.
    self.postMessage({type:'result',timestampMs:data.timestampMs,
      inferenceMs,delegateUsed,delegate:activeDelegate,delegateChanged,switchInitMs,
      hands:delegateChanged?[]:(result.landmarks??[]),
      landmarks:null,worldLandmarks:null});
  }catch(error){self.postMessage({type:'detect-error',error:String(error?.message||error)});}
  finally{bitmap?.close?.();processing=false;}
};
