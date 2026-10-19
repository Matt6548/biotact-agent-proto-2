let FilesetResolver;
let PoseLandmarker;

const BASE_PATH=(import.meta.env.BASE_URL||"/").replace(/\/?$/,"/");
const sameOriginUrl=(relative)=>new URL(`${BASE_PATH}${relative.replace(/^\//,"")}`,self.location.origin).href;
const WASM_ROOT=sameOriginUrl("mediapipe/wasm").replace(/\/$/,"");
const MODEL_URL=sameOriginUrl("models/pose_landmarker_lite.task");

let landmarker=null;
let processing=false;
let guardInstalled=false;

function installSameOriginEgressGuard(){
  if(guardInstalled)return;
  guardInstalled=true;

  const nativeFetch=globalThis.fetch.bind(globalThis);
  globalThis.fetch=(input,init)=>{
    const raw=typeof input==="string"||input instanceof URL?String(input):input?.url;
    const target=new URL(raw,self.location.href);
    if(target.origin!==self.location.origin){
      self.postMessage({type:"egress-blocked",origin:target.origin});
      return Promise.reject(new TypeError(`Blocked external worker request to ${target.origin}`));
    }
    return nativeFetch(input,init);
  };

  if(globalThis.XMLHttpRequest?.prototype){
    const nativeOpen=globalThis.XMLHttpRequest.prototype.open;
    globalThis.XMLHttpRequest.prototype.open=function(method,url,...rest){
      const target=new URL(String(url),self.location.href);
      if(target.origin!==self.location.origin){
        self.postMessage({type:"egress-blocked",origin:target.origin});
        throw new DOMException(`Blocked external XHR to ${target.origin}`,"SecurityError");
      }
      return nativeOpen.call(this,method,url,...rest);
    };
  }
}

async function loadSdk(){
  if(FilesetResolver&&PoseLandmarker)return;
  installSameOriginEgressGuard();
  const sdk=await import("@mediapipe/tasks-vision");
  FilesetResolver=sdk.FilesetResolver;
  PoseLandmarker=sdk.PoseLandmarker;
}

async function makeLandmarker(vision,delegate){
  return PoseLandmarker.createFromOptions(vision,{
    baseOptions:{modelAssetPath:MODEL_URL,delegate},
    runningMode:"VIDEO",
    numPoses:1,
    minPoseDetectionConfidence:.55,
    minPosePresenceConfidence:.55,
    minTrackingConfidence:.55,
    outputSegmentationMasks:false,
  });
}

async function init(){
  await loadSdk();
  const vision=await FilesetResolver.forVisionTasks(WASM_ROOT);
  try{
    landmarker=await makeLandmarker(vision,"GPU");
    self.postMessage({type:"ready",delegate:"GPU",assetOrigin:self.location.origin});
  }catch(gpuError){
    landmarker=await makeLandmarker(vision,"CPU");
    self.postMessage({
      type:"ready",
      delegate:"CPU",
      assetOrigin:self.location.origin,
      fallback:String(gpuError?.message||gpuError),
    });
  }
}

self.onmessage=async(event)=>{
  if(event.data?.type==="init"){
    try{await init();}
    catch(error){self.postMessage({type:"error",error:String(error?.message||error)});}
    return;
  }

  if(event.data?.type!=="frame")return;
  const bitmap=event.data.bitmap;

  if(!landmarker||processing){
    bitmap?.close?.();
    return;
  }

  processing=true;
  const started=performance.now();
  try{
    const result=landmarker.detectForVideo(bitmap,event.data.timestampMs);
    self.postMessage({
      type:"result",
      timestampMs:event.data.timestampMs,
      inferenceMs:performance.now()-started,
      landmarks:result.landmarks?.[0]??null,
      worldLandmarks:result.worldLandmarks?.[0]??null,
    });
  }catch(error){
    self.postMessage({type:"detect-error",error:String(error?.message||error)});
  }finally{
    bitmap?.close?.();
    processing=false;
  }
};
