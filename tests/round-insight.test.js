import test from "node:test";
import assert from "node:assert/strict";
import { buildRoundInsight } from "../src/core/round-insight.js";

const attempt=(overrides={})=>({
  score:82,
  success:true,
  straightness:.88,
  intensityRatio:1.02,
  ...overrides,
});

test("stable repeated strikes produce a high repeatability index",()=>{
  const result=buildRoundInsight([
    attempt({score:80,intensityRatio:1}),
    attempt({score:82,intensityRatio:1.03}),
    attempt({score:81,intensityRatio:.99}),
    attempt({score:83,intensityRatio:1.02}),
    attempt({score:82,intensityRatio:1.01}),
  ]);
  assert.equal(result.ready,true);
  assert.equal(result.label,"Stable");
  assert.ok(result.repeatabilityIndex>=80);
  assert.equal(result.limiter,"repeatability");
});

test("poor line control becomes the next candle drill",()=>{
  const result=buildRoundInsight([
    attempt({straightness:.58}),
    attempt({straightness:.72}),
    attempt({straightness:.61}),
    attempt({straightness:.69}),
    attempt({straightness:.64}),
  ]);
  assert.equal(result.limiter,"line-control");
  assert.match(result.drill.title,/line-control/i);
});

test("large normalized intensity spread becomes tempo control",()=>{
  const result=buildRoundInsight([
    attempt({intensityRatio:.65}),
    attempt({intensityRatio:1.25}),
    attempt({intensityRatio:.78}),
    attempt({intensityRatio:1.38}),
    attempt({intensityRatio:.9}),
  ]);
  assert.equal(result.limiter,"tempo-control");
  assert.match(result.drill.cue,/same comfortable acceleration/i);
});

test("clean line with low success recommends candle-effect practice",()=>{
  const result=buildRoundInsight([
    attempt({success:false}),
    attempt({success:false}),
    attempt({success:true}),
    attempt({success:false}),
    attempt({success:true}),
  ]);
  assert.equal(result.limiter,"candle-effect");
  assert.equal(result.metrics.successRate,40);
});

test("insufficient attempts do not pretend to measure repeatability",()=>{
  const result=buildRoundInsight([attempt()]);
  assert.equal(result.ready,false);
  assert.equal(result.repeatabilityIndex,0);
  assert.equal(result.limiter,"insufficient");
});
