const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

function percentile(values,q){
  if(!values.length)return 0;
  const sorted=[...values].sort((a,b)=>a-b);
  const index=(sorted.length-1)*q;
  const low=Math.floor(index),high=Math.ceil(index);
  if(low===high)return sorted[low];
  const weight=index-low;
  return sorted[low]*(1-weight)+sorted[high]*weight;
}

export class SpeedCalibration{
  constructor(){this.reset();}
  reset(){this.active=false;this.samples=[];}
  start(){this.active=true;this.samples=[];}
  add(speed){
    if(!this.active||!Number.isFinite(speed)||speed<0)return;
    this.samples.push(speed);
  }
  finish(){
    this.active=false;
    if(this.samples.length<20){
      return{ok:false,reason:"not-enough-samples",sampleCount:this.samples.length};
    }
    const baseline=percentile(this.samples,0.5);
    const peak=percentile(this.samples,0.95);
    if(peak<1.2){
      return{ok:false,reason:"movement-too-slow",sampleCount:this.samples.length,baseline,peak};
    }
    const detector={
      startSpeed:clamp(Math.max(baseline*2.2,peak*0.32),1.0,4.5),
      releaseSpeed:clamp(Math.max(baseline*1.25,peak*0.16),0.45,2.0),
      minPeakSpeed:clamp(peak*0.55,1.5,7.5),
    };
    return{ok:true,sampleCount:this.samples.length,baseline,peak,detector};
  }
}
