import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {verifyPoseWasm} from "./pose-sdk-integrity.mjs";

const ROOT=process.cwd();
const EXPECTED_MODEL_SHA256="59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a";
const requireAssets=process.argv.includes("--require-assets");

function fail(message){
  console.error(`[launch-check] FAIL: ${message}`);
  process.exit(1);
}

function ok(message){
  console.log(`[launch-check] OK: ${message}`);
}

function parseVersion(value){
  const [major=0,minor=0,patch=0]=String(value).split(".").map((part)=>Number.parseInt(part,10)||0);
  return{major,minor,patch};
}

function atLeast(current,minimum){
  const a=parseVersion(current),b=parseVersion(minimum);
  if(a.major!==b.major)return a.major>b.major;
  if(a.minor!==b.minor)return a.minor>b.minor;
  return a.patch>=b.patch;
}

if(!atLeast(process.versions.node,"20.19.0")){
  fail(`Node ${process.versions.node} is too old. Install Node 20.19+ (Node 22 recommended).`);
}
ok(`Node ${process.versions.node}`);

for(const file of ["package.json","package-lock.json","index.html","src/main.js"]){
  if(!fs.existsSync(path.join(ROOT,file)))fail(`Missing required file: ${file}`);
}
ok("project files present");

if(!requireAssets){
  console.log("[launch-check] Environment-only check complete.");
  process.exit(0);
}

const modelPath=path.join(ROOT,"public","models","pose_landmarker_lite.task");
if(!fs.existsSync(modelPath))fail("Pose model is missing. Run npm run prepare:vision.");
const modelBytes=fs.readFileSync(modelPath);
const hash=crypto.createHash("sha256").update(modelBytes).digest("hex");
if(hash!==EXPECTED_MODEL_SHA256){
  fail(`Pose model integrity mismatch: ${hash}`);
}
ok("Pose model integrity");

const wasmDir=path.join(ROOT,"public","mediapipe","wasm");
if(!fs.existsSync(wasmDir))fail("MediaPipe WASM directory is missing.");
try{ok(`MediaPipe pinned local runtime assets (${verifyPoseWasm(wasmDir)} verified files)`);}
catch(error){fail(error.message);}

const vitePath=path.join(ROOT,"node_modules","vite","package.json");
if(!fs.existsSync(vitePath))fail("Dependencies are not installed. Run npm ci.");
ok("locked dependencies installed");

console.log("[launch-check] READY: localhost training can start.");
