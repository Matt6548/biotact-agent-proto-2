import test from "node:test";
import assert from "node:assert/strict";
import { computeRankedRound, RANKED_ROUND_PRIVACY, validateRankedRoundPayload } from "../src/core/ranked-round.js";

const validPayload=()=>({
  levelId:1,
  attempts:[
    {hand:"right",intensityRatio:.8,straightness:.84,offsetMs:800,qualityOk:true},
    {hand:"right",intensityRatio:1.0,straightness:.88,offsetMs:1900,qualityOk:true},
    {hand:"left",intensityRatio:1.15,straightness:.91,offsetMs:3100,qualityOk:true},
    {hand:"right",intensityRatio:1.25,straightness:.9,offsetMs:4300,qualityOk:true},
    {hand:"left",intensityRatio:1.1,straightness:.93,offsetMs:5600,qualityOk:true},
  ],
});

test("ranked round accepts exactly five quality-passed aggregate attempts",()=>{
  const result=validateRankedRoundPayload(validPayload());
  assert.equal(result.ok,true);
  assert.equal(result.levelId,1);
});

test("ranked round rejects client score and sensitive motion evidence",()=>{
  const withScore={...validPayload(),score:999999};
  assert.equal(validateRankedRoundPayload(withScore).reason,"prohibited-client-data");

  const withLandmarks=validPayload();
  withLandmarks.attempts[0].landmarks=[{x:.5,y:.5}];
  assert.equal(validateRankedRoundPayload(withLandmarks).reason,"prohibited-client-data");
  assert.equal(RANKED_ROUND_PRIVACY.clientScore,false);
  assert.equal(RANKED_ROUND_PRIVACY.rawLandmarks,false);
});

test("ranked round rejects malformed ranges and order",()=>{
  const badIntensity=validPayload();
  badIntensity.attempts[2].intensityRatio=2.1;
  assert.equal(validateRankedRoundPayload(badIntensity).reason,"invalid-intensity");

  const badOrder=validPayload();
  badOrder.attempts[3].offsetMs=3000;
  assert.equal(validateRankedRoundPayload(badOrder).reason,"invalid-attempt-order");

  const badQuality=validPayload();
  badQuality.attempts[1].qualityOk=false;
  assert.equal(validateRankedRoundPayload(badQuality).reason,"quality-required");
});

test("server-side ranked recomputation is deterministic and ignores no client score because it is forbidden",()=>{
  const first=computeRankedRound(validPayload());
  const second=computeRankedRound(validPayload());
  assert.deepEqual(first,second);
  assert.equal(first.ok,true);
  assert.equal(first.attempts,5);
  assert.ok(first.averageScore>=0&&first.averageScore<=100);
  assert.ok(first.successes>=0&&first.successes<=5);
});
