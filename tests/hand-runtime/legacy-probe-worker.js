// QA-only controlled reproduction of old 1.1.1 SDK logging. This worker is
// never imported by the product. Uses a public sample only; guard never sends.
import {installHandEgressGuard} from '../../src/vision/hand-egress.js';
let phase='legacy-import';
const attempts=[];
const guard=installHandEgressGuard(self,{getPhase:()=>phase,onBlock:e=>attempts.push({origin:e.origin,phase:e.phase})});
self.onmessage=async({data})=>{
 if(data.type!=='probe')return;
 const bitmap=data.bitmap;
 let model=null;
 let error=null;
 let frames=0;
 try{
  const {HandLandmarker,FilesetResolver}=await import('@mediapipe/tasks-vision');
  phase='legacy-load';
  const files=await FilesetResolver.forVisionTasks(new URL('/mediapipe/wasm',self.location.origin).href,true);
  files.wasmLoaderPath+='?v=1.1.1';
  const response=await fetch('/models/hand_landmarker.task');
  if(!response.ok)throw new Error('Missing local model');
  phase='legacy-create-gpu';
  model=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetBuffer:new Uint8Array(await response.arrayBuffer()),delegate:'GPU'},runningMode:'VIDEO',numHands:2});
  phase='legacy-infer';
  for(let i=0;i<6;i++){
   model.detectForVideo(bitmap,i*33);frames++;
  }
  phase='legacy-close';
  model.close();model=null;
  await new Promise(r=>setTimeout(r,1500));
 }catch(e){error=String(e?.message??e);}
 finally{
  bitmap.close();
  if(model){phase='legacy-cleanup';try{model.close();}catch{}}
  await new Promise(r=>setTimeout(r,250));
  self.postMessage({type:'probe-result',attempts,frames,blocked:guard.blocked,error});
 }
};
