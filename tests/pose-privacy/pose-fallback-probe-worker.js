// QA-only fault injection. Real product worker, real first GPU graph and
// second CPU graph. No changes to product logic or external permissions.
import {installHandEgressGuard} from '../../src/vision/hand-egress.js';
installHandEgressGuard(self,{getPhase:()=> 'qa-fallback-bootstrap',onBlock:event=>self.postMessage(event)});
// Queue init until the test-only instrumentation and real worker are ready.
const queue=[];
self.onmessage=event=>queue.push(event);
try{
 const {PoseLandmarker}=await import('@mediapipe/tasks-vision');
 const original=PoseLandmarker.createFromOptions;
 let injected=false;
 PoseLandmarker.createFromOptions=async function(vision,options){
  if(options.baseOptions?.delegate==='GPU'&&!injected){
   // Ensure the first local WASM module really initializes before fault
   // injection. Close it, then make create() reject in the production worker.
   const graph=await original.call(this,vision,options);
   graph.close();injected=true;
   self.postMessage({type:'qa-injected-gpu-failure'});
   throw new Error('QA forced failure after real GPU graph close');
  }
  return original.call(this,vision,options);
 };
 await import('../../src/vision/pose-worker.js');
 const handler=self.onmessage;
 for(const event of queue)handler(event);
}catch(error){self.postMessage({type:'error',error:String(error?.message??error)});}
