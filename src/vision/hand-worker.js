/* Opt-in Hand Landmarker worker. No raw frames or hand sequences leave this worker. */
let FilesetResolver;
let HandLandmarker;
const BASE=(import.meta.env.BASE_URL||'/').replace(/\/?$/,'/');
const sameOrigin=(path)=>new URL(BASE+path,self.location.origin).href;
const WASM_ROOT=sameOrigin('mediapipe/wasm');
const MODEL_URL=sameOrigin('models/hand_landmarker.task');
let landmarker=null;
let processing=false;
let guardInstalled=false;

function installEgressGuard(){
  if(guardInstalled)return;
  guardInstalled=true;
  const nativeFetch=globalThis.fetch.bind(globalThis);
  globalThis.fetch=(input,options)=>{
    const raw=typeof input==='string'||input instanceof URL?String(input):input?.url;
    const target=new URL(raw,self.location.href);
    if(target.origin!==self.location.origin){
      self.postMessage({type:'egress-blocked',origin:target.origin});
      return Promise.reject(new TypeError('Hand worker external request blocked'));
    }
    return nativeFetch(input,options);
  };
  if(globalThis.XMLHttpRequest?.prototype){
    const open=globalThis.XMLHttpRequest.prototype.open;
    globalThis.XMLHttpRequest.prototype.open=function(method,url,...rest){
      const target=new URL(String(url),self.location.href);
      if(target.origin!==self.location.origin){
        self.postMessage({type:'egress-blocked',origin:target.origin});
        throw new DOMException('External hand model XHR blocked','SecurityError');
      }
      return open.call(this,method,url,...rest);
    };
  }
}
async function create(vision,model,delegate){
  return HandLandmarker.createFromOptions(vision,{
    baseOptions:{modelAssetBuffer:model,delegate},
    runningMode:'VIDEO',numHands:2,
    minHandDetectionConfidence:.65,
    minHandPresenceConfidence:.65,
    minTrackingConfidence:.65,
  });
}
async function init(preferredDelegate){
  const started=performance.now();
  installEgressGuard();
  const sdk=await import('@mediapipe/tasks-vision');
  FilesetResolver=sdk.FilesetResolver;
  HandLandmarker=sdk.HandLandmarker;
  const vision=await FilesetResolver.forVisionTasks(WASM_ROOT.replace(/\/$/,''),true);
  vision.wasmLoaderPath=vision.wasmLoaderPath+'?v=1.1.1';
  const response=await fetch(MODEL_URL,{cache:'force-cache'});
  if(!response.ok)throw new Error('Local hand model unavailable: '+response.status);
  const model=new Uint8Array(await response.arrayBuffer());
  if(preferredDelegate==='CPU'){
    landmarker=await create(vision,model,'CPU');
    self.postMessage({type:'ready',delegate:'CPU',initMs:performance.now()-started,assetOrigin:self.location.origin,mode:'hands'});
    return;
  }
  try{
    landmarker=await create(vision,model,'GPU');
    self.postMessage({type:'ready',delegate:'GPU',initMs:performance.now()-started,assetOrigin:self.location.origin,mode:'hands'});
  }catch(error){
    landmarker=await create(vision,model,'CPU');
    self.postMessage({type:'ready',delegate:'CPU',initMs:performance.now()-started,assetOrigin:self.location.origin,mode:'hands',fallback:'GPU initialization failed'});
  }
}
self.onmessage=async({data})=>{
  if(data?.type==='init'){
    try{await init(data.delegate);}catch(error){self.postMessage({type:'error',error:String(error?.message||error)});}
    return;
  }
  if(data?.type!=='frame')return;
  const bitmap=data.bitmap;
  if(!landmarker||processing){bitmap?.close?.();return;}
  processing=true;
  const started=performance.now();
  try{
    const result=landmarker.detectForVideo(bitmap,data.timestampMs);
    // Only numeric landmarks cross to the main thread; no ImageBitmap or pixels.
    self.postMessage({type:'result',timestampMs:data.timestampMs,
      inferenceMs:performance.now()-started,hands:result.landmarks??[],
      landmarks:null,worldLandmarks:null});
  }catch(error){self.postMessage({type:'detect-error',error:String(error?.message||error)});}
  finally{bitmap?.close?.();processing=false;}
};
