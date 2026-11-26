/* Local-only Pose Landmarker. No raw frames leave this worker. */
import {installHandEgressGuard} from './hand-egress.js';
const BASE=(import.meta.env.BASE_URL||'/').replace(/\/?$/,'/');
const sameOrigin=path=>new URL(BASE+path,self.location.origin).href;
const WASM_ROOT=sameOrigin('mediapipe/wasm');
const MODEL_URL=sameOrigin('models/pose_landmarker_lite.task');
let landmarker=null,guard=null,phase='new',initialized=false,disposed=false,processing=false,graphCreations=0;
let activeDelegate=null;
async function init(preferred){
 const started=performance.now();
 phase='import';
 guard=installHandEgressGuard(self,{getPhase:()=>phase,onBlock:event=>self.postMessage(event)});
 const {FilesetResolver,PoseLandmarker}=await import('@mediapipe/tasks-vision');
 phase='resolve-wasm';
 const vision=await FilesetResolver.forVisionTasks(WASM_ROOT,true);
 phase='fetch-model';
 const response=await fetch(MODEL_URL,{cache:'force-cache'});
 if(!response.ok)throw new Error('Local pose model unavailable: '+response.status);
 const model=new Uint8Array(await response.arrayBuffer());
 async function create(delegate){
  phase='create-'+delegate;
  const loader=new URL(vision.wasmLoaderPath,self.location.href);
  loader.searchParams.set('v','0.10.35');
  // 0.10.35 consumes ModuleFactory; bounded distinct local module identity
  // is required if automatic GPU initialization fails and CPU is created.
  loader.searchParams.set('graph',String(++graphCreations));
  if(graphCreations>2)throw new Error('Pose graph creation limit exceeded');
  return PoseLandmarker.createFromOptions({...vision,wasmLoaderPath:loader.href},{
    baseOptions:{modelAssetBuffer:model,delegate},runningMode:'VIDEO',numPoses:1,
    minPoseDetectionConfidence:.55,minPosePresenceConfidence:.55,minTrackingConfidence:.55,
    outputSegmentationMasks:false,
  });
 }
 let fallback;
 const first=preferred==='CPU'?'CPU':'GPU';
 try{landmarker=await create(first);activeDelegate=first;}
 catch(error){
  // Forced delegates are testable without silently accepting another backend.
  // Default remains GPU-first then CPU; privacy failure NEVER retries.
  if(guard.blocked||preferred==='GPU'||first==='CPU')throw error;
  landmarker=await create('CPU');activeDelegate='CPU';fallback='GPU initialization failed';
 }
 if(guard.blocked)throw new Error('Pose privacy latch tripped');
 if(disposed){landmarker.close();landmarker=null;return;}
 phase='idle';
 self.postMessage({type:'ready',delegate:activeDelegate,assetOrigin:self.location.origin,mode:'pose',initMs:performance.now()-started,...(fallback?{fallback}:{})});
}
self.onmessage=async({data})=>{
 if(data?.type==='init'){
  if(initialized||disposed)return;initialized=true;
  try{await init(data.delegate);}catch(error){self.postMessage({type:'error',error:String(error?.message||error)});}
  return;
 }
 if(data?.type==='dispose'){
  disposed=true;phase='dispose';
  try{landmarker?.close();landmarker=null;if(!guard?.blocked)self.postMessage({type:'disposed'});}
  catch(error){self.postMessage({type:'error',error:String(error?.message||error)});}
  return;
 }
 if(data?.type!=='frame')return;
 const bitmap=data.bitmap;
 if(!landmarker||processing||disposed||guard?.blocked){bitmap?.close?.();return;}
 processing=true;phase='inference';
 const started=performance.now();
 try{
  const result=landmarker.detectForVideo(bitmap,data.timestampMs);
  if(guard.blocked)throw new Error('Pose privacy latch tripped');
  self.postMessage({type:'result',timestampMs:data.timestampMs,inferenceMs:performance.now()-started,
    landmarks:result.landmarks?.[0]??null,worldLandmarks:result.worldLandmarks?.[0]??null});
 }catch(error){self.postMessage({type:'detect-error',error:String(error?.message||error)});}
 finally{bitmap?.close?.();processing=false;phase='idle';}
};
