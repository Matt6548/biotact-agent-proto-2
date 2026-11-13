import test from "node:test";
import assert from "node:assert/strict";
import { replayMotionTrace, validateMotionTrace } from "../src/core/motion-trace.js";

const LANDMARKS=[11,12,13,14,15,16,23,24];
const point=()=>({x:0.1,y:0.2,z:0.3,v:0.9});
function frame(t){
  return {
    t,fps:30,
    l:Object.fromEntries(LANDMARKS.map((key)=>[key,point()])),
    w:{15:point(),16:point()},
  };
}
function trace(frames=[frame(100),frame(133)]){
  return {schema:"martial-training-motion-trace/v1",frameCount:frames.length,frames};
}

test("Stage 30 accepts correctly compacted pose traces including missing landmarks",()=>{
  const input=trace();
  input.frames[0].l[11]=null;
  assert.deepEqual(validateMotionTrace(input),{ok:true,frameCount:2});
});

test("Stage 30 rejects malformed, injected and non-finite landmark data",()=>{
  for(const mutate of [
    (x)=>{x.frames[0]=null;},
    (x)=>{x.frames[0].l[15].x=Infinity;},
    (x)=>{x.frames[0].l[15].z=NaN;},
    (x)=>{x.frames[0].l[15].v=5;},
    (x)=>{x.frames[0].l[15].playerName="secret";},
    (x)=>{x.frames[0].l[99]=point();},
    (x)=>{x.frames[0].playerId="secret";},
    (x)=>{x.frames[0].fps=-1;},
    (x)=>{x.frames[0].t="100";},
    (x)=>{delete x.frames[0].w[16];},
  ]){
    const input=trace();
    mutate(input);
    assert.deepEqual(validateMotionTrace(input),{ok:false,reason:"invalid-frame"});
  }
});

test("Stage 30 rejects out-of-order timestamps and mismatched frame count",()=>{
  assert.deepEqual(validateMotionTrace(trace([frame(133),frame(100)])),{ok:false,reason:"nonmonotonic-timestamps"});
  const input=trace();
  input.frameCount=100;
  assert.deepEqual(validateMotionTrace(input),{ok:false,reason:"invalid-frame-count"});
});

test("Stage 30 invalid trace does not invoke replay callback even once",async()=>{
  let called=0;
  const input=trace([frame(133),frame(100)]);
  await assert.rejects(replayMotionTrace(input,{speed:Infinity,onFrame:()=>{called+=1;}}),/nonmonotonic-timestamps/);
  assert.equal(called,0);
});

test("Stage 30 preserves deterministic chronological replay of valid traces",async()=>{
  const times=[];
  await replayMotionTrace(trace([frame(100),frame(133)]),{
    speed:Infinity,
    onFrame:(item)=>times.push(item.timestampMs),
  });
  assert.deepEqual(times,[100,133]);
});
