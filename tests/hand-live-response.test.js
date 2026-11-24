import test from 'node:test';
import assert from 'node:assert/strict';
import {HandForwardAnalyzer} from '../src/vision/hand-forward-analyzer.js';
import {FreePracticeEngine} from '../src/features/free-practice.js';
import {PoseTracker} from '../src/vision/pose-tracker.js';

function hand(t,scale=1,x=.40){
  const p=Array.from({length:21},(_,i)=>({x:x+(.008*(i%3-1))*scale,y:.48+(.007*(i%4-1))*scale,z:0}));
  p[0]={x,y:.48+.10*scale,z:0};
  p[5]={x:x-.075*scale,y:.48,z:0};
  p[9]={x,y:.48-.08*scale,z:0};
  p[17]={x:x+.075*scale,y:.48,z:0};
  return {hands:[p],timestampMs:t,fps:30};
}
const approach=[1,1,1,1.08,1.16,1.25,1.34,1.43,1.52,1.60];
const retreat=[1.60,1.60,1.49,1.37,1.25,1.14,1.06,1,1,1,1,1,1];
function run(e,values,t=0,x=.40){
 let results=[];
 for(const s of values){results.push(e.onFrame(hand(t,s,x)));e.tick(.033);t+=33;}
 return {results,t};
}
test('outbound cue begins before retraction, is bounded and cannot count or extinguish',()=>{
 const e=new FreePracticeEngine({analyzer:new HandForwardAnalyzer({mirrorX:false})});
 e.start();
 const {results,t}=run(e,approach);
 assert.ok(results.some(r=>r.analysis.previewMotion && r.flame.tilt<0));
 assert.ok(results.every(r=>r.strike===null && r.response===null && !r.flame.extinguished && Math.abs(r.flame.tilt)<=.193));
 assert.equal(e.strikeCount,0);
 assert.equal(e.flame.snapshot().tilt,0,'preview never changes physical oscillator state');
 const r=run(e,retreat,t);
 assert.equal(r.results.filter(v=>v.strike).length,1);
 assert.equal(e.strikeCount,1);
 assert.equal(e.previewTilt,0);
});
test('preview direction mirrors correctly',()=>{
 const a=new FreePracticeEngine({analyzer:new HandForwardAnalyzer({mirrorX:false})});
 const b=new FreePracticeEngine({analyzer:new HandForwardAnalyzer({mirrorX:true})});
 a.start();b.start();
 const r=run(a,approach,0,.4).results;
 const s=run(b,approach,0,.6).results;
 assert.equal(r.at(-1).analysis.previewMotion.direction,-1);
 assert.equal(s.at(-1).analysis.previewMotion.direction,-1);
 assert.equal(r.at(-1).flame.tilt,s.at(-1).flame.tilt);
});
test('stationary hand and side-only wave cannot create preview or confirmed event',()=>{
 const e=new FreePracticeEngine({analyzer:new HandForwardAnalyzer()});e.start();
 for(let i=0;i<120;i++){
   const r=e.onFrame(hand(i*33,1,.4+Math.sin(i*.15)*.08));
   assert.equal(r.analysis.previewMotion??null,null);
   assert.equal(r.strike,null);
   assert.equal(r.flame.tilt,0);
 }
});
test('preview decays when input stops; loss clears; pause and relight cancel partial gesture',()=>{
 const e=new FreePracticeEngine({analyzer:new HandForwardAnalyzer()});e.start();
 let {t}=run(e,approach);
 assert.notEqual(e.previewTilt,0);
 for(let i=0;i<20;i++)e.tick(.05);
 assert.equal(e.previewTilt,0);
 assert.equal(e.strikeCount,0);
 const lost=e.onFrame({hands:[],timestampMs:t,fps:30});
 assert.equal(lost.flame.tilt,0);
 assert.equal(lost.strike,null);
 t+=33;run(e,approach,t);
 e.pause();assert.equal(e.previewTilt,0);
 e.resume();e.relight();
 assert.equal(e.snapshot().flame.tilt,0);
 assert.equal(e.strikeCount,0);
});
test('100 complete gestures produce 100 confirmed events and non-accumulating preview',()=>{
 const e=new FreePracticeEngine({analyzer:new HandForwardAnalyzer()});e.start();
 let t=0,count=0;
 for(let i=0;i<100;i++){
  const r=run(e,[...approach,...retreat],t);
  count+=r.results.filter(v=>v.response).length;t=r.t;
  assert.ok(Math.abs(e.previewTilt)<=.193);
 }
 assert.equal(count,100);assert.equal(e.strikeCount,100);
 assert.equal(e.state,'practicing');assert.equal(e.recentPeaks.length,16);
});
test('late stop of previous tracker leaves replacement video stream intact',()=>{
 const oldStream={getTracks:()=>[{stop(){}}]},newStream={getTracks:()=>[]};
 const video={srcObject:newStream};
 const old=new PoseTracker({video});old.stream=oldStream;
 old.stop();
 assert.equal(video.srcObject,newStream);
});
test('nonconsecutive retreat samples cannot confirm gesture',()=>{
 const a=new HandForwardAnalyzer({mirrorX:false});let t=0;
 for(const s of approach){a.analyze(hand(t,s));t+=33;}
 for(const s of [1.49,1.49,1.38]){
  assert.equal(a.analyze(hand(t,s)).strike,null);t+=33;
 }
});
