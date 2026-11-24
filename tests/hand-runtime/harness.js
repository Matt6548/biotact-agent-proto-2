import {HandForwardAnalyzer} from '../../src/vision/hand-forward-analyzer.js';
import {FreePracticeEngine} from '../../src/features/free-practice.js';

function request(worker,message,transfer=[]){
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>finish(new Error('worker response timeout: '+message.type)),45000);
    const onMessage=({data})=>{
      if(['error','detect-error','egress-blocked'].includes(data.type))finish(new Error(data.type+': '+(data.error??data.origin)));
      else if((message.type==='init'&&data.type==='ready')||(message.type==='frame'&&data.type==='result'))finish(null,data);
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
  const engine=new FreePracticeEngine({analyzer:new HandForwardAnalyzer({mirrorX:false})});
  engine.start();
  let clock=0;
  const rows=[];
  try{
    const init=await request(worker,{type:'init',delegate});
    async function frame(label,scale,blank=false){
      ctx.fillStyle='#202020';ctx.fillRect(0,0,640,480);
      if(!blank){
        const fit=Math.min(640/image.width,480/image.height)*scale;
        const w=image.width*fit,h=image.height*fit;
        ctx.drawImage(image,(640-w)/2,(480-h)/2,w,h);
      }
      const bitmap=await createImageBitmap(canvas);
      const before=performance.now();
      const data=await request(worker,{type:'frame',bitmap,timestampMs:clock},[bitmap]);
      const result=engine.onFrame({...data,fps:30});
      rows.push({
        label,clock,landmarkCount:data.hands?.[0]?.length??0,handCount:data.hands?.length??0,
        finite:(data.hands??[]).every(hand=>hand.every(p=>[p.x,p.y,p.z].every(Number.isFinite))),
        inferenceMs:data.inferenceMs,workerRoundTripMs:performance.now()-before,
        quality:result.analysis.quality.ok,preview:!!result.analysis.previewMotion,confirmed:!!result.strike,
      });
      engine.tick(.033);clock+=33;
    }
    for(let i=0;i<15;i++)await frame('static',.82);
    for(const scale of [.72,.72,.78,.84,.91,.99,1.06,1.06,.99,.91,.84,.78,.72,.72])await frame('transformed-photo',scale);
    for(let i=0;i<8;i++)await frame('blank',1,true);
    return {delegate:init.delegate,initMs:init.initMs,rows,finalCount:engine.strikeCount};
  }finally{
    worker.terminate();image.close();engine.stop();
  }
};
