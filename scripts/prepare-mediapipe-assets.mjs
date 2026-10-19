import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const MODEL_URL="https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const EXPECTED_MODEL_SHA256="59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a";
const ROOT=process.cwd();
const wasmDest=path.join(ROOT,"public","mediapipe","wasm");
const modelDest=path.join(ROOT,"public","models");
const modelPath=path.join(modelDest,"pose_landmarker_lite.task");
const provenancePath=path.join(modelDest,"pose_landmarker_lite.provenance.txt");

fs.mkdirSync(wasmDest,{recursive:true});
fs.mkdirSync(modelDest,{recursive:true});

const wasmEntry=require.resolve("@mediapipe/tasks-vision/vision_wasm_internal.js");
const wasmSourceDir=path.dirname(wasmEntry);
const wasmFiles=fs.readdirSync(wasmSourceDir).filter((name)=>/^vision_wasm.*\.(?:js|wasm)$/.test(name));

if(!wasmFiles.length)throw new Error("No MediaPipe vision WASM files found in installed package.");

for(const name of wasmFiles){
  fs.copyFileSync(path.join(wasmSourceDir,name),path.join(wasmDest,name));
}

if(!fs.existsSync(modelPath)||fs.statSync(modelPath).size<1_000_000){
  const response=await fetch(MODEL_URL);
  if(!response.ok)throw new Error(`Pose model download failed: ${response.status} ${response.statusText}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(modelPath,bytes);
}

const modelBytes=fs.readFileSync(modelPath);
const hash=crypto.createHash("sha256").update(modelBytes).digest("hex");
if(hash!==EXPECTED_MODEL_SHA256){
  throw new Error(`Pose model integrity mismatch. Expected ${EXPECTED_MODEL_SHA256}, got ${hash}`);
}
fs.writeFileSync(
  provenancePath,
  [
    "MediaPipe Pose Landmarker Lite",
    `source=${MODEL_URL}`,
    `sha256=${hash}`,
    `bytes=${modelBytes.length}`,
    "prepared_by=scripts/prepare-mediapipe-assets.mjs",
    ""
  ].join("\n")
);

console.log(`Prepared ${wasmFiles.length} MediaPipe WASM files locally.`);
console.log(`Pose model SHA-256: ${hash}`);
