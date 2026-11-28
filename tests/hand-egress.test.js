import test from 'node:test';
import assert from 'node:assert/strict';
import {installHandEgressGuard} from '../src/vision/hand-egress.js';
test('external fetch is blocked before native transport, and privacy latch stays closed',async()=>{
 const requests=[],events=[];
 const scope={location:new URL('https://local.test/worker.js'),fetch:async(...args)=>{requests.push(args);return {}; }};
 const guard=installHandEgressGuard(scope,{getPhase:()=> 'switch-close-gpu',onBlock:e=>events.push(e)});
 await scope.fetch('/model.task',{redirect:'follow'});
 assert.equal(requests[0][1].redirect,'error');
 await assert.rejects(scope.fetch('https://odml.pa.googleapis.com/v1/log?secret=do-not-record',{method:'POST',body:'private'}),{name:'SecurityError'});
 assert.deepEqual(events,[{type:'egress-blocked',origin:'https://odml.pa.googleapis.com',phase:'switch-close-gpu'}]);
 assert.equal(guard.blocked,true);
 await assert.rejects(scope.fetch('/another.task'),{name:'SecurityError'});
 assert.equal(requests.length,1);
});
test('external XHR never invokes native open',()=>{
 const events=[],requests=[];
 class XHR{open(...args){requests.push(args);}}
 const scope={location:new URL('https://local.test/worker.js'),fetch:async()=>{},XMLHttpRequest:XHR};
 const guard=installHandEgressGuard(scope,{onBlock:e=>events.push(e)});
 const xhr=new scope.XMLHttpRequest();
 assert.throws(()=>xhr.open('POST','https://example.org/'),{name:'SecurityError'});
 assert.equal(requests.length,0);assert.equal(guard.blocked,true);assert.equal(events.length,1);
});
