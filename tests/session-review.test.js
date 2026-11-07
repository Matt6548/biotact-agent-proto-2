import test from "node:test";
import assert from "node:assert/strict";
import { TrainingSessionReview } from "../src/core/session-review.js";

test("session review aggregates completed rounds",()=>{
  const review=new TrainingSessionReview();
  review.recordRound({
    levelId:1,
    roundSummary:{attempts:5,successes:3,averageScore:70},
    insight:{ready:true,repeatabilityIndex:80,limiter:"line-control"},
  });
  const summary=review.recordRound({
    levelId:2,
    roundSummary:{attempts:5,successes:4,averageScore:90},
    insight:{ready:true,repeatabilityIndex:70,limiter:"tempo-control"},
  });

  assert.equal(summary.roundsCompleted,2);
  assert.equal(summary.totalAttempts,10);
  assert.equal(summary.targetHits,7);
  assert.equal(summary.averageScore,80);
  assert.equal(summary.averageRepeatability,75);
});

test("repeated limiter becomes the session focus",()=>{
  const review=new TrainingSessionReview();
  for(let i=0;i<3;i+=1){
    review.recordRound({
      levelId:1,
      roundSummary:{attempts:5,successes:3,averageScore:75},
      insight:{ready:true,repeatabilityIndex:72,limiter:i<2?"line-control":"tempo-control"},
    });
  }
  const summary=review.snapshot();
  assert.equal(summary.focus.key,"line-control");
  assert.match(summary.focus.cue,/wrist path/i);
});

test("stable rounds keep repeatability as the focus",()=>{
  const review=new TrainingSessionReview();
  review.recordRound({
    levelId:1,
    roundSummary:{attempts:5,successes:5,averageScore:92},
    insight:{ready:true,repeatabilityIndex:91,limiter:"repeatability"},
  });
  assert.equal(review.snapshot().focus.key,"repeatability");
});

test("session reset clears accumulated rounds",()=>{
  const review=new TrainingSessionReview();
  review.recordRound({
    roundSummary:{attempts:5,successes:3,averageScore:70},
    insight:{ready:true,repeatabilityIndex:70,limiter:"line-control"},
  });
  const summary=review.reset();
  assert.equal(summary.roundsCompleted,0);
  assert.equal(summary.totalAttempts,0);
});
