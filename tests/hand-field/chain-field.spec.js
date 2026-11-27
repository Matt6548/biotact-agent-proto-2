import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import crypto from 'node:crypto';

test('actual Hand model + camera stream + existing candle UI, long stationary and motion chain',async({page})=>{
 test.setTimeout(210000);
 const bytes=fs.readFileSync(process.env.HAND_FIELD_FIXTURE);
 const sha=crypto.createHash('sha256').update(bytes).digest('hex');
 expect(sha).toBe('2aee0e3a69ba5f0d3287597e61d265f4f3ac2a44ccec198dddd2639b0c8ef7ba');
 const origin='http://127.0.0.1:4191',external=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.context().on('request',req=>{const u=new URL(req.url());if(['http:','https:'].includes(u.protocol)&&u.origin!==origin)external.push(u.origin);});
 await page.context().route('**/*',route=>{const u=new URL(route.request().url());return ['http:','https:'].includes(u.protocol)&&u.origin!==origin?route.abort():route.continue();});
 // Replace only the source of camera pixels, not any model, analyzer or renderer.
 // The official public still image is transformed in real wall time.
 await page.addInitScript(({base64})=>{
   const stats={opens:0,results:0,detected:0,attempts:[],workerErrors:[],samples:[]};
   window.__fieldQA={stats,mode:'stationary',pulseStart:0,pulseDuration:820};
   const NativeWorker=window.Worker;
   window.Worker=class extends NativeWorker{
     constructor(...args){
       super(...args);
       this.addEventListener('message',({data})=>{
         if(data.type==='result'&&Array.isArray(data.hands)){
           stats.results++;
           if(data.hands.length===1&&data.hands[0]?.length===21)stats.detected++;
           const t=performance.now();
           stats.samples.push({t,ms:data.inferenceMs,count:data.hands.length});
           if(stats.samples.length>4000)stats.samples.shift();
         }else if(data.type==='egress-blocked')stats.attempts.push({origin:data.origin,phase:data.phase});
         else if(['error','detect-error'].includes(data.type))stats.workerErrors.push(data.type);
       });
     }
   };
   navigator.mediaDevices.getUserMedia=async()=>{
     stats.opens++;
     const image=await createImageBitmap(new Blob([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))],{type:'image/jpeg'}));
     const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
     const ctx=canvas.getContext('2d');
     const stream=canvas.captureStream(30),track=stream.getVideoTracks()[0];
     const draw=()=>{
       if(track.readyState!=='live'){clearInterval(timer);image.close();return;}
       const qa=window.__fieldQA,now=performance.now();
       let scale=.72;
       if(qa.mode==='motion'){
         const u=(now-qa.pulseStart)/qa.pulseDuration;
         if(u>0&&u<1)scale*=Math.exp(Math.log(1.48)*(u<.42?u/.42:(1-u)/.58));
       }
       ctx.fillStyle='#202020';ctx.fillRect(0,0,640,480);
       if(qa.mode!=='blank'){
         const fit=Math.min(640/image.width,480/image.height)*scale;
         const w=image.width*fit,h=image.height*fit;
         ctx.drawImage(image,(640-w)/2,(480-h)/2,w,h);
       }
     };
     const timer=setInterval(draw,1000/30);draw();
     return stream;
   };
 },{base64:bytes.toString('base64')});
 let report={fixtureSHA256:sha,scope:'Actual worker and app with synthetic canvas camera of public transformed photo. Not human gesture accuracy, physical camera or display latency.',external,errors};
 const count=async()=>Number(await page.locator('#round-count').textContent())||0;
 const live=()=>page.locator('#camera').evaluate(v=>Boolean(v.srcObject?.getVideoTracks().some(t=>t.readyState==='live')));
 try{
   await page.goto('/');await page.bringToFront();
   await expect(page.locator('.lab')).toHaveAttribute('data-tracking-mode','hand-field');
   await expect(page.locator('#target-canvas')).toHaveAttribute('data-renderer-kind','webgl');
   await expect(page.locator('#target-canvas canvas')).toHaveCount(1);
   await expect.poll(live).toBe(false);
   await page.getByRole('button',{name:'Начать упражнение'}).click();
   await expect(page.locator('#camera-status')).toContainText('Hand model ready · CPU',{timeout:30000});
   await expect(page.locator('#quality')).toHaveText('Кисть в кадре',{timeout:25000});
   const initial=await count();
   const start=await page.evaluate(()=>performance.now());
   // The old SDK attempted telemetry near 60 seconds. Do not stop the active model early.
   await page.waitForTimeout(65000);
   report.activeMs=await page.evaluate(start=>performance.now()-start,start);
   report.stationaryEvents=(await count())-initial;
   report.stationaryScore=await page.locator('#score').textContent();
   report.liveAfter65s=await live();
   expect(report.activeMs).toBeGreaterThanOrEqual(65000);
   expect(report.stationaryEvents).toBe(0);
   expect(report.stationaryScore).toBe('—');
   expect(report.liveAfter65s).toBe(true);
   await expect(page.locator('#camera-status')).toContainText('Hand model ready · CPU');
   // Three independently paced pulses. A missed pulse is retained in evidence.
   report.pulses=[];
   for(const duration of [820,1000,1250]){
     const before=await count();
     await page.evaluate(duration=>{const q=window.__fieldQA;q.mode='motion';q.pulseDuration=duration;q.pulseStart=performance.now()+200;},duration);
     await page.waitForTimeout(duration+1250);
     await page.evaluate(()=>{window.__fieldQA.mode='stationary';});
     const delta=(await count())-before;
     report.pulses.push({durationMs:duration,confirmed:delta,score:await page.locator('#score').textContent(),lastMotion:await page.locator('#last-strike').textContent(),flameStatus:await page.locator('#flame-state').textContent()});
     expect(delta).toBeLessThanOrEqual(1);
   }
   report.confirmed=report.pulses.reduce((n,p)=>n+p.confirmed,0);
   expect(report.confirmed,'at least one observed camera-to-UI response required').toBeGreaterThan(0);
   await expect(page.locator('#last-strike')).toContainText('Приближение кисти');
   await expect(page.locator('#score')).toHaveText(/^[0-9]+\.[0-9]+$/);
   const beforeBlank=await count();
   await page.evaluate(()=>{window.__fieldQA.mode='blank';});
   await expect(page.locator('#quality')).toHaveText('Нет уверенного отслеживания',{timeout:15000});
   await page.waitForTimeout(1000);
   expect(await count()).toBe(beforeBlank);
   await page.getByRole('button',{name:'Зажечь снова'}).click();
   await page.getByRole('button',{name:'Завершить'}).click();
   await expect.poll(live).toBe(false);
   report.stopped=true;
   await expect(page.locator('#target-canvas canvas')).toHaveCount(1);
   const stats=await page.evaluate(()=>window.__fieldQA.stats);
   expect(stats.opens).toBe(1);
   expect(stats.attempts).toEqual([]);
   expect(stats.workerErrors).toEqual([]);
   expect(external).toEqual([]);
   expect(errors).toEqual([]);
 }finally{
   const stats=await page.evaluate(()=>window.__fieldQA?.stats??null).catch(()=>null);
   report={...report,stats,external,errors};
   fs.mkdirSync('hand-field-evidence',{recursive:true});
   fs.writeFileSync('hand-field-evidence/chain.json',JSON.stringify(report,null,2));
   const {samples,...summary}=stats??{};
   console.log('HAND_FIELD_CHAIN '+JSON.stringify({...report,stats:summary}));
 }
});
