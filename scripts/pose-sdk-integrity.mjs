// Exact bytes from the previously audited Hand 0.10.35 SDK.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export const POSE_SDK_VERSION='0.10.35';
const SDK_SHA='55d7ab624fbb70dcc5adc4ae6d7ea9cfcb569139d3dbfbf2b1deafcb966bc0fe';
const hashes={
 'vision_wasm_internal.js':'e7fd9858e8e8f221d9b96eddc11f8e077f263e0b7bbd79d3cbe882b134274f8c',
 'vision_wasm_internal.wasm':'6a5c64584c2ab61c763b6e204afbdbc7ce1caf7f5216187322bca8df94f646bc',
 'vision_wasm_module_internal.js':'1f1d6215324a1fe62f6742d49a3db911170987ca18ad8c1b75f1a1c82acf2b44',
 'vision_wasm_module_internal.wasm':'617b8e0248dbd27e9d7ece4218004eae4cefb499196d1bb4fa0e3fef21708756',
 'vision_wasm_nosimd_internal.js':'438d1fe8ff7f4d946025bc211c291543c037d8a3785ed4eee60f1f521b236296',
 'vision_wasm_nosimd_internal.wasm':'8a3092d34c79d3f57e6ba8592105e8a90f6b07c27891ffecd14cca428bfd3e31',
};
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
function checked(file,expected){
 const bytes=fs.readFileSync(file);
 if(sha256(bytes)!==expected||bytes.includes(Buffer.from('odml.pa.googleapis.com')))
   throw new Error('Pose SDK integrity mismatch: '+path.basename(file));
 return bytes;
}
function verifyDirectory(dir){
 const names=fs.readdirSync(dir).filter(n=>/^vision_wasm.*\.(js|wasm)$/.test(n)).sort();
 if(JSON.stringify(names)!==JSON.stringify(Object.keys(hashes).sort()))throw new Error('Unexpected Pose WASM file set');
 return names.map(name=>({name,sha256:hashes[name],bytes:checked(path.join(dir,name),hashes[name])}));
}
export function preparePoseWasm(root){
 const sdk=path.join(root,'node_modules','@mediapipe','tasks-vision');
 const pkg=JSON.parse(fs.readFileSync(path.join(sdk,'package.json'),'utf8'));
 if(pkg.name!=='@mediapipe/tasks-vision'||pkg.version!==POSE_SDK_VERSION)throw new Error('Unexpected Pose SDK identity');
 checked(path.join(sdk,'vision_bundle.mjs'),SDK_SHA);
 const files=verifyDirectory(path.join(sdk,'wasm'));
 const dest=path.join(root,'public','mediapipe','wasm');
 // Generated directory only: remove stale 1.1.1 WASM from previous builds.
 fs.rmSync(dest,{recursive:true,force:true});fs.mkdirSync(dest,{recursive:true});
 for(const file of files)fs.writeFileSync(path.join(dest,file.name),file.bytes);
 const provenance={sdk:pkg.name,version:pkg.version,sdkSha256:SDK_SHA,wasm:files.map(f=>({name:f.name,sha256:f.sha256,bytes:f.bytes.length})),knownEndpointFound:false};
 fs.writeFileSync(path.join(dest,'provenance.json'),JSON.stringify(provenance,null,2));
 console.log('POSE_SDK_PROVENANCE '+JSON.stringify(provenance));
 return files.length;
}
export function verifyPoseWasm(dir){return verifyDirectory(dir).length;}
