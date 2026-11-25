import {HandForwardAnalyzer} from '../../src/vision/hand-forward-analyzer.js';
import {FreePracticeEngine} from '../../src/features/free-practice.js';

function request(worker,message,transfer=[]){
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>finish(new Error('worker response timeout: '+message.type)),45000);
    const onMessage=({data})=>{
      if(['error','detect-error','egress-blocked'].includes(data.type))finish(new Error(data.type+': '+(data.error??data.origin)));
      else if((message.type==='init'&&data.type==='ready')||(message.type==='frame'&&data.type==='result')||(message.type==='dispose'&&data.type==='disposed'))finish(null,data);
    };
    const onError=event=>finish(new Error(event.message||'worker failed'));
    function finish(error,result){
      clearTimeout(timeout);
      worker.removeEventListener('message',onMessage);
      worker.removeEventListener('error',onError);
      if(error)reject(error);else resolve(result);
    }
    worker.addEventListener('message',onMessage);
    worker.addEventListener('error',onError);
    try{worker.postMessage(message,transfer);}catch(error){finish(error);}
  });
}
window.runHandRuntime=async({imageBase64,delegate})=>{
  const bytes=Uint8Array.from(atob(imageBase64),c=>c.charCodeAt(0));
  const image=await createImageBitmap(new Blob([bytes],{type:'image/jpeg'}));
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
  const ctx=canvas.getContext('2d');
  const worker=new Worker(new URL('../../src/vision/hand-worker.js',import.meta.url),{type:'module'});
  const privacyAttempts=[];
  worker.addEventListener('message',({data})=>{if(data.type==='egress-blocked')privacyAttempts.push({origin:data.origin,phase:data.phase});});
  const engine=new FreePracticeEngine({analyzer:new HandForwardAnalyzer({mirrorX:false})});
  engine.start();
  let clock=0;
  const rows=[];
  let finalDelegate=null;
  let wallEpoch=null,wallBase=0,lastCapture=null;
  let arrivals=[];
  try{
    const init=await request(worker,{type:'init',delegate});
    finalDelegate=init.delegate;
    async function frame(label,scale,blank=false,wall=false){
      if(wall&&lastCapture!==null)await new Promise(r=>setTimeout(r,Math.max(0,33-(performance.now()-lastCapture))));
      ctx.fillStyle='#202020';ctx.fillRect(0,0,640,480);
      if(!blank){
        const fit=Math.min(640/image.width,480/image.height)*scale;
        const w=image.width*fit,h=image.height*fit;
        ctx.drawImage(image,(640-w)/2,(480-h)/2,w,h);
      }
      const bitmap=await createImageBitmap(canvas);
      const before=performance.now();
      const stamp=wall?wallBase+before-wallEpoch:clock;
      const captureDeltaMs=wall&&lastCapture!==null?before-lastCapture:null;
      if(wall)lastCapture=before;
      const data=await request(worker,{type:'frame',bitmap,timestampMs:stamp},[bitmap]);
      const after=performance.now();
      if(data.delegateChanged)arrivals=[];
      if(wall){
        arrivals.push(after);
        arrivals=arrivals.filter(t=>after-t<=1000);
      }
      finalDelegate=data.delegate??finalDelegate;
      const fps=wall?arrivals.length:30;
      const result=engine.onFrame({...data,fps});
      rows.push({
        label,clock:stamp,landmarkCount:data.hands?.[0]?.length??0,handCount:data.hands?.length??0,
        clockMode:wall?'wall':'simulated',captureDeltaMs,observedFps:wall?fps:null,
        delegateUsed:data.delegateUsed??finalDelegate,delegateAfter:finalDelegate,
        delegateChanged:!!data.delegateChanged,switchInitMs:data.switchInitMs??null,
        finite:(data.hands??[]).every(hand=>hand.every(p=>[p.x,p.y,p.z].every(Number.isFinite))),
        inferenceMs:data.inferenceMs,workerRoundTripMs:after-before,
        quality:result.analysis.quality.ok,preview:!!result.analysis.previewMotion,confirmed:!!result.strike,
      });
      engine.tick(wall&&captureDeltaMs!==null?Math.min(.1,captureDeltaMs/1000):.033);
      if(!wall)clock+=33;
    }
    for(let i=0;i<15;i++)await frame('static',.82);
    for(const scale of [.72,.72,.78,.84,.91,.99,1.06,1.06,.99,.91,.84,.78,.72,.72])await frame('transformed-photo',scale);
    for(let i=0;i<8;i++)await frame('blank',1,true);
    // Independent phase using actual elapsed timestamps and measured result cadence.
    engine.pause();engine.resume();
    wallBase=clock;wallEpoch=performance.now();lastCapture=null;arrivals=[];
    for(let i=0;i<20;i++)await frame('cadence-static',.72,false,true);
    for(const scale of [.72,.72,.78,.84,.91,.99,1.06,1.06,.99,.91,.84,.78,.72,.72])await frame('cadence-transformed-photo',scale,false,true);
    for(let i=0;i<5;i++)await frame('cadence-blank',1,true,true);
    // Exercise the SDK's periodic timer and close path, not just brief inference.
    const idleMs=delegate==='CPU'?65000:500;
    await new Promise(r=>setTimeout(r,idleMs));
    await request(worker,{type:'dispose'});
    await new Promise(r=>setTimeout(r,1000));
    return {delegate:init.delegate,finalDelegate,initMs:init.initMs,rows,finalCount:engine.strikeCount,privacyAttempts,idleMs,disposed:true};
  }finally{
    worker.terminate();image.close();engine.stop();
  }
};

window.runLegacyHandProbe=async(imageBase64)=>{
 const bytes=Uint8Array.from(atob(imageBase64),c=>c.charCodeAt(0));
 const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/jpeg'}));
 const worker=new Worker(new URL('./legacy-probe-worker.js',import.meta.url),{type:'module'});
 try{
   return await new Promise((resolve,reject)=>{
     const timer=setTimeout(()=>reject(new Error('legacy probe timeout')),60000);
     worker.onmessage=({data})=>{if(data.type==='probe-result'){clearTimeout(timer);resolve(data);}};
     worker.onerror=e=>{clearTimeout(timer);reject(new Error(e.message||'legacy probe worker error'));};
     worker.postMessage({type:'probe',bitmap},[bitmap]);
   });
 }finally{worker.terminate();}
};
