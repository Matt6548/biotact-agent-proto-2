import test from "node:test";import assert from "node:assert/strict";import{scoreCandleStrike}from"../src/core/scoring.js";
test("contact invalidates strike",()=>{const r=scoreCandleStrike({effectiveStress:2,alignment:1,distance:.5,contact:true});assert.equal(r.score,0);assert.equal(r.grade,"invalid")});
test("extinction has score floor",()=>{const r=scoreCandleStrike({effectiveStress:.9,extinguished:true,alignment:.9,distance:.4});assert.ok(r.score>=80)});
