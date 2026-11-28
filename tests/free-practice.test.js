import assert from "node:assert/strict";
import test from "node:test";
import { TrainingRound } from "../src/core/round.js";
import { FreePracticeEngine, FreePracticeCameraController } from "../src/features/free-practice.js";
import { MotionTraceRecorder, replayMotionTrace } from "../src/core/motion-trace.js";

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

const JOINTS = [11, 12, 13, 14, 15, 16, 23, 24];

function frame(t, x, { fps = 30, occluded = false } = {}) {
  const landmarks = Array(33).fill(null);
  const worldLandmarks = Array(33).fill(null);
  for (const index of JOINTS) landmarks[index] = { x: .5, y: .5, z: 0, visibility: .98 };
  if (occluded) landmarks[15].visibility = .05;
  worldLandmarks[11] = { x: -.25, y: .2, z: 0 };
  worldLandmarks[12] = { x: .25, y: .2, z: 0 };
  worldLandmarks[15] = { x, y: .2, z: 0 };
  worldLandmarks[16] = { x: 0, y: .2, z: 0 };
  return { landmarks, worldLandmarks, timestampMs: t, fps };
}

const PUNCH = [0, 0, 0, .08, .16, .24, .32, .4, .4, .4, .4, .4];
const RETURN = Array.from({ length: 30 }, (_, i) => .4 * (1 - (i + 1) / 30));
const CYCLE = [...PUNCH, ...RETURN, 0, 0, 0, 0];

function runCycles(engine, count, startTime = 0) {
  let t = startTime;
  let strikes = 0;
  for (let c = 0; c < count; c++) {
    for (const x of CYCLE) {
      const result = engine.onFrame(frame(t, x));
      if (result.strike) strikes++;
      t += 33;
    }
  }
  return { t, strikes };
}

for (const count of [100, 500]) {
  test(`${count} uninterrupted controlled movements do not end, unlock, or grow stored traces`, () => {
    const engine = new FreePracticeEngine();
    assert.equal(engine.start().state, "framing");
    const { strikes } = runCycles(engine, count);
    assert.equal(strikes, count);
    assert.equal(engine.snapshot().strikeCount, count);
    assert.equal(engine.state, "practicing");
    assert.ok(engine.recentPeaks.length <= 16);
    assert.equal(engine.snapshot().referenceStatus, "personalized");
  });
}

test("camera occlusion, timestamp rewind and long gap cannot bridge a punch", () => {
  const engine = new FreePracticeEngine();
  engine.start();
  [0, 0, .08, .16, .24].forEach((x, i) => engine.onFrame(frame(i * 33, x)));
  let result = engine.onFrame(frame(165, .3, { occluded: true }));
  assert.equal(result.strike, null);
  assert.equal(result.state, "framing");
  assert.ok(result.analysis.quality.reasons.includes("arm-occluded"));
  result = engine.onFrame(frame(198, .4));
  assert.equal(result.analysis.trackingPrimed, true);
  assert.equal(result.strike, null);
  result = engine.onFrame(frame(198, .4));
  assert.ok(result.analysis.quality.reasons.includes("tracking-gap"));
  engine.onFrame(frame(231, .4));
  result = engine.onFrame(frame(600, .4));
  assert.equal(result.strike, null);
  assert.ok(result.analysis.quality.reasons.includes("tracking-gap"));
  result = engine.onFrame(frame(633, .4));
  assert.equal(result.analysis.trackingPrimed, true);
  assert.equal(engine.strikeCount, 0);
});

test("guard jitter, low-confidence framing and implausible jumps never count", () => {
  const engine = new FreePracticeEngine();
  engine.start();
  for (let i = 0; i < 90; i++) engine.onFrame(frame(i * 33, i % 2 ? .01 : 0));
  assert.equal(engine.strikeCount, 0);
  const jumped = engine.onFrame(frame(90 * 33, 2));
  assert.deepEqual(jumped.analysis.quality.reasons, ["implausible-wrist-jump"]);
  assert.equal(jumped.strike, null);
  assert.equal(engine.strikeCount, 0);
});

test("pause stops processing; resume re-primes; relighting never ends the practice", () => {
  const engine = new FreePracticeEngine();
  engine.start();
  let { t } = runCycles(engine, 7);
  assert.equal(engine.strikeCount, 7);
  assert.equal(engine.pause().state, "paused");
  assert.equal(engine.onFrame(frame(t, 10)).ignored, true);
  assert.equal(engine.strikeCount, 7);
  assert.equal(engine.resume().state, "framing");
  assert.equal(engine.onFrame(frame(t + 33, .4)).analysis.trackingPrimed, true);
  t += 66;
  const extra = runCycles(engine, 3, t);
  assert.equal(extra.strikes, 3);
  assert.equal(engine.strikeCount, 10);
  engine.flame.applyAirImpulse({ impulse: 10, alignment: 1, distance: 0 });
  assert.equal(engine.snapshot().flame.extinguished, true);
  assert.equal(engine.relight().flame.extinguished, false);
  assert.equal(engine.state, "practicing");
  engine.stop();
  assert.equal(engine.state, "preview");
  assert.equal(engine.lastSessionCount, 10);
  engine.start();
  assert.equal(engine.strikeCount, 0);
  assert.equal(engine.recentPeaks.length, 0);
});

test("replayed locally stored numeric trace has identical strike sequence", async () => {
  const frames = [...CYCLE, ...CYCLE].map((x, i) => frame(i * 33, x));
  const recorder = new MotionTraceRecorder({ maxFrames: 200 });
  recorder.start({ startedAt: 1 });
  frames.forEach((sample) => recorder.add(sample));
  const trace = recorder.stop(3000);
  const original = new FreePracticeEngine();
  const replayed = new FreePracticeEngine();
  original.start();
  replayed.start();
  const a = frames.map((sample) => original.onFrame(sample).strike?.t).filter((v) => v !== undefined);
  const b = [];
  await replayMotionTrace(trace, { speed: Infinity, onFrame: (sample) => {
    const event = replayed.onFrame(sample).strike;
    if (event) b.push(event.t);
  } });
  assert.deepEqual(b, a);
  assert.equal(replayed.strikeCount, 2);
});

test("controller releases the camera on pause and stop and rejects late results", async () => {
  const trackers = [];
  const updates = [];
  const controller = new FreePracticeCameraController({
    video: {},
    onUpdate: (update) => updates.push(update),
    trackerFactory: (options) => {
      const tracker = { options, stopped: false, async start() {}, stop() { this.stopped = true; } };
      trackers.push(tracker);
      return tracker;
    },
  });
  await controller.start();
  trackers[0].options.onResult(frame(0, 0));
  assert.equal(updates.length, 1);
  assert.equal(controller.pause().state, "paused");
  assert.equal(trackers[0].stopped, true);
  trackers[0].options.onResult(frame(33, 0));
  assert.equal(updates.length, 1);
  await controller.resume();
  assert.equal(trackers.length, 2);
  controller.stop();
  assert.equal(trackers[1].stopped, true);
  assert.equal(controller.engine.state, "preview");
});

test("hidden tab pauses and releases camera; dispose unregisters visibility listener", async () => {
  const listeners = new Set();
  const visibilityTarget = {
    hidden: false,
    addEventListener: (_, callback) => listeners.add(callback),
    removeEventListener: (_, callback) => listeners.delete(callback),
  };
  let stopped = 0;
  const controller = new FreePracticeCameraController({
    video: {}, visibilityTarget,
    trackerFactory: () => ({ async start() {}, stop() { stopped++; } }),
  });
  await controller.start();
  visibilityTarget.hidden = true;
  for (const callback of listeners) callback();
  assert.equal(controller.engine.state, "paused");
  assert.equal(stopped, 1);
  controller.dispose();
  assert.equal(listeners.size, 0);
});

test("stop during an unresolved camera request leaves preview clean", async () => {
  let finishStart;
  let stopped = 0;
  const controller = new FreePracticeCameraController({
    video: {},
    visibilityTarget: null,
    trackerFactory: () => ({
      start: () => new Promise((resolve) => { finishStart = resolve; }),
      stop: () => { stopped++; },
    }),
  });
  const pending = controller.start();
  assert.equal(controller.stop().state, "preview");
  finishStart();
  assert.equal((await pending).state, "preview");
  assert.ok(stopped >= 1);
});

test("fatal worker or privacy status fails closed and releases the camera", async () => {
  let stopped = 0;
  let notify;
  const controller = new FreePracticeCameraController({
    video: {}, visibilityTarget: null,
    trackerFactory: ({ onStatus }) => {
      notify = onStatus;
      return { async start() {}, stop() { stopped++; } };
    },
  });
  await controller.start();
  notify({ state: "privacy-block" });
  assert.equal(controller.engine.state, "paused");
  assert.equal(stopped, 1);
});

test("fatal status reaches UI only after the partial visual cue and camera are cleared", async () => {
  for (const state of ["error", "privacy-block"]) {
    let options, stopped=0;
    const observed=[], updates=[];
    const engine=new FreePracticeEngine();
    const controller=new FreePracticeCameraController({
      video:{},engine,visibilityTarget:null,
      onUpdate:update=>updates.push(update),
      onStatus:status=>observed.push({status:status.state,snapshot:engine.snapshot(),stopped}),
      trackerFactory:args=>{
        options=args;
        return {async start(){},stop(){stopped++;args.onStatus({state:"idle"});}};
      },
    });
    await controller.start();
    engine.previewTilt=.15;
    options.onStatus({state});
    assert.equal(observed.length,1);
    assert.equal(observed[0].status,state);
    assert.equal(observed[0].snapshot.state,"paused");
    assert.equal(observed[0].snapshot.flame.tilt,0);
    assert.equal(observed[0].stopped,1);
    options.onResult(frame(0,0));
    assert.equal(updates.length,0);
    controller.dispose();
  }
});
