import test from "node:test";
import assert from "node:assert/strict";
import { averageVisibility, inFrameRatio, qualityGate, straightnessScore, velocityBetween } from "../src/core/motion-model.js";

test("velocityBetween returns metric speed from world points", () => {
  const speed = velocityBetween(
    { x: 0, y: 0, z: 0, t: 0 },
    { x: 0.3, y: 0.4, z: 0, t: 100 },
  );
  assert.equal(speed, 5);
});

test("quality gate reports low fps and framing", () => {
  const result = qualityGate({ visibility: 0.9, fps: 12, bodyCoverage: 0.5 });
  assert.equal(result.ok, false);
  assert.deepEqual(result.reasons, ["low-frame-rate", "poor-framing"]);
});

test("landmark helpers summarize visibility and framing", () => {
  const landmarks = [
    { x: 0.5, y: 0.5, visibility: 0.8 },
    { x: 0.6, y: 0.6, visibility: 1 },
  ];
  assert.equal(averageVisibility(landmarks, [0, 1]), 0.9);
  assert.equal(inFrameRatio(landmarks, [0, 1]), 1);
});

test("straight path scores higher than curved path", () => {
  const straight = straightnessScore([{x:0,y:0,z:0},{x:.5,y:0,z:0},{x:1,y:0,z:0}]);
  const curved = straightnessScore([{x:0,y:0,z:0},{x:.5,y:.5,z:0},{x:1,y:0,z:0}]);
  assert.ok(straight > curved);
  assert.equal(straight, 1);
});
