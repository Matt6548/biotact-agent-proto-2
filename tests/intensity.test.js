import test from "node:test";
import assert from "node:assert/strict";
import { normalizeStrikeIntensity } from "../src/core/intensity.js";

test("personal reference maps calibration peak to 1x intensity",()=>{
  const result=normalizeStrikeIntensity(4,{peak:4});
  assert.equal(result.ratio,1);
  assert.equal(result.trainingSpeed,6);
  assert.equal(result.source,"personal-reference");
});

test("personal normalization is proportional and capped at 2x",()=>{
  assert.equal(normalizeStrikeIntensity(2,{peak:4}).ratio,.5);
  const high=normalizeStrikeIntensity(20,{peak:4});
  assert.equal(high.ratio,2);
  assert.equal(high.trainingSpeed,12);
});

test("missing profile preserves legacy simulation mapping",()=>{
  const result=normalizeStrikeIntensity(2.8,null);
  assert.ok(Math.abs(result.trainingSpeed-7)<1e-9);
  assert.ok(Math.abs(result.ratio-(7/6))<1e-9);
  assert.equal(result.source,"fallback");
});
