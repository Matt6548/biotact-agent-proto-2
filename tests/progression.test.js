import test from "node:test";
import assert from "node:assert/strict";
import { TrainingProgression } from "../src/core/progression.js";

test("three successful attempts advance a level",()=>{
  const p=new TrainingProgression({requiredStreak:3});
  const result={flame:{effectiveStress:.5,instability:.5,extinguished:false}};
  assert.equal(p.record(result).levelUp,false);
  assert.equal(p.record(result).levelUp,false);
  const third=p.record(result);
  assert.equal(third.levelUp,true);
  assert.equal(third.level.id,2);
  assert.equal(third.streak,0);
});

test("failed attempt resets streak",()=>{
  const p=new TrainingProgression({requiredStreak:3});
  p.record({flame:{effectiveStress:.5}});
  const failure=p.record({flame:{effectiveStress:.1}});
  assert.equal(failure.success,false);
  assert.equal(failure.streak,0);
});
