// Only for isolated negative-control builds. Never write into public/ or dist/.
import fs from 'node:fs';
import path from 'node:path';
const out=process.argv[2];
if(!['.hand-runtime-dist','.pose-audit-dist'].includes(out))throw new Error('Expected isolated QA output directory');
const root=path.resolve('node_modules/@mediapipe/legacy-qa');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if(pkg.version!=='1.1.1'||pkg.name!=='@mediapipe/tasks-vision')throw new Error('Legacy QA SDK identity mismatch');
const dest=path.join(out,'mediapipe','legacy-qa-wasm');
fs.mkdirSync(dest,{recursive:true});
for(const name of fs.readdirSync(path.join(root,'wasm')).filter(n=>/^vision_wasm.*\.(js|wasm)$/.test(n)))fs.copyFileSync(path.join(root,'wasm',name),path.join(dest,name));
console.log('Prepared legacy SDK assets exclusively under '+out);
