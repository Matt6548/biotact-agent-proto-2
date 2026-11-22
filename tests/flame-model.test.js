import test from "node:test";import assert from "node:assert/strict";import{FlameModel}from"../src/core/flame-model.js";
test("distance attenuates effective stress",()=>{const near=new FlameModel().applyAirImpulse({impulse:1,alignment:1,distance:.1});const far=new FlameModel().applyAirImpulse({impulse:1,alignment:1,distance:.8});assert.ok(near.effectiveStress>far.effectiveStress)});
test("poor alignment attenuates effective stress",()=>{const a=new FlameModel().applyAirImpulse({impulse:1,alignment:1,distance:.2});const b=new FlameModel().applyAirImpulse({impulse:1,alignment:.4,distance:.2});assert.ok(a.effectiveStress>b.effectiveStress)});
test("sufficient stress extinguishes",()=>{const f=new FlameModel({extinctionThreshold:.6});assert.equal(f.applyAirImpulse({impulse:2,alignment:1,distance:.1}).extinguished,true)});
test("reset restores stable flame",()=>{const f=new FlameModel({extinctionThreshold:.2});f.applyAirImpulse({impulse:2,alignment:1,distance:0});f.reset();assert.deepEqual(f.snapshot(),{tilt:0,instability:0,stability:1,extinguished:false})});

test("opposite visual directions bend the flame in opposite directions",()=>{
  const right=new FlameModel().applyAirImpulse({impulse:.6,distance:.2,direction:1});
  const left=new FlameModel().applyAirImpulse({impulse:.6,distance:.2,direction:-1});
  assert.ok(right.tilt>0);
  assert.ok(left.tilt<0);
  assert.ok(Math.abs(right.tilt+left.tilt)<1e-9);
});

test("damped flame settles instead of abruptly losing its angle",()=>{
  const flame=new FlameModel({extinctionThreshold:3});
  flame.applyAirImpulse({impulse:.8,distance:.2});
  const initial=flame.snapshot();
  assert.ok(initial.tilt>0);
  assert.ok(flame.step(1/60).tilt>initial.tilt);
  for(let i=0;i<240;i++)flame.step(1/60);
  assert.ok(Math.abs(flame.snapshot().tilt)<.005);
  assert.ok(flame.snapshot().stability>.99);
});

test("oscillator remains finite and nearly frame-rate independent",()=>{
  const fast=new FlameModel({extinctionThreshold:3});
  const slow=new FlameModel({extinctionThreshold:3});
  fast.applyAirImpulse({impulse:.7,distance:.15});
  slow.applyAirImpulse({impulse:.7,distance:.15});
  for(let i=0;i<60;i++)fast.step(1/60);
  for(let i=0;i<10;i++)slow.step(.1);
  assert.ok(Math.abs(fast.tilt-slow.tilt)<.02);
  for(const value of Object.values(fast.snapshot())){
    if(typeof value==="number")assert.ok(Number.isFinite(value));
  }
  const malformed=new FlameModel().applyAirImpulse({impulse:NaN,distance:Infinity,alignment:NaN});
  assert.ok(Number.isFinite(malformed.tilt));
  assert.ok(Number.isFinite(malformed.instability));
});
