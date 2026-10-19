import test from "node:test";
import assert from "node:assert/strict";
import { averageVisibility, inFrameRatio, qualityGate, RollingMedian, straightnessScore, velocityBetween } from "../src/core/motion-model.js";

test("velocityBetween returns metric speed from world points",()=>{
  const speed=velocityBetween({x:0,y:0,z:0,t:0},{x:.3,y:.4,z:0,t:100});
  assert.equal(speed,5);
});

test("three-frame median suppresses one-frame speed spike",()=>{
  const f=new RollingMedian(3);
  assert.equal(f.push(2),2);
  assert.equal(f.push(18),10);
  assert.equal(f.push(2),2);
  assert.equal(f.push(2),2);
});

test("rolling median reset clears history",()=>{
  const f=new RollingMedian(3);
  f.push(4);f.push(6);f.reset();
  assert.equal(f.current(),0);
});

test("quality gate reports low fps and framing",()=>{
  const result=qualityGate({visibility:.9,fps:12,bodyCoverage:.5});
  assert.equal(result.ok,false);
  assert.deepEqual(result.reasons,["low-frame-rate","poor-framing"]);
});

test("landmark helpers summarize visibility and framing",()=>{
  const landmarks=[{x:.5,y:.5,visibility:.8},{x:.6,y:.6,visibility:1}];
  assert.equal(averageVisibility(landmarks,[0,1]),.9);
  assert.equal(inFrameRatio(landmarks,[0,1]),1);
});

test("straight path scores higher than curved path",()=>{
  const straight=straightnessScore([{x:0,y:0,z:0},{x:.5,y:0,z:0},{x:1,y:0,z:0}]);
  const curved=straightnessScore([{x:0,y:0,z:0},{x:.5,y:.5,z:0},{x:1,y:0,z:0}]);
  assert.ok(straight>curved);
  assert.equal(straight,1);
});
