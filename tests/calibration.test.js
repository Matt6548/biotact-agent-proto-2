import test from "node:test";
import assert from "node:assert/strict";
import { SpeedCalibration } from "../src/core/calibration.js";

test("calibration rejects too few samples",()=>{
  const c=new SpeedCalibration();c.start();
  for(let i=0;i<10;i++)c.add(2);
  const r=c.finish();assert.equal(r.ok,false);assert.equal(r.reason,"not-enough-samples");
});

test("calibration produces bounded personal thresholds",()=>{
  const c=new SpeedCalibration();c.start();
  const samples=[...Array(50).fill(.35),...Array(25).fill(1.1),...Array(20).fill(3.2),...Array(5).fill(5.5)];
  samples.forEach((v)=>c.add(v));
  const r=c.finish();
  assert.equal(r.ok,true);
  assert.ok(r.detector.startSpeed>=1&&r.detector.startSpeed<=4.5);
  assert.ok(r.detector.releaseSpeed>=.45&&r.detector.releaseSpeed<=2);
  assert.ok(r.detector.minPeakSpeed>=1.5&&r.detector.minPeakSpeed<=7.5);
  assert.ok(r.detector.minPeakSpeed>r.detector.releaseSpeed);
});

test("calibration rejects session without meaningful movement",()=>{
  const c=new SpeedCalibration();c.start();
  for(let i=0;i<60;i++)c.add(.2);
  const r=c.finish();assert.equal(r.ok,false);assert.equal(r.reason,"movement-too-slow");
});
