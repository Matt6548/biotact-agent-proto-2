const roundMetric=(value,digits=1)=>Number.isFinite(value)?Number(value.toFixed(digits)):null;

export function percentile(values=[],q=.5){
  const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!sorted.length)return null;
  const clamped=Math.min(1,Math.max(0,q));
  const index=(sorted.length-1)*clamped;
  const lower=Math.floor(index),upper=Math.ceil(index);
  if(lower===upper)return sorted[lower];
  const weight=index-lower;
  return sorted[lower]*(1-weight)+sorted[upper]*weight;
}

export class DeviceDiagnostics{
  constructor({maxSamples=300,minSamples=30}={}){
    this.maxSamples=Math.max(30,Math.floor(maxSamples));
    this.minSamples=Math.max(10,Math.floor(minSamples));
    this.reset();
  }

  reset(){
    this.samples=[];
    this.delegate=null;
  }

  add({fps,inferenceMs,busySkipsPerSecond,delegate}={}){
    if(delegate)this.delegate=String(delegate);
    if(!Number.isFinite(fps)||!Number.isFinite(inferenceMs))return this.report();
    this.samples.push({
      fps,
      inferenceMs,
      busySkipsPerSecond:Number.isFinite(busySkipsPerSecond)?busySkipsPerSecond:0,
    });
    if(this.samples.length>this.maxSamples)this.samples.shift();
    return this.report();
  }

  report(){
    const fps=this.samples.map((sample)=>sample.fps);
    const inference=this.samples.map((sample)=>sample.inferenceMs);
    const skips=this.samples.map((sample)=>sample.busySkipsPerSecond);
    const medianFps=percentile(fps,.5);
    const p10Fps=percentile(fps,.1);
    const medianInferenceMs=percentile(inference,.5);
    const p90InferenceMs=percentile(inference,.9);
    const medianBusySkipsPerSecond=percentile(skips,.5);
    const maxBusySkipsPerSecond=skips.length?Math.max(...skips):null;

    let status="insufficient";
    if(this.samples.length>=this.minSamples){
      if((medianFps??0)>=20&&(p90InferenceMs??Infinity)<=50)status="ready";
      else if((medianFps??0)>=15&&(p90InferenceMs??Infinity)<=80)status="constrained";
      else status="limited";
    }

    return{
      schemaVersion:1,
      kind:"martial-training-device-performance",
      sampleCount:this.samples.length,
      delegate:this.delegate,
      status,
      metrics:{
        medianFps:roundMetric(medianFps),
        p10Fps:roundMetric(p10Fps),
        medianInferenceMs:roundMetric(medianInferenceMs),
        p90InferenceMs:roundMetric(p90InferenceMs),
        medianBusySkipsPerSecond:roundMetric(medianBusySkipsPerSecond),
        maxBusySkipsPerSecond:roundMetric(maxBusySkipsPerSecond),
      },
      thresholds:{
        appMinimumFps:20,
        readyP90InferenceMs:50,
        constrainedMinimumFps:15,
        constrainedP90InferenceMs:80,
      },
      privacy:{
        containsBodyCoordinates:false,
        containsVideo:false,
        containsAudio:false,
        containsDeviceIdentifier:false,
        note:"Aggregate runtime performance only. Engineering estimate, not a biomechanical or medical measurement.",
      },
    };
  }
}
