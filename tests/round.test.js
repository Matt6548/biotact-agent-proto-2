import test from "node:test";
import assert from "node:assert/strict";
import { TrainingRound } from "../src/core/round.js";

test("round completes after configured attempts and summarizes results",()=>{
  const round=new TrainingRound({attemptLimit:3});
  round.start();
  round.record({score:60,success:true,peakSpeed:2.5,straightness:.7,intensityRatio:.9});
  round.record({score:80,success:false,peakSpeed:3.2,straightness:.8,intensityRatio:1.1});
  const final=round.record({score:100,success:true,peakSpeed:4.1,straightness:.9,intensityRatio:1.4});
  assert.equal(final.complete,true);
  assert.equal(final.active,false);
  assert.equal(final.attempts,3);
  assert.equal(final.successes,2);
  assert.equal(final.bestScore,100);
  assert.equal(final.averageScore,80);
  assert.equal(final.bestSpeed,4.1);
  assert.equal(final.bestStraightness,.9);
  assert.equal(final.bestIntensityRatio,1.4);
});

test("round ignores records until started",()=>{
  const round=new TrainingRound({attemptLimit:2});
  const state=round.record({score:100,success:true,intensityRatio:2});
  assert.equal(state.attempts,0);
  assert.equal(state.complete,false);
  assert.equal(state.bestIntensityRatio,0);
});
