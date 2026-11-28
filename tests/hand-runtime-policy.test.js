import test from 'node:test';
import assert from 'node:assert/strict';
import {HandDelegateLatencyGate} from '../src/vision/hand-runtime-policy.js';
import {PoseTracker} from '../src/vision/pose-tracker.js';

test('ignore warmup and isolated GPU spike; switch only on three sustained slow results',()=>{
 const gate=new HandDelegateLatencyGate();
 assert.deepEqual([800,700,150,65,130,180,160].map(ms=>gate.observe(ms,'GPU')),
   [false,false,false,false,false,false,true]);
 assert.equal(gate.observe(800,'GPU'),false);
});
test('fast GPU stays selected; CPU never switches even if slow',()=>{
 const a=new HandDelegateLatencyGate(),b=new HandDelegateLatencyGate();
 for(let i=0;i<100;i++){
  assert.equal(a.observe(85,'GPU'),false);
  assert.equal(b.observe(800,'CPU'),false);
 }
});
test('delegate change clears prior GPU fps window and delivers neutral transition frame',()=>{
 const updates=[],statuses=[];
 const tracker=new PoseTracker({video:{},onResult:r=>updates.push(r),onStatus:s=>statuses.push(s)});
 tracker.delegate='GPU';tracker.frameTimes=[performance.now(),performance.now()];
 tracker.handleWorkerMessage({type:'result',timestampMs:performance.now()-20,
   inferenceMs:500,delegateChanged:true,delegate:'CPU',switchInitMs:50,hands:[]});
 assert.equal(tracker.delegate,'CPU');
 assert.equal(statuses[0].fallback,'slow-gpu');
 assert.equal(updates[0].fps,1);
 assert.deepEqual(updates[0].hands,[]);
 assert.equal(updates[0].diagnostics.delegate,'CPU');
});
