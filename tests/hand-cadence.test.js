import test from 'node:test';
import assert from 'node:assert/strict';
import {HandForwardAnalyzer} from '../src/vision/hand-forward-analyzer.js';
import {HandForwardAnalyzer as Baseline} from './fixtures/hand-v2-baseline.js';
import {FreePracticeEngine} from '../src/features/free-practice.js';

function frame(t,scale=1,{fps=10,x=.40,y=.48,width=1,height=1,missing=false}={}){
 const p=Array.from({length:21},()=>({x,y,z:0}));
 p[0]={x,y:y+.10*scale*height,z:0};
 p[5]={x:x-.075*scale*width,y,z:0};
 p[9]={x,y:y-.08*scale*height,z:0};
 p[17]={x:x+.075*scale*width,y,z:0};
 return {timestampMs:t,fps,hands:missing?[]:[p]};
}
function replay(Analyzer,frames){
 const a=new Analyzer({mirrorX:false});let count=0,first=null,confirmed=null,previews=0;
 for(const f of frames){const r=a.analyze(f);if(r.previewMotion){first??=f.timestampMs;previews++;}if(r.strike){count++;confirmed??=f.timestampMs;}}
 return {count,first,confirmed,previews};
}
// Continuous log-scale triangular pulse, sampled with different phase offsets.
// No invented intermediate landmark frames.
function pulse(t,start,duration){
 const u=(t-start)/duration;
 if(u<=0||u>=1)return 1;
 return Math.exp(Math.log(1.65)*(u<.42?u/.42:(1-u)/.58));
}
function trajectory(fps,duration,offset,jitter=false){
 const rows=[],step=1000/fps;
 const start=450+offset;let t=0,i=0;
 while(t<start+duration+650){
   const scale=pulse(t,start,duration)*(1+.004*Math.sin(i*2.1));
   rows.push(frame(t,scale,{fps,x:.40+.015*(scale-1)}));
   t+=step*(jitter?[.85,1.08,.95,1.12][i++%4]:1);if(!jitter)i++;
 }
 return rows;
}
test('same trajectories at 7/10/12/15 FPS, phase offsets and jitter: paired baseline comparison',()=>{
 const report=[];
 for(const fps of [7,10,12,15]){
  let old=0,updated=0,miss=0,firstLead=[],cases=0;
  for(const duration of [480,650,820])for(const fraction of [0,.25,.5,.75])for(const jitter of [false,true]){
   const frames=trajectory(fps,duration,fraction*1000/fps,jitter);
   const b=replay(Baseline,frames),n=replay(HandForwardAnalyzer,frames);
   cases++;old+=b.count===1;updated+=n.count===1;miss+=n.count===0;
   assert.ok(n.count<=1);
   if(n.count){assert.ok(n.first!==null&&n.first<n.confirmed);firstLead.push(n.confirmed-n.first);}
  }
  report.push({fps,cases,baselineConfirmed:old,newConfirmed:updated,missed:miss,medianLeadMs:firstLead.sort((a,b)=>a-b)[Math.floor(firstLead.length/2)]??null});
  assert.ok(updated>=old,'no regression on this controlled rate sweep');
  assert.equal(updated,cases,'retain the initial measured 24/24 on this fixed controlled sweep');
 }
 console.log('HAND_CADENCE_SWEEP '+JSON.stringify(report));
});
test('sparse single strong rise can preview, but a single return sample cannot confirm',()=>{
 const a=new HandForwardAnalyzer();const results=[1,1,1.35,1,1,1].map((s,i)=>a.analyze(frame(i*140,s,{fps:7})));
 assert.ok(results[2].previewMotion);
 assert.ok(results.every(r=>!r.strike));
});
test('negative matrix: noise, lateral drift, rotation, slow approach, held approach, tracking loss, two hands, rewinds',()=>{
 const counts=[];
 for(const fps of [7,10,12,15]){
  const dt=1000/fps;
  const cases=[
   ['noise',i=>frame(i*dt,1+.025*Math.sin(i*2.3),{fps})],
   ['lateral',i=>frame(i*dt,1,{fps,x:.4+.08*Math.sin(i*.4)})],
   ['rotation',i=>frame(i*dt,1,{fps,width:1+.20*Math.sin(i*.25),height:1-.18*Math.sin(i*.25)})],
   ['slow',i=>frame(i*dt,1+.22*Math.sin(i*dt/2500),{fps})],
   ['hold',i=>frame(i*dt,1+Math.min(.45,Math.max(0,(i-4)*.12)),{fps})],
   ['loss',i=>frame(i*dt,pulse(i*dt,400,700),{fps,missing:i*dt>=450&&i*dt<=1050})],
   ['two hands',i=>{const f=frame(i*dt,pulse(i*dt,400,700),{fps});f.hands.push(f.hands[0]);return f;}],
  ];
  for(const [name,make] of cases){
   const frames=Array.from({length:40},(_,i)=>make(i));
   const n=replay(HandForwardAnalyzer,frames);
   counts.push({fps,name,events:n.count,previews:n.previews});
   assert.equal(n.count,0,name+' @'+fps);
   if(['noise','lateral','rotation','slow','two hands'].includes(name))assert.equal(n.previews,0,name);
  }
  const a=new HandForwardAnalyzer();
  a.analyze(frame(0,1,{fps}));a.analyze(frame(dt,1.28,{fps}));
  for(const f of [frame(dt+500,1.4,{fps}),frame(dt+400,1.1,{fps})]){
   const n=a.analyze(f);assert.equal(n.strike,null);assert.equal(n.quality.ok,false);
  }
 }
 console.log('HAND_CADENCE_NEGATIVES '+JSON.stringify(counts));
});
test('preview follows elapsed time, never extinguishes, fades after lost input and never counts a partial gesture',()=>{
 const e=new FreePracticeEngine({analyzer:new HandForwardAnalyzer()});e.start();
 let t=0;
 for(const scale of [1,1,1.29,1.4,1.4]){
  const n=e.onFrame(frame(t,scale,{fps:7}));assert.equal(n.strike,null);assert.equal(n.flame.extinguished,false);assert.ok(Math.abs(n.flame.tilt)<=.193);t+=140;e.tick(.1);
 }
 assert.ok(Math.abs(e.previewTilt)>0);
 const start=Math.abs(e.previewTilt);
 e.tick(.1);assert.ok(Math.abs(e.previewTilt)<start);
 const r=e.onFrame(frame(t,1,{fps:7,missing:true}));assert.equal(r.flame.tilt,0);assert.equal(e.strikeCount,0);
});

test('loss preserves monotonic timestamp boundary; explicit session reset permits new clock',()=>{
 const a=new HandForwardAnalyzer();
 a.analyze(frame(100,1));a.analyze(frame(200,1.2));
 a.analyze(frame(300,1.4,{missing:true}));
 assert.deepEqual(a.analyze(frame(250,1.1)).quality.reasons,['tracking-gap']);
 assert.equal(a.analyze(frame(301,1.1)).trackingPrimed,true);
 a.resetMotionState();
 assert.equal(a.analyze(frame(0,1)).trackingPrimed,true);
});
test('one-second render stall cannot preserve stale preview',()=>{
 const e=new FreePracticeEngine({analyzer:new HandForwardAnalyzer()});e.start();
 e.onFrame(frame(0,1,{fps:7}));e.onFrame(frame(140,1.3,{fps:7}));
 assert.ok(Math.abs(e.previewTilt)>0);
 e.tick(1);assert.equal(e.previewTilt,0);
});
test('ultrafast unobserved pulse and jittered loss never synthesize a confirmed event',()=>{
 const a=new HandForwardAnalyzer();
 const input=[frame(0,1,{fps:7}),frame(143,1,{fps:7}),frame(286,1.36,{fps:7}),frame(430,1,{fps:7}),frame(600,1,{fps:7,missing:true}),frame(743,1,{fps:7})];
 for(const f of input)assert.equal(a.analyze(f).strike,null);
});
