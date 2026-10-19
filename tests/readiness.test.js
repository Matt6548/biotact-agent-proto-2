import test from "node:test";
import assert from "node:assert/strict";
import { StableReadiness, ValidDurationGate } from "../src/core/readiness.js";

test("stable readiness requires consecutive valid frames",()=>{
  const gate=new StableReadiness({requiredConsecutive:3});
  assert.equal(gate.update(true).ready,false);
  assert.equal(gate.update(true).ready,false);
  assert.equal(gate.update(false).streak,0);
  gate.update(true);
  gate.update(true);
  assert.equal(gate.update(true).ready,true);
});

test("valid-duration calibration pauses instead of consuming invalid time",()=>{
  const gate=new ValidDurationGate({requiredMs:200,maxStepMs:100});
  gate.start();
  gate.update({timestampMs:0,valid:true});
  gate.update({timestampMs:100,valid:true});
  assert.equal(gate.snapshot().remainingMs,100);

  gate.update({timestampMs:5000,valid:false});
  assert.equal(gate.snapshot().remainingMs,100);

  gate.update({timestampMs:6000,valid:true});
  assert.equal(gate.snapshot().remainingMs,100);

  const done=gate.update({timestampMs:6100,valid:true});
  assert.equal(done.complete,true);
  assert.equal(done.remainingMs,0);
});

test("large frame gaps cannot instantly finish calibration",()=>{
  const gate=new ValidDurationGate({requiredMs:500,maxStepMs:80});
  gate.start();
  gate.update({timestampMs:0,valid:true});
  const state=gate.update({timestampMs:5000,valid:true});
  assert.equal(state.remainingMs,420);
});
