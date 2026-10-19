import test from "node:test";
import assert from "node:assert/strict";
import { buildCoachFeedback } from "../src/core/coach.js";

test("coach limits feedback to measured, concise cues",()=>{
  const feedback=buildCoachFeedback({
    strike:{straightness:.55,peakSpeed:3},
    result:{flame:{extinguished:false,effectiveStress:.3,tilt:.2,instability:.2}}
  });
  assert.equal(feedback.cues.length,2);
  assert.match(feedback.cues[0],/straighter/i);
});

test("clean extinction receives repeatability cue",()=>{
  const feedback=buildCoachFeedback({
    strike:{straightness:.92,peakSpeed:4},
    result:{flame:{extinguished:true,effectiveStress:1,tilt:1,instability:1}}
  });
  assert.match(feedback.outcome,/extinguished/i);
  assert.match(feedback.cues[0],/repeat/i);
});
