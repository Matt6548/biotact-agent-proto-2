import test from "node:test";
import assert from "node:assert/strict";
import { buildFieldTestPack } from "../src/core/field-test-pack.js";

const motionTrace={
  schema:"martial-training-motion-trace/v1",
  frameCount:2,
  frames:[{t:1,fps:25,l:{},w:{}},{t:2,fps:25,l:{},w:{}}],
};

const deviceReport={
  kind:"martial-training-device-performance",
  status:"ready",
  sampleCount:30,
  observedWindowMs:1800,
  delegate:"GPU",
  metrics:{medianFps:25,p90InferenceMs:32},
};

const roundEvidence={
  levelId:1,
  levelName:"Deflect",
  attempts:5,
  successes:3,
  averageScore:78,
  bestIntensityRatio:1.2,
  bestStraightness:.9,
  repeatabilityIndex:82,
  limiter:"line-control",
};

test("field test pack contains only explicit training evidence",()=>{
  const result=buildFieldTestPack({motionTrace,deviceReport,roundEvidence});
  assert.equal(result.ok,true);
  assert.equal(result.value.schema,"martial-training-field-test/v1");
  assert.equal(result.value.round.attempts,5);
  assert.equal(result.value.device.status,"ready");
  assert.equal(result.value.motionTrace.frameCount,2);
  assert.equal(result.value.privacy.containsPlayerName,false);
  assert.equal(result.value.privacy.containsAccount,false);
  assert.equal(result.value.privacy.containsVideo,false);
  assert.equal(result.value.privacy.containsAudio,false);
  assert.equal(result.value.privacy.containsMotionCoordinates,true);
});

test("field test pack refuses missing sensitive trace consent path",()=>{
  const result=buildFieldTestPack({motionTrace:null,deviceReport,roundEvidence});
  assert.deepEqual(result,{ok:false,reason:"motion-trace-required"});
});

test("field test pack refuses incomplete device diagnostics",()=>{
  const result=buildFieldTestPack({
    motionTrace,
    deviceReport:{...deviceReport,status:"insufficient"},
    roundEvidence,
  });
  assert.deepEqual(result,{ok:false,reason:"device-report-required"});
});

test("field test pack does not inherit arbitrary identity properties",()=>{
  const result=buildFieldTestPack({
    motionTrace:{...motionTrace,playerName:"Hidden Player"},
    deviceReport:{...deviceReport,userAgent:"secret-agent"},
    roundEvidence:{...roundEvidence,accountId:"123"},
  });
  const text=JSON.stringify(result.value);
  assert.equal(text.includes("Hidden Player"),false);
  assert.equal(text.includes("secret-agent"),false);
  assert.equal(text.includes("accountId"),false);
});
