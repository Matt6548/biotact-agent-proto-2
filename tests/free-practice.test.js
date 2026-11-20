import assert from "node:assert/strict";
import test from "node:test";
import { TrainingRound } from "../src/core/round.js";

test("free practice records hundreds of events without a round gate",()=>{
  const practice=new TrainingRound({attemptLimit:Number.POSITIVE_INFINITY});
  practice.start();
  for(let i=0;i<500;i+=1){
    practice.record({score:50,success:i%2===0,peakSpeed:3,straightness:.8,intensityRatio:1});
  }
  const snapshot=practice.snapshot();
  assert.equal(snapshot.attempts,500);
  assert.equal(snapshot.successes,250);
  assert.equal(snapshot.active,true);
  assert.equal(snapshot.complete,false);
  practice.reset();
  assert.equal(practice.snapshot().attempts,0);
});
