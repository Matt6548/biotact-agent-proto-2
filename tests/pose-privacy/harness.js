import {FreePracticeCameraController} from '../../src/features/free-practice.js';
import {PoseTracker} from '../../src/vision/pose-tracker.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const image=async base64=>createImageBitmap(new Blob([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))],{type:'image/jpeg'}));
const finite33=p=>Array.isArray(p)&&p.length===33&&p.every(v=>[v.x,v.y,v.z].every(Number.isFinite));
window.auditPose=async({imageBase64,delegate})=>{
 const bitmap=await image(imageBase64);
 const worker=new Worker(new URL('./pose-audit-worker.js',import.meta.url),{type:'module'});
 try{return await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Legacy audit timeout')),145000);
  worker.onmessage=({data})=>{if(data.type==='audit-result'){clearTimeout(timer);resolve(data);}};
  worker.onerror=e=>{clearTimeout(timer);reject(new Error(e.message||'Legacy probe failed'));};
  worker.postMessage({type:'audit',bitmap,delegate},[bitmap]);
 });}finally{worker.terminate();}
};
window.localPose=async({imageBase64,delegate,durationMs=65000,injectGpuFailure=false})=>{
 const source=await image(imageBase64);
 const worker=injectGpuFailure
  ?new Worker(new URL('./pose-fallback-probe-worker.js',import.meta.url),{type:'module'})
  :new Worker(new URL('../../src/vision/pose-worker.js',import.meta.url),{type:'module'});
 const attempts=[],errors=[],samples=[];
 let pending=null,injectedFailures=0;
 worker.onmessage=({data})=>{
  if(data.type==='qa-injected-gpu-failure')injectedFailures++;
  if(data.type==='egress-blocked')attempts.push({origin:data.origin,phase:data.phase});
  if(['error','detect-error'].includes(data.type))errors.push(data.error);
  if(pending&&(pending.type===data.type||['egress-blocked','error','detect-error'].includes(data.type))){
   const p=pending;pending=null;clearTimeout(p.timer);
   if(p.type===data.type)p.resolve(data);else p.reject(new Error(data.type));
  }
 };
 worker.onerror=e=>{errors.push(e.message||'worker error');if(pending){const p=pending;pending=null;clearTimeout(p.timer);p.reject(new Error('worker error'));}};
 const request=(msg,type,transfer=[])=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending=null;reject(new Error('Timeout '+type));},30000);
  pending={type,resolve,reject,timer};worker.postMessage(msg,transfer);
 });
 let ready=null,frames=0,detected=0,worldDetected=0,invalid=0,activeMs=0,closed=false,error=null;
 try{
  ready=await request({type:'init',delegate},'ready');
  const start=performance.now();
  while(performance.now()-start<durationMs&&!attempts.length){
   const bitmap=await createImageBitmap(source);
   const stamp=performance.now();
   const r=await request({type:'frame',bitmap,timestampMs:stamp},'result',[bitmap]);
   frames++;samples.push(r.inferenceMs);
   if(finite33(r.landmarks))detected++;else if(r.landmarks!==null)invalid++;
   if(finite33(r.worldLandmarks))worldDetected++;else if(r.worldLandmarks!==null)invalid++;
   if(r.timestampMs!==stamp||!Number.isFinite(r.inferenceMs)||r.inferenceMs<0)invalid++;
   await sleep(250);
  }
  activeMs=performance.now()-start;
  await request({type:'dispose'},'disposed');closed=true;
  await sleep(1500);
 }catch(e){error=String(e?.message??e);}
 finally{worker.terminate();source.close();}
 samples.sort((a,b)=>a-b);
 const p=q=>samples.length?samples[Math.ceil(samples.length*q)-1]:null;
 return {requested:delegate,injectedFailures,delegate:ready?.delegate??null,fallback:ready?.fallback??null,initMs:ready?.initMs??null,frames,detected,worldDetected,invalid,activeMs,closed,attempts,errors,error,medianMs:p(.5),p90Ms:p(.9)};
};
window.cameraLifecycle=async()=>{
 const video=document.createElement('video');video.muted=true;video.playsInline=true;document.body.append(video);
 const statuses=[],attempts=[];let frames=0,controller,tracker,firstTracks=[],secondTracks=[];
 const until=async pred=>{const start=performance.now();while(!pred()){if(performance.now()-start>30000)throw Error('Camera condition timeout');await sleep(50);}};
 try{
  controller=new FreePracticeCameraController({video,onUpdate:()=>frames++,
   onStatus:s=>{statuses.push(s.state);if(s.state==='privacy-block')attempts.push(s.origin);},
   trackerFactory:args=>(tracker=new PoseTracker({...args,workerInit:{delegate:'CPU'}})),
  });
  await controller.start();await until(()=>frames>=2);
  firstTracks=video.srcObject.getTracks();const firstWorker=tracker.worker;
  const start=performance.now(),before=frames;
  await sleep(66000);
  const activeMs=performance.now()-start,activeFrames=frames-before;
  const live=firstTracks.every(t=>t.readyState==='live');
  const oldTracker=tracker;controller.pause();
  const pausedCount=frames;await sleep(700);
  const paused=firstTracks.every(t=>t.readyState==='ended')&&video.srcObject===null&&oldTracker.worker===null&&frames===pausedCount;
  await controller.resume();await until(()=>frames>pausedCount);
  secondTracks=video.srcObject.getTracks();
  const resumed=tracker.worker!==firstWorker&&secondTracks.every(t=>t.readyState==='live')&&secondTracks.every(t=>!firstTracks.includes(t));
  controller.stop();const stoppedCount=frames;await sleep(700);
  const stopped=secondTracks.every(t=>t.readyState==='ended')&&video.srcObject===null&&tracker.worker===null&&frames===stoppedCount;
  return {activeMs,activeFrames,live,paused,resumed,stopped,statuses,attempts};
 }finally{controller?.dispose();for(const t of [...firstTracks,...secondTracks])t.stop();video.remove();}
};
