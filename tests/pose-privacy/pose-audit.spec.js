import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import crypto from 'node:crypto';
for(const delegate of ['CPU','GPU']){
 test('legacy Pose 1.1.1: 65s active inference and close, no egress: '+delegate,async({page})=>{
  const bytes=fs.readFileSync(process.env.POSE_FIXTURE_PATH);
  const blobHash=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  expect(blobHash).toBe('69a5241ecb9d326ba7c71573f5b4fc14b12e9ca7');
  const origin='http://127.0.0.1:4190';
  const external=[];
  page.context().on('request',req=>{
   const u=new URL(req.url());
   if(['http:','https:'].includes(u.protocol)&&u.origin!==origin)external.push(u.origin);
  });
  await page.context().route('**/*',route=>{
   const u=new URL(route.request().url());
   return ['http:','https:'].includes(u.protocol)&&u.origin!==origin?route.abort():route.continue();
  });
  await page.goto('/tests/pose-privacy/harness.html');
  await page.waitForFunction(()=>typeof window.auditPose==='function');
  const result=await page.evaluate(args=>window.auditPose(args),{imageBase64:bytes.toString('base64'),delegate});
  const report={...result,external,fixtureBlob:blobHash,scope:'Public still image, direct guarded SDK probe; not the user camera or proof of product-wide privacy.'};
  fs.mkdirSync('pose-audit-evidence',{recursive:true});
  fs.writeFileSync('pose-audit-evidence/'+delegate+'.json',JSON.stringify(report,null,2));
  console.log('POSE_PRIVACY_AUDIT '+JSON.stringify(report));
  expect(external,'external browser requests').toEqual([]);
  expect(result.attempts,'worker attempts must remain empty').toEqual([]);
  expect(result.error).toBeNull();
  expect(result.frames).toBeGreaterThan(0);
  expect(result.detected,'actual 33-landmark inference').toBeGreaterThan(0);
  expect(result.finite).toBe(true);
  expect(result.activeMs).toBeGreaterThanOrEqual(65000);
  expect(result.closed).toBe(true);
 });
}
