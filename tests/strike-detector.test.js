import test from "node:test";
import assert from "node:assert/strict";
import { StrikeDetector } from "../src/core/strike-detector.js";

test("detects a short high-speed strike after release", () => {
  const detector = new StrikeDetector({ startSpeed: 1.5, releaseSpeed: 0.8, minPeakSpeed: 2, minDurationMs: 40 });
  const points = [
    [0, 0.2, {x:0,y:0,z:0}],
    [50, 1.7, {x:.05,y:0,z:0}],
    [100, 3.1, {x:.20,y:0,z:0}],
    [150, 2.5, {x:.35,y:0,z:0}],
    [200, 0.5, {x:.40,y:0,z:0}],
  ];
  let event = null;
  for (const [t, speed, point] of points) event = detector.update({ t, speed, point }) || event;
  assert.ok(event);
  assert.equal(event.detected, true);
  assert.equal(event.peakSpeed, 3.1);
  assert.equal(event.straightness, 1);
});

test("rejects motion whose peak speed is too low", () => {
  const detector = new StrikeDetector({ startSpeed: 1, releaseSpeed: 0.6, minPeakSpeed: 3, minDurationMs: 40 });
  let event = detector.update({ t: 0, speed: 1.2, point: {x:0,y:0,z:0} });
  event = detector.update({ t: 80, speed: 2.2, point: {x:.1,y:0,z:0} }) || event;
  event = detector.update({ t: 160, speed: 0.3, point: {x:.2,y:0,z:0} }) || event;
  assert.equal(event, null);
});

test("refractory window prevents immediate duplicate strike", () => {
  const detector = new StrikeDetector({ startSpeed: 1, releaseSpeed: 0.5, minPeakSpeed: 1.5, minDurationMs: 20, refractoryMs: 300 });
  detector.update({ t: 0, speed: 1.2, point: {x:0,y:0,z:0} });
  detector.update({ t: 30, speed: 2, point: {x:.1,y:0,z:0} });
  const first = detector.update({ t: 60, speed: 0.2, point: {x:.2,y:0,z:0} });
  assert.ok(first);

  detector.update({ t: 120, speed: 2, point: {x:.2,y:0,z:0} });
  const duplicate = detector.update({ t: 180, speed: 0.2, point: {x:.3,y:0,z:0} });
  assert.equal(duplicate, null);
});

test("quick in-place fidget is rejected despite high peak speed", () => {
  const detector = new StrikeDetector();
  const points = [
    [0, 0, 0], [33, 2.5, .02], [66, 3.2, -.02],
    [99, 2.6, .02], [132, .1, 0],
  ];
  const events = points.map(([t, speed, x]) => detector.update({ t, speed, point: { x, y: 0, z: 0 } }));
  assert.equal(events.filter(Boolean).length, 0);
});

test("guard movement that does not extend away from shoulder is rejected", () => {
  const detector = new StrikeDetector();
  const origin = { x: 0, y: 0, z: 0 };
  const frames = [
    [0, 0, .4], [33, 2, .35], [66, 3, .29],
    [99, 2.8, .23], [132, .3, .2],
  ];
  const events = frames.map(([t, speed, x]) => detector.update({
    t, speed, point: { x, y: 0, z: 0 }, origin,
  }));
  assert.equal(events.filter(Boolean).length, 0);
});

test("accepted event includes heuristic quality and displacement, not force", () => {
  const detector = new StrikeDetector();
  const origin = { x: -.2, y: 0, z: 0 };
  const frames = [
    [0, 0, 0], [33, 2.4, .08], [66, 3, .16],
    [99, 2.5, .26], [132, .3, .32],
  ];
  let strike = null;
  for (const [t, speed, x] of frames) {
    strike = detector.update({ t, speed, point: { x, y: 0, z: 0 }, origin }) ?? strike;
  }
  assert.ok(strike?.detected);
  assert.ok(strike.confidence >= 0 && strike.confidence <= 1);
  assert.ok(strike.displacement >= .3);
  assert.ok(strike.extension > 0);
  assert.equal("force" in strike, false);
});
