import test from "node:test";
import assert from "node:assert/strict";
import { LiveTrainingAnalyzer } from "../src/features/live-training.js";

const ESSENTIAL=[11,12,13,14,15,16,23,24];

function poseFrame({t,wristX,fps=30}){
  const landmarks=Array(33).fill(null);
  const worldLandmarks=Array(33).fill(null);

  for(const index of ESSENTIAL){
    landmarks[index]={x:.5,y:.5,z:0,visibility:.96};
  }

  worldLandmarks[15]={x:wristX,y:.2,z:0,visibility:.96};
  worldLandmarks[16]={x:0,y:.2,z:0,visibility:.96};

  return{landmarks,worldLandmarks,timestampMs:t,fps};
}

function runTrace(xs){
  const analyzer=new LiveTrainingAnalyzer();
  const strikes=[];
  xs.forEach((x,index)=>{
    const result=analyzer.analyze(poseFrame({t:index*33,wristX:x}));
    if(result.strike)strikes.push(result.strike);
  });
  return strikes;
}

test("synthetic straight-punch trace produces exactly one strike",()=>{
  const xs=[
    0,0,0,
    .08,.16,.24,.32,.40,
    .40,.40,.40,.40,
  ];
  const strikes=runTrace(xs);
  assert.equal(strikes.length,1);
  assert.equal(strikes[0].hand,"left");
  assert.ok(strikes[0].peakSpeed>=2.2);
  assert.ok(strikes[0].straightness>.95);
});

test("slow controlled hand movement does not trigger a strike",()=>{
  const xs=[0,.01,.02,.03,.04,.05,.06,.07,.08,.09,.10,.11,.12,.13,.14];
  const strikes=runTrace(xs);
  assert.equal(strikes.length,0);
});

test("single-frame landmark spike is suppressed by median speed filtering",()=>{
  const xs=[0,0,0,.35,.35,.35,.35,.35];
  const strikes=runTrace(xs);
  assert.equal(strikes.length,0);
});

test("poor framing blocks strike emission even when wrist motion is fast",()=>{
  const analyzer=new LiveTrainingAnalyzer();
  const strikes=[];
  const xs=[0,0,0,.08,.16,.24,.32,.40,.40,.40,.40];
  xs.forEach((x,index)=>{
    const f=poseFrame({t:index*33,wristX:x});
    f.landmarks[11]={x:1.02,y:.5,z:0,visibility:.96};
    f.landmarks[23]={x:1.02,y:.5,z:0,visibility:.96};
    f.landmarks[24]={x:1.02,y:.5,z:0,visibility:.96};
    const result=analyzer.analyze(f);
    if(result.strike)strikes.push(result.strike);
  });
  assert.equal(strikes.length,0);
});
