// Explicit opt-in build step: node scripts/prepare-hand-landmarker-assets.mjs
// No runtime external fetch. Model is checked before being used by a worker.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const URL='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const SHA256='fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1';
const EXPECTED_BYTES=7819105;
const target=path.join(process.cwd(),'public','models','hand_landmarker.task');
fs.mkdirSync(path.dirname(target),{recursive:true});
let bytes;
if(fs.existsSync(target)){
  bytes=fs.readFileSync(target);
} else {
  const response=await fetch(URL,{redirect:'error'});
  if(!response.ok)throw new Error(`Hand model download failed: HTTP ${response.status}`);
  bytes=Buffer.from(await response.arrayBuffer());
}
const sha=crypto.createHash('sha256').update(bytes).digest('hex');
if(bytes.length!==EXPECTED_BYTES||sha!==SHA256){
  // Never leave a corrupted/newly downloaded blob in the public asset folder.
  throw new Error(`Hand model integrity mismatch: ${bytes.length} bytes, sha256=${sha}`);
}
fs.writeFileSync(target,bytes);
fs.writeFileSync(path.join(path.dirname(target),'hand_landmarker.provenance.txt'),
  `model=MediaPipe Hand Landmarker Full FP16 v1\nurl=${URL}\nsha256=${sha}\nbytes=${bytes.length}\n`);
console.log(`Prepared pinned same-origin hand model: ${bytes.length} bytes, sha256=${sha}`);
