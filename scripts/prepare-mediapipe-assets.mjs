import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { preparePoseWasm } from "./pose-sdk-integrity.mjs";
const MODEL_URL="https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const EXPECTED_MODEL_SHA256="59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a";
const ROOT=process.cwd();
const modelDest=path.join(ROOT,"public","models");
const modelPath=path.join(modelDest,"pose_landmarker_lite.task");
const provenancePath=path.join(modelDest,"pose_landmarker_lite.provenance.txt");

fs.mkdirSync(modelDest,{recursive:true});
const wasmCount=preparePoseWasm(ROOT);

if(!fs.existsSync(modelPath)||fs.statSync(modelPath).size<1_000_000){
  const response=await fetch(MODEL_URL,{redirect:"error"});
  if(!response.ok)throw new Error(`Pose model download failed: ${response.status} ${response.statusText}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(crypto.createHash("sha256").update(bytes).digest("hex")!==EXPECTED_MODEL_SHA256)throw new Error("Downloaded Pose model integrity mismatch");
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

console.log(`Prepared ${wasmCount} MediaPipe WASM files locally.`);
console.log(`Pose model SHA-256: ${hash}`);
