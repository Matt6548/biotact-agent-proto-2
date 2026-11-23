import test from 'node:test';
import assert from 'node:assert/strict';
import {HandForwardAnalyzer} from '../src/vision/hand-forward-analyzer.js';
import {FreePracticeEngine} from '../src/features/free-practice.js';
import {createHandForwardPractice} from '../src/vision/hand-practice.js';

function sample(t, scale=1, {x=.46, y=.48, hands=1, edge=false, fps=30}={}) {
  const points=Array.from({length:21},(_,i)=>({x:x+(.008*(i%3-1))*scale,y:y+(.007*(i%4-1))*scale,z:0}));
  points[0]={x,y:y+.10*scale,z:0};
  points[5]={x:x-.075*scale,y,z:0};
  points[9]={x,y:y-.08*scale,z:0};
  points[17]={x:x+.075*scale,y,z:0};
  if(edge) points[0].x=1.1;
  return {hands:hands===0?[]:hands===2?[points,points.map(p=>({...p,x:p.x+.03}))]:[points], timestampMs:t,fps};
}
function cycle(a,start,base=1,x=.46){
  let t=start,n=0;
  const values=[1,1,1,1,1.08,1.16,1.25,1.34,1.43,1.52,1.6,1.6,1.6,1.49,1.37,1.25,1.14,1.06,1,1,1,1,1,1];
  for (const v of values){const r=a.analyze(sample(t,base*v,{x}));if(r.strike)n++;t+=33;}
  return {t,n};
}
test('one forward-and-back hand scale pulse is a bounded visual event',()=>{
 const a=new HandForwardAnalyzer({mirrorX:false});
 assert.equal(cycle(a,0).n,1);
});
test('100 independent pulses remain possible, memory remains bounded',()=>{
 const a=new HandForwardAnalyzer();let t=0,n=0;
 for(let i=0;i<100;i++){const r=cycle(a,t);n+=r.n;t=r.t;}
 assert.equal(n,100);
 assert.equal(a.phase,'idle');
 assert.ok(Object.keys(a).length<20);
});
test('different near/far starting size uses relative change rather than raw pixel threshold',()=>{
 for(const scale of [.6,1,1.4])assert.equal(cycle(new HandForwardAnalyzer(),0,scale).n,1);
});
test('static fist, lateral wave and slow scale drift are neutral',()=>{
 const a=new HandForwardAnalyzer();let t=0,n=0;
 for(let i=0;i<150;i++){const r=a.analyze(sample(t,1,{x:.46+(i%20<10?.07:-.07)}));n+=Number(!!r.strike);t+=33;}
 for(let i=0;i<120;i++){const r=a.analyze(sample(t,1+i*.001));n+=Number(!!r.strike);t+=33;}
 assert.equal(n,0);
});
test('ambiguity, partial occlusion, dropped frames and clock rewinds clear partial gestures',()=>{
 const cases=[
  {make:(t)=>sample(t,1.5,{hands:2}),reason:'ambiguous-hands'},
  {make:(t)=>sample(t,1.5,{edge:true}),reason:'hand-partly-hidden'},
  {make:(t)=>sample(t+500,1.5),reason:'tracking-gap'},
  {make:(t)=>sample(t-100,1.5),reason:'tracking-gap'},
  {make:(t)=>sample(t,1.5,{hands:0}),reason:'hand-not-visible'},
  {make:(t)=>sample(t,1.5,{fps:6}),reason:'low-tracking-fps'},
 ];
 for(const item of cases){
  const a=new HandForwardAnalyzer();let t=0;
  for(const v of [1,1.08,1.17,1.3]){a.analyze(sample(t,v));t+=33;}
  const r=a.analyze(item.make(t));
  assert.equal(r.strike,null);
  assert.deepEqual(r.quality.reasons,[item.reason]);
  assert.equal(a.phase,'idle');
 }
});
test('mirrored input has consistent perceived left/right',()=>{
 const a=new HandForwardAnalyzer({mirrorX:false}),b=new HandForwardAnalyzer({mirrorX:true});
 let t=0,d1=null,d2=null;
 const vals=[1,1,1,1,1.08,1.16,1.25,1.34,1.43,1.52,1.6,1.6,1.6,1.49,1.37,1.25,1.14,1.06,1];
 for(const v of vals){
   d1=a.analyze(sample(t,v,{x:.4})).strike?.visualDirection??d1;
   d2=b.analyze(sample(t,v,{x:.6})).strike?.visualDirection??d2;
   t+=33;
 }
 assert.equal(d1,-1);assert.equal(d2,-1);
});
test('full reset after pause/restart cannot complete stale gesture',()=>{
 const a=new HandForwardAnalyzer();let t=0;
 for(const v of [1,1.1,1.2,1.3,1.4]){a.analyze(sample(t,v));t+=33;}
 a.resetMotionState();
 for(const v of [1.3,1.2,1.1,1]){const r=a.analyze(sample(t,v));assert.equal(r.strike,null);t+=33;}
});
test('independent free-practice engine consumes hand events without levels or rounds',()=>{
 const engine=new FreePracticeEngine({analyzer:new HandForwardAnalyzer()});
 engine.start();
 let t=0,responses=0;
 for(let i=0;i<100;i++){
   const values=[1,1,1,1,1.08,1.16,1.25,1.34,1.43,1.52,1.6,1.6,1.6,1.49,1.37,1.25,1.14,1.06,1,1,1,1,1,1];
   for(const v of values){const r=engine.onFrame(sample(t,v));if(r.response)responses++;t+=33;}
 }
 assert.equal(responses,100);
 assert.equal(engine.strikeCount,100);
 assert.equal(engine.state,'practicing');
 assert.equal(engine.recentPeaks.length,16);
 engine.pause();
 assert.equal(engine.onFrame(sample(t,1)).ignored,true);
 engine.resume();
 assert.equal(engine.onFrame(sample(t+33,1)).strike,null);
 engine.stop();
 assert.equal(engine.state,'preview');
});
test('experimental controller shares exclusive camera lifecycle and rejects late frames',async()=>{
 const trackers=[],updates=[];
 const controller=createHandForwardPractice({
   video:{},visibilityTarget:null,onUpdate:(event)=>updates.push(event),
   trackerFactory:(opts)=>{
     const tracker={opts,stopped:false,async start(){},stop(){this.stopped=true;}};
     trackers.push(tracker);return tracker;
   },
 });
 await controller.start();
 trackers[0].opts.onResult(sample(0,1));
 assert.equal(updates.length,1);
 controller.pause();
 assert.equal(trackers[0].stopped,true);
 trackers[0].opts.onResult(sample(33,1));
 assert.equal(updates.length,1);
 await controller.resume();
 assert.equal(trackers.length,2);
 controller.stop();
 assert.equal(trackers[1].stopped,true);
});

test('palm rotation changes only one size axis and fails closed',()=>{
 const a=new HandForwardAnalyzer();
 a.analyze(sample(0));
 const twisted=sample(33);
 twisted.hands[0][5].x-=.045;
 twisted.hands[0][17].x+=.045;
 const r=a.analyze(twisted);
 assert.equal(r.strike,null);
 assert.deepEqual(r.quality.reasons,['hand-shape-or-position-jump']);
});
test('experimental camera permission denial releases tracker and pauses without retry',async()=>{
 let stopped=0,starts=0;
 const controller=createHandForwardPractice({
   video:{},visibilityTarget:null,
   trackerFactory:()=>({async start(){starts++;throw new Error('permission-denied');},stop(){stopped++;}}),
 });
 await assert.rejects(controller.start(),/permission-denied/);
 assert.equal(controller.engine.state,'paused');
 assert.equal(starts,1);
 assert.ok(stopped>=1);
 controller.dispose();
});
test('privacy-block in hand-only mode releases the single camera and worker',async()=>{
 let stopped=0,notify;
 const controller=createHandForwardPractice({
   video:{},visibilityTarget:null,
   trackerFactory:({onStatus})=>{
     notify=onStatus;
     return {async start(){},stop(){stopped++;}};
   },
 });
 await controller.start();
 notify({state:'privacy-block'});
 assert.equal(controller.engine.state,'paused');
 assert.equal(stopped,1);
 controller.dispose();
});
