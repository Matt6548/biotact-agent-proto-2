// Test only. Never imported by the product; uses an official public sample.
import { installHandEgressGuard } from '../../src/vision/hand-egress.js';
let phase='import';
const attempts=[];
const guard=installHandEgressGuard(self,{getPhase:()=>phase,onBlock:e=>attempts.push({origin:e.origin,phase:e.phase})});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
self.onmessage=async({data})=>{
 if(data.type!=='audit')return;
 const bitmap=data.bitmap;
 let model=null,frames=0,detected=0,finite=true,error=null,closed=false;
 let activeMs=0;
 try{
  const {PoseLandmarker,FilesetResolver}=await import('@mediapipe/legacy-qa');
  phase='local-assets';
  const vision=await FilesetResolver.forVisionTasks(new URL('/mediapipe/legacy-qa-wasm',self.location.origin).href,true);
  vision.wasmLoaderPath+='?v=1.1.1';
  const response=await fetch('/models/pose_landmarker_lite.task',{redirect:'error'});
  if(!response.ok)throw new Error('Missing local Pose model: '+response.status);
  phase='create-'+data.delegate;
  model=await PoseLandmarker.createFromOptions(vision,{baseOptions:{modelAssetBuffer:new Uint8Array(await response.arrayBuffer()),delegate:data.delegate},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.55,minPosePresenceConfidence:.55,minTrackingConfidence:.55,outputSegmentationMasks:false});
  const start=performance.now();
  phase='active-inference';
  while(performance.now()-start<65000&&!guard.blocked){
   const r=model.detectForVideo(bitmap,performance.now());
   frames++;
   const points=r.landmarks?.[0];
   if(points?.length===33){
    detected++;
    finite=finite&&points.every(p=>[p.x,p.y,p.z].every(Number.isFinite));
   }
   await sleep(250);
  }
  activeMs=performance.now()-start;
 }catch(e){error=String(e?.message??e);}
 finally{
  phase='close';
  if(model){try{model.close();closed=true;}catch(e){error??=String(e?.message??e);}}
  bitmap.close();
  // Allow queued close telemetry to reach the deny-only guard.
  await sleep(1500);
  self.postMessage({type:'audit-result',delegate:data.delegate,frames,detected,finite,activeMs,closed,blocked:guard.blocked,attempts,error});
 }
};
