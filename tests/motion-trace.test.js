import test from "node:test";
import assert from "node:assert/strict";
import { MotionTraceRecorder, compactPoseFrame, expandPoseFrame, validateMotionTrace } from "../src/core/motion-trace.js";

function frame(t=100){
  const landmarks=Array(33).fill(null),worldLandmarks=Array(33).fill(null);
  for(const i of [11,12,13,14,15,16,23,24])landmarks[i]={x:.5,y:.5,z:0,visibility:.9};
  worldLandmarks[15]={x:.1,y:.2,z:.3,visibility:.9};
  worldLandmarks[16]={x:.4,y:.5,z:.6,visibility:.8};
  return{landmarks,worldLandmarks,timestampMs:t,fps:30};
}

test("pose trace compacts and expands only needed numerical landmarks",()=>{
  const compact=compactPoseFrame(frame(123));
  assert.equal(compact.t,123);
  assert.equal(Object.keys(compact.l).length,8);
  assert.equal(Object.keys(compact.w).length,2);
  const expanded=expandPoseFrame(compact);
  assert.equal(expanded.worldLandmarks[15].x,.1);
  assert.equal(expanded.landmarks[11].visibility,.9);
  assert.equal(expanded.landmarks[0],null);
});

test("recorder caps frame count and exports privacy metadata",()=>{
  const recorder=new MotionTraceRecorder({maxFrames:2});
  recorder.start(0);
  assert.equal(recorder.add(frame(0)),true);
  assert.equal(recorder.add(frame(33)),true);
  assert.equal(recorder.add(frame(66)),false);
  const trace=recorder.stop(100);
  assert.equal(trace.frameCount,2);
  assert.match(trace.privacy,/No image, video, audio/i);
  assert.equal(validateMotionTrace(trace).ok,true);
});

test("invalid trace schema is rejected",()=>{
  assert.deepEqual(validateMotionTrace({schema:"wrong",frames:[{}]}),{ok:false,reason:"unsupported-schema"});
});
