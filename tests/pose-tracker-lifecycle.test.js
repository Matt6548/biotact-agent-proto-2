import test from "node:test";
import assert from "node:assert/strict";
import { PoseTracker } from "../src/vision/pose-tracker.js";

test("stopping during camera permission immediately closes a late stream", async () => {
  const prior = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  let allowCamera;
  let stopped = 0;
  const stream = { getTracks: () => [{ stop: () => stopped++ }] };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { mediaDevices: { getUserMedia: () => new Promise((resolve) => { allowCamera = resolve; }) } },
  });
  try {
    const video = { srcObject: null, async play() { throw new Error("must not play"); } };
    const tracker = new PoseTracker({ video });
    const pending = tracker.start();
    tracker.stop();
    allowCamera(stream);
    await assert.rejects(pending, { name: "AbortError" });
    assert.equal(stopped, 1);
    assert.equal(tracker.stream, null);
    assert.equal(video.srcObject, null);
  } finally {
    if (prior) Object.defineProperty(globalThis, "navigator", prior);
    else delete globalThis.navigator;
  }
});

test("stopping while video playback is pending cannot start a worker", async () => {
  const prior = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  let finishPlay;
  let stopped = 0;
  const stream = { getTracks: () => [{ stop: () => stopped++ }] };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { mediaDevices: { getUserMedia: async () => stream } },
  });
  try {
    const video = { srcObject: null, play: () => new Promise((resolve) => { finishPlay = resolve; }) };
    const tracker = new PoseTracker({ video });
    const pending = tracker.start();
    await Promise.resolve();
    tracker.stop();
    finishPlay();
    await assert.rejects(pending, { name: "AbortError" });
    assert.equal(stopped, 1);
    assert.equal(tracker.worker, null);
    assert.equal(video.srcObject, null);
  } finally {
    if (prior) Object.defineProperty(globalThis, "navigator", prior);
    else delete globalThis.navigator;
  }
});

test("worker initialization failure closes already granted camera tracks", async () => {
  const priorNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const priorWorker = Object.getOwnPropertyDescriptor(globalThis, "Worker");
  let stopped = 0;
  const stream = { getTracks: () => [{ stop: () => stopped++ }] };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { mediaDevices: { getUserMedia: async () => stream } },
  });
  Object.defineProperty(globalThis, "Worker", {
    configurable: true,
    value: class { constructor() { throw new Error("worker unavailable"); } },
  });
  try {
    const video = { srcObject: null, async play() {} };
    const tracker = new PoseTracker({ video });
    await assert.rejects(tracker.start(), /worker unavailable/);
    assert.equal(stopped, 1);
    assert.equal(tracker.stream, null);
    assert.equal(video.srcObject, null);
  } finally {
    if (priorNavigator) Object.defineProperty(globalThis, "navigator", priorNavigator);
    else delete globalThis.navigator;
    if (priorWorker) Object.defineProperty(globalThis, "Worker", priorWorker);
    else delete globalThis.Worker;
  }
});

test("camera status switches from permission request to model loading once video plays", async () => {
  const priorNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const priorWorker = Object.getOwnPropertyDescriptor(globalThis, "Worker");
  let stopped = 0;
  const stream = { getTracks: () => [{ stop: () => stopped++ }] };
  const states = [];
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { mediaDevices: { getUserMedia: async () => stream } },
  });
  Object.defineProperty(globalThis, "Worker", {
    configurable: true,
    value: class {
      postMessage(message) { assert.equal(message.type, "init"); }
      terminate() {}
    },
  });
  try {
    const video = { srcObject: null, async play() {} };
    const tracker = new PoseTracker({ video, onStatus: ({ state }) => states.push(state) });
    tracker.scheduleFrame = () => {};
    await tracker.start();
    assert.deepEqual(states, ["starting", "loading"]);
    assert.equal(video.srcObject, stream);
    tracker.stop();
    assert.equal(stopped, 1);
  } finally {
    if (priorNavigator) Object.defineProperty(globalThis, "navigator", priorNavigator);
    else delete globalThis.navigator;
    if (priorWorker) Object.defineProperty(globalThis, "Worker", priorWorker);
    else delete globalThis.Worker;
  }
});

test("optional injected worker uses the same exclusive camera and stop cleanup", async () => {
  const priorNavigator=Object.getOwnPropertyDescriptor(globalThis,"navigator");
  let stoppedTracks=0,terminated=0,constructed=0;
  const stream={getTracks:()=>[{stop:()=>stoppedTracks++}]};
  Object.defineProperty(globalThis,"navigator",{configurable:true,
    value:{mediaDevices:{getUserMedia:async()=>stream}}});
  try{
    const tracker=new PoseTracker({
      video:{srcObject:null,async play(){}},
      workerFactory:()=>{
        constructed++;
        return {postMessage(){},terminate(){terminated++;}};
      },
    });
    tracker.scheduleFrame=()=>{};
    await tracker.start();
    assert.equal(constructed,1);
    assert.equal(tracker.running,true);
    tracker.stop();
    assert.equal(stoppedTracks,1);
    assert.equal(terminated,1);
    assert.equal(tracker.stream,null);
  }finally{
    if(priorNavigator)Object.defineProperty(globalThis,"navigator",priorNavigator);
    else delete globalThis.navigator;
  }
});

test("hand-ready status exposes delegate and model init time without touching the camera",()=>{
 const events=[];
 const tracker=new PoseTracker({video:{},onStatus:(event)=>events.push(event)});
 tracker.handleWorkerMessage({type:"ready",mode:"hands",delegate:"CPU",initMs:82});
 assert.equal(events.length,1);
 assert.equal(events[0].mode,"hands");
 assert.equal(events[0].initMs,82);
 assert.equal(events[0].delegate,"CPU");
 assert.match(events[0].message,/Hand model ready/);
});
