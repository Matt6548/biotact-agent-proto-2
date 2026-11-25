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

// Keep Hand and Pose SDK/WASM pairs independent.
const sdkRoot=path.join(process.cwd(),'node_modules','@mediapipe','hand-local');
const pkg=JSON.parse(fs.readFileSync(path.join(sdkRoot,'package.json'),'utf8'));
if(pkg.name!=='@mediapipe/tasks-vision'||pkg.version!=='0.10.35')throw new Error('Unexpected hand SDK identity');
const sdkBundle=fs.readFileSync(path.join(sdkRoot,'vision_bundle.mjs'));
const forbidden=Buffer.from('odml.pa.googleapis.com');
if(sdkBundle.includes(forbidden))throw new Error('Hand SDK contains known telemetry endpoint');
const wasmRoot=path.join(sdkRoot,'wasm');
const destination=path.join(process.cwd(),'public','mediapipe','hand-0.10.35');
const names=fs.readdirSync(wasmRoot).filter(n=>/^vision_wasm.*\.(js|wasm)$/.test(n)).sort();
for(const required of ['vision_wasm_module_internal.js','vision_wasm_module_internal.wasm'])if(!names.includes(required))throw new Error('Worker-compatible hand WASM missing: '+required);
const entries=names.map(name=>{
  const bytes=fs.readFileSync(path.join(wasmRoot,name));
  if(bytes.includes(forbidden))throw new Error('Known telemetry endpoint in '+name);
  return {name,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),data:bytes};
});
fs.mkdirSync(destination,{recursive:true});
for(const entry of entries)fs.writeFileSync(path.join(destination,entry.name),entry.data);
const provenance={sdk:pkg.name,version:pkg.version,sdkSha256:crypto.createHash('sha256').update(sdkBundle).digest('hex'),wasm:entries.map(({data,...record})=>record),knownEndpointFound:false};
fs.writeFileSync(path.join(destination,'provenance.json'),JSON.stringify(provenance,null,2));
console.log('HAND_SDK_PROVENANCE '+JSON.stringify(provenance));
