import test from "node:test";
import assert from "node:assert/strict";
import { DeviceDiagnostics, percentile } from "../src/core/device-diagnostics.js";

test("percentile interpolates deterministic values",()=>{
  assert.equal(percentile([10,20,30,40],.5),25);
  assert.equal(percentile([10,20,30,40],0),10);
  assert.equal(percentile([10,20,30,40],1),40);
});

test("device diagnostics requires both samples and an observation window",()=>{
  const diagnostics=new DeviceDiagnostics({minSamples:5,minWindowMs:1000});
  for(let i=0;i<8;i+=1)diagnostics.add({fps:30,inferenceMs:20,busySkipsPerSecond:0,delegate:"GPU",timestampMs:i*100});
  let report=diagnostics.report();
  assert.equal(report.status,"insufficient");
  assert.equal(report.sampleCount,8);
  diagnostics.add({fps:30,inferenceMs:20,busySkipsPerSecond:0,delegate:"GPU",timestampMs:1100});
  report=diagnostics.report();
  assert.equal(report.status,"ready");
  assert.ok(report.observedWindowMs>=1000);
});

test("device diagnostics marks a healthy 20+ fps runtime ready",()=>{
  const diagnostics=new DeviceDiagnostics({minSamples:5,minWindowMs:500});
  for(let i=0;i<20;i+=1)diagnostics.add({fps:28+(i%2),inferenceMs:24+(i%3),busySkipsPerSecond:1,delegate:"GPU",timestampMs:i*50});
  const report=diagnostics.report();
  assert.equal(report.status,"ready");
  assert.equal(report.delegate,"GPU");
  assert.ok(report.metrics.medianFps>=28);
  assert.ok(report.metrics.p90InferenceMs<=50);
});

test("device diagnostics separates constrained and limited runtimes",()=>{
  const constrained=new DeviceDiagnostics({minSamples:5,minWindowMs:500});
  const limited=new DeviceDiagnostics({minSamples:5,minWindowMs:500});
  for(let i=0;i<20;i+=1){
    constrained.add({fps:17,inferenceMs:62,busySkipsPerSecond:8,delegate:"CPU",timestampMs:i*50});
    limited.add({fps:11,inferenceMs:96,busySkipsPerSecond:18,delegate:"CPU",timestampMs:i*50});
  }
  assert.equal(constrained.report().status,"constrained");
  assert.equal(limited.report().status,"limited");
});

test("export report contains aggregates but no body/device identity fields",()=>{
  const diagnostics=new DeviceDiagnostics({minSamples:5,minWindowMs:500});
  for(let i=0;i<10;i+=1)diagnostics.add({fps:25,inferenceMs:30,busySkipsPerSecond:2,delegate:"GPU",timestampMs:i*60});
  const report=diagnostics.report();
  assert.equal(report.privacy.containsBodyCoordinates,false);
  assert.equal(report.privacy.containsVideo,false);
  assert.equal(report.privacy.containsAudio,false);
  assert.equal(report.privacy.containsDeviceIdentifier,false);
  assert.equal("userAgent" in report,false);
  assert.equal("landmarks" in report,false);
});
