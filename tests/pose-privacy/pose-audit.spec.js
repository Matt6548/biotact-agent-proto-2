import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import crypto from 'node:crypto';
const origin='http://127.0.0.1:4190';
async function setup(page){
 const external=[];
 const context=page.context();
 context.on('request',req=>{const u=new URL(req.url());if(['http:','https:'].includes(u.protocol)&&u.origin!==origin)external.push(u.origin);});
 await context.route('**/*',route=>{const u=new URL(route.request().url());return ['http:','https:'].includes(u.protocol)&&u.origin!==origin?route.abort():route.continue();});
 await page.goto(origin+'/tests/pose-privacy/harness.html');
 await page.waitForFunction(()=>typeof window.localPose==='function');
 return external;
}
function fixture(){
 const bytes=fs.readFileSync(process.env.POSE_FIXTURE_PATH);
 const hash=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 expect(hash).toBe('69a5241ecb9d326ba7c71573f5b4fc14b12e9ca7');
 return {imageBase64:bytes.toString('base64'),fixtureBlob:hash};
}
function report(name,data){
 fs.mkdirSync('pose-audit-evidence',{recursive:true});
 fs.writeFileSync('pose-audit-evidence/'+name+'.json',JSON.stringify(data,null,2));
 console.log('POSE_LOCAL_EVIDENCE '+JSON.stringify(data));
}
for(const delegate of ['CPU','GPU']){
 test('local Pose actual product worker 65s active + close '+delegate,async({page})=>{
  const external=await setup(page),f=fixture();
  const result=await page.evaluate(args=>window.localPose(args),{imageBase64:f.imageBase64,delegate});
  report('local-'+delegate,{...result,external,fixtureBlob:f.fixtureBlob,scope:'Actual product worker, public static photo, real elapsed time; no human camera or hardware GPU performance claim.'});
  expect(result.delegate).toBe(delegate);
  expect(result.activeMs).toBeGreaterThanOrEqual(65000);
  expect(result.frames).toBeGreaterThan(20);
  expect(result.detected).toBeGreaterThanOrEqual(Math.ceil(result.frames*.9));
  expect(result.worldDetected).toBeGreaterThanOrEqual(Math.ceil(result.frames*.9));
  expect(result.invalid).toBe(0);expect(result.closed).toBe(true);
  expect(result.error).toBeNull();expect(result.errors).toEqual([]);expect(result.attempts).toEqual([]);expect(external).toEqual([]);
 });
 test('legacy Pose negative control periodic ODML '+delegate,async({page})=>{
  const external=await setup(page),f=fixture();
  const result=await page.evaluate(args=>window.auditPose(args),{imageBase64:f.imageBase64,delegate});
  report('legacy-'+delegate,{...result,external,fixtureBlob:f.fixtureBlob,scope:'Deliberate legacy diagnostic; blocked attempt is expected, not a PASS of legacy privacy.'});
  expect(result.frames).toBeGreaterThan(20);expect(result.detected).toBeGreaterThan(20);expect(result.finite).toBe(true);
  expect(result.blocked).toBe(true);expect(result.attempts.some(a=>a.origin==='https://odml.pa.googleapis.com'&&a.phase==='active-inference')).toBe(true);
  expect(result.activeMs).toBeGreaterThanOrEqual(55000);expect(external).toEqual([]);
 });
}
test('local Pose fake camera 66s active pause resume stop',async({page})=>{
 const external=await setup(page);
 const result=await page.evaluate(()=>window.cameraLifecycle());
 report('camera-lifecycle',{...result,external,scope:'Chromium fake camera, actual tracker and free-practice controller; no physical camera.'});
 expect(result.activeMs).toBeGreaterThanOrEqual(66000);expect(result.activeFrames).toBeGreaterThan(20);
 expect(result.live).toBe(true);expect(result.paused).toBe(true);expect(result.resumed).toBe(true);expect(result.stopped).toBe(true);
 expect(result.statuses).not.toContain('error');expect(result.statuses).not.toContain('privacy-block');expect(result.attempts).toEqual([]);expect(external).toEqual([]);
});
test('local Pose actual auto fallback after controlled GPU graph failure',async({page})=>{
 const external=await setup(page),f=fixture();
 const result=await page.evaluate(args=>window.localPose(args),{imageBase64:f.imageBase64,delegate:'auto',durationMs:2000,injectGpuFailure:true});
 report('auto-injected-gpu-failure',{...result,external,scope:'QA-only injected failure after real GPU graph creation/close, followed by real product CPU graph initialization. Not physical GPU absence.'});
 expect(result.injectedFailures).toBe(1);
 expect(result.delegate).toBe('CPU');expect(result.fallback).toBe('GPU initialization failed');
 expect(result.detected).toBeGreaterThan(0);expect(result.invalid).toBe(0);
 expect(result.closed).toBe(true);expect(result.error).toBeNull();expect(result.errors).toEqual([]);
 expect(result.attempts).toEqual([]);expect(external).toEqual([]);
});
