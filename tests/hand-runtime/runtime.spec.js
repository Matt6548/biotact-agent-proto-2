import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

for(const delegate of ['auto','CPU']){
  test('actual Hand Landmarker WASM inference on public hand pixels: '+delegate,async({page},info)=>{
    const fixture=process.env.HAND_FIXTURE_PATH;
    expect(fixture,'public hand fixture required').toBeTruthy();
    const bytes=fs.readFileSync(fixture);
    const outgoing=[];
    page.context().on('request',req=>{
      const url=new URL(req.url());
      if(['http:','https:'].includes(url.protocol)&&url.origin!=='http://127.0.0.1:4189')outgoing.push(url.origin);
    });
    await page.context().route('**/*',route=>{
      const url=new URL(route.request().url());
      return ['http:','https:'].includes(url.protocol)&&url.origin!=='http://127.0.0.1:4189'?route.abort():route.continue();
    });
    await page.goto('/tests/hand-runtime/harness.html');
    await page.waitForFunction(()=>typeof window.runHandRuntime==='function');
    const result=await page.evaluate(args=>window.runHandRuntime(args),{
      imageBase64:bytes.toString('base64'),delegate,
    });
    const staticRows=result.rows.filter(r=>r.label==='static');
    const detected=staticRows.filter(r=>r.handCount===1&&r.landmarkCount===21&&r.finite);
    const blank=result.rows.filter(r=>r.label==='blank');
    const sorted=result.rows.map(r=>r.inferenceMs).sort((a,b)=>a-b);
    const switched=result.rows.filter(r=>r.delegateChanged);
    const cadence=result.rows.filter(r=>r.clockMode==='wall');
    const cadenceStatic=cadence.filter(r=>r.label==='cadence-static');
    const cadenceMotion=cadence.filter(r=>r.label==='cadence-transformed-photo');
    const byDelegate={};
    for(const d of ['GPU','CPU']){
      const samples=result.rows.filter(r=>r.delegateUsed===d).map(r=>r.inferenceMs).sort((a,b)=>a-b);
      if(samples.length)byDelegate[d]={samples:samples.length,medianMs:samples[Math.ceil(samples.length*.5)-1],p90Ms:samples[Math.ceil(samples.length*.9)-1]};
    }
    const pct=(arr,p)=>arr[Math.min(arr.length-1,Math.ceil(arr.length*p)-1)];
    const report={
      source:'https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/thumbs_up.jpg',
      fixtureSHA256:crypto.createHash('sha256').update(bytes).digest('hex'),
      requestedDelegate:delegate,initialDelegate:result.delegate,actualDelegate:result.finalDelegate,initMs:result.initMs,
      switchCount:switched.length,switchInitMs:switched[0]?.switchInitMs??null,byDelegate,
      inferenceMedianMs:pct(sorted,.5),inferenceP90Ms:pct(sorted,.9),
      workerRoundTripP90Ms:pct(result.rows.map(r=>r.workerRoundTripMs).sort((a,b)=>a-b),.9),
      detectedStaticFrames:detected.length,staticFrames:staticRows.length,
      staticPreviews:staticRows.filter(r=>r.preview).length,
      staticConfirmed:staticRows.filter(r=>r.confirmed).length,
      transformedPhotoPreviewFrames:result.rows.filter(r=>r.label==='transformed-photo'&&r.preview).length,
      transformedPhotoConfirmed:result.rows.filter(r=>r.label==='transformed-photo'&&r.confirmed).length,
      blankTail:blank.slice(-3).map(r=>r.handCount),
      cadenceStaticPreviews:cadenceStatic.filter(r=>r.preview).length,
      cadenceStaticConfirmed:cadenceStatic.filter(r=>r.confirmed).length,
      cadenceMotionPreviews:cadenceMotion.filter(r=>r.preview).length,
      cadenceMotionConfirmed:cadenceMotion.filter(r=>r.confirmed).length,
      cadenceObservedFpsMedian:pct(cadence.slice(12).map(r=>r.observedFps).sort((a,b)=>a-b),.5),
      cadenceCaptureDeltaP90Ms:pct(cadence.slice(1).map(r=>r.captureDeltaMs).sort((a,b)=>a-b),.9),
      cadenceRoundTripP90Ms:pct(cadence.map(r=>r.workerRoundTripMs).sort((a,b)=>a-b),.9),
      simulatedPreviewFirstMs:result.rows.find(r=>r.label==='transformed-photo'&&r.preview)?.clock??null,
      simulatedConfirmedFirstMs:result.rows.find(r=>r.label==='transformed-photo'&&r.confirmed)?.clock??null,
      outgoing,privacyAttempts:result.privacyAttempts,idleMs:result.idleMs,disposed:result.disposed,rows:result.rows,
      limitations:'Actual model on photographed hand pixels. First phase uses simulated timestamps; second uses real elapsed time and inference cadence, but still a transformed photo, not a live person/camera or device FPS.',
    };
    fs.mkdirSync('hand-runtime-evidence',{recursive:true});
    fs.writeFileSync(path.join('hand-runtime-evidence',delegate+'.json'),JSON.stringify(report,null,2));
    await info.attach('numeric model evidence',{body:JSON.stringify(report,null,2),contentType:'application/json'});
    const {rows,...summary}=report;
    console.log('HAND_RUNTIME_SUMMARY '+JSON.stringify(summary));
    expect(['GPU','CPU']).toContain(result.delegate);
    if(delegate==='CPU'){
      expect(result.delegate).toBe('CPU');
      expect(switched).toHaveLength(0);
    }
    expect(switched.length).toBeLessThanOrEqual(1);
    if(delegate==='auto'&&result.delegate==='GPU'){
      const gpu=result.rows.filter(r=>r.delegateUsed==='GPU').slice(2);
      const needsSwitch=gpu.some((_,i)=>gpu.slice(i,i+3).length===3&&gpu.slice(i,i+3).every(r=>r.inferenceMs>120));
      if(needsSwitch)expect(switched.length,'sustained slow GPU must actually switch').toBe(1);
    }
    if(switched.length){
      expect(result.delegate).toBe('GPU');
      expect(result.finalDelegate).toBe('CPU');
      expect(switched[0].delegateAfter).toBe('CPU');
      expect(switched[0].handCount).toBe(0);
      expect(byDelegate.CPU.samples).toBeGreaterThan(3);
    }
    expect(Number.isFinite(result.initMs)&&result.initMs>=0).toBeTruthy();
    expect(result.rows.every(r=>Number.isFinite(r.inferenceMs)&&r.inferenceMs>=0)).toBeTruthy();
    expect(detected.length,'real model must find actual landmarks on the public photo').toBeGreaterThanOrEqual(3);
    expect(report.staticPreviews).toBe(0);
    expect(report.staticConfirmed).toBe(0);
    expect(report.cadenceStaticPreviews).toBe(0);
    expect(report.cadenceStaticConfirmed).toBe(0);
    expect(report.transformedPhotoPreviewFrames).toBeGreaterThan(0);
    expect(report.transformedPhotoConfirmed).toBe(1);
    expect(report.simulatedPreviewFirstMs).toBeLessThan(report.simulatedConfirmedFirstMs);
    expect(report.blankTail).toEqual([0,0,0]);
    expect(outgoing).toEqual([]);
    expect(result.privacyAttempts).toEqual([]);
    expect(result.disposed).toBe(true);
    if(delegate==='CPU')expect(result.idleMs).toBeGreaterThanOrEqual(65000);
  });
}

test('reproduce legacy 1.1.1 close-path egress without external transport',async({page})=>{
 const bytes=fs.readFileSync(process.env.HAND_FIXTURE_PATH);
 const external=[];
 await page.context().route('**/*',route=>{
   const url=new URL(route.request().url());
   if(['http:','https:'].includes(url.protocol)&&url.origin!=='http://127.0.0.1:4189'){
     external.push(url.origin);return route.abort();
   }
   return route.continue();
 });
 await page.goto('/tests/hand-runtime/harness.html');
 await page.waitForFunction(()=>typeof window.runLegacyHandProbe==='function');
 const result=await page.evaluate(base64=>window.runLegacyHandProbe(base64),bytes.toString('base64'));
 fs.mkdirSync('hand-runtime-evidence',{recursive:true});
 const report={...result,external,scope:'Deliberate old-SDK public-image diagnostic, never the new runtime.'};
 fs.writeFileSync('hand-runtime-evidence/legacy-close.json',JSON.stringify(report,null,2));
 console.log('LEGACY_HAND_PROBE '+JSON.stringify(report));
 expect(result.frames).toBe(6);
 expect(result.attempts.some(a=>a.origin==='https://odml.pa.googleapis.com'&&a.phase==='legacy-close')).toBe(true);
 expect(result.blocked).toBe(true);
 expect(external).toEqual([]);
});
