import test from 'node:test';
import assert from 'node:assert/strict';
import {TrackingRenderBudget,TRACKING_TIERS,budgetPixelRatio} from '../src/render/tracking-render-budget.js';
function feed(g,fps,ms,start=0){for(let t=start;t<=start+ms;t+=100)g.sample(fps,t);}
test('initial tracking budget lowers after sustained low camera cadence, not a single slow frame',()=>{
 const g=new TrackingRenderBudget();g.setActive(true);assert.equal(g.index,1);
 feed(g,4,500);assert.equal(g.index,1);
 feed(g,4,1300,600);assert.equal(g.index,2);
 feed(g,4,1000,2000);assert.equal(g.index,2);
 feed(g,4,5000,3100);assert.equal(g.index,3);
 feed(g,3,5000,8200);assert.equal(g.index,3);
});
test('quality recovers slowly and resets when camera is stopped',()=>{
 const g=new TrackingRenderBudget();g.setActive(true);feed(g,4,1500);
 assert.equal(g.index,2);feed(g,15,4000,1600);assert.equal(g.index,2);
 feed(g,15,9000,5700);assert.equal(g.index,1);
 assert.equal(g.setActive(false),true);assert.equal(g.active,false);assert.equal(g.sample(0,99999),false);
 assert.equal(g.setActive(true),true);assert.equal(g.index,1);
});
test('actual drawing-buffer cap is proportional, native quality never exceeded',()=>{
 for(const tier of TRACKING_TIERS)for(const [w,h,r] of [[1200,720,2],[390,600,1.35],[100,100,1]]){
  const v=budgetPixelRatio(w,h,r,tier.maxPixels);
  assert.ok(v<=r);assert.ok(w*h*v*v<=tier.maxPixels+1e-6);
 }
});
test('long pauses, repeated and nonfinite timestamps never count as sustained load',()=>{
 const g=new TrackingRenderBudget();g.setActive(true);
 g.sample(3,0);g.sample(3,500);g.sample(3,10000);g.sample(3,10000);g.sample(3,NaN);
 assert.equal(g.index,1);g.sample(3,10500);assert.equal(g.index,1);
});
