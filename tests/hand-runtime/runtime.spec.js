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
    page.on('request',req=>{
      const url=new URL(req.url());
      if(['http:','https:'].includes(url.protocol)&&url.origin!=='http://127.0.0.1:4189')outgoing.push(url.origin);
    });
    await page.route('**/*',route=>{
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
    const pct=(arr,p)=>arr[Math.min(arr.length-1,Math.ceil(arr.length*p)-1)];
    const report={
      source:'https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/thumbs_up.jpg',
      fixtureSHA256:crypto.createHash('sha256').update(bytes).digest('hex'),
      requestedDelegate:delegate,actualDelegate:result.delegate,initMs:result.initMs,
      inferenceMedianMs:pct(sorted,.5),inferenceP90Ms:pct(sorted,.9),
      workerRoundTripP90Ms:pct(result.rows.map(r=>r.workerRoundTripMs).sort((a,b)=>a-b),.9),
      detectedStaticFrames:detected.length,staticFrames:staticRows.length,
      staticPreviews:staticRows.filter(r=>r.preview).length,
      staticConfirmed:staticRows.filter(r=>r.confirmed).length,
      transformedPhotoPreviewFrames:result.rows.filter(r=>r.label==='transformed-photo'&&r.preview).length,
      transformedPhotoConfirmed:result.rows.filter(r=>r.label==='transformed-photo'&&r.confirmed).length,
      blankTail:blank.slice(-3).map(r=>r.handCount),
      outgoing,rows:result.rows,
      limitations:'Actual model on photographed hand pixels; timestamps and image transforms simulated. Not real camera, human gesture accuracy, device FPS or punch force.',
    };
    fs.mkdirSync('hand-runtime-evidence',{recursive:true});
    fs.writeFileSync(path.join('hand-runtime-evidence',delegate+'.json'),JSON.stringify(report,null,2));
    await info.attach('numeric model evidence',{body:JSON.stringify(report,null,2),contentType:'application/json'});
    expect(['GPU','CPU']).toContain(result.delegate);
    if(delegate==='CPU')expect(result.delegate).toBe('CPU');
    expect(Number.isFinite(result.initMs)&&result.initMs>=0).toBeTruthy();
    expect(result.rows.every(r=>Number.isFinite(r.inferenceMs)&&r.inferenceMs>=0)).toBeTruthy();
    expect(detected.length,'real model must find actual landmarks on the public photo').toBeGreaterThanOrEqual(3);
    expect(report.staticPreviews).toBe(0);
    expect(report.staticConfirmed).toBe(0);
    expect(report.blankTail).toEqual([0,0,0]);
    expect(outgoing).toEqual([]);
  });
}
