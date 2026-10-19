import test from "node:test";
import assert from "node:assert/strict";
import { TrainingProgression } from "../src/core/progression.js";

test("level stays fixed until a round is completed",()=>{
  const p=new TrainingProgression({requiredSuccesses:3});
  const level=p.current();
  const successResult={flame:{effectiveStress:.5,instability:.5,extinguished:false}};
  assert.equal(p.evaluate(successResult,level),true);
  assert.equal(p.current().id,1);
  assert.equal(p.evaluate(successResult,level),true);
  assert.equal(p.current().id,1);
});

test("three of five target hits advance exactly one level",()=>{
  const p=new TrainingProgression({requiredSuccesses:3});
  const result=p.completeRound({successes:3});
  assert.equal(result.passed,true);
  assert.equal(result.levelUp,true);
  assert.equal(result.completedLevel.id,1);
  assert.equal(result.level.id,2);
});

test("failed round keeps the current level",()=>{
  const p=new TrainingProgression({requiredSuccesses:3});
  const result=p.completeRound({successes:2});
  assert.equal(result.passed,false);
  assert.equal(result.levelUp,false);
  assert.equal(p.current().id,1);
});

test("final level does not advance beyond the ladder",()=>{
  const p=new TrainingProgression({level:4,requiredSuccesses:3});
  const result=p.completeRound({successes:5});
  assert.equal(result.passed,true);
  assert.equal(result.levelUp,false);
  assert.equal(p.current().id,4);
});
