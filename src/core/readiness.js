export class StableReadiness{
  constructor({requiredConsecutive=6}={}){
    this.requiredConsecutive=Math.max(1,Math.floor(requiredConsecutive));
    this.reset();
  }

  reset(){
    this.streak=0;
    this.ready=false;
  }

  update(valid){
    if(valid){
      this.streak=Math.min(this.requiredConsecutive,this.streak+1);
    }else{
      this.streak=0;
    }
    this.ready=this.streak>=this.requiredConsecutive;
    return this.snapshot();
  }

  snapshot(){
    return{ready:this.ready,streak:this.streak,requiredConsecutive:this.requiredConsecutive};
  }
}

export class ValidDurationGate{
  constructor({requiredMs=5000,maxStepMs=100}={}){
    this.requiredMs=Math.max(1,requiredMs);
    this.maxStepMs=Math.max(1,maxStepMs);
    this.reset();
  }

  reset(){
    this.active=false;
    this.remainingMs=this.requiredMs;
    this.lastValidTimestamp=null;
    this.complete=false;
  }

  start(){
    this.active=true;
    this.remainingMs=this.requiredMs;
    this.lastValidTimestamp=null;
    this.complete=false;
    return this.snapshot();
  }

  update({timestampMs,valid}={}){
    if(!this.active||this.complete)return this.snapshot();

    if(!valid||!Number.isFinite(timestampMs)){
      this.lastValidTimestamp=null;
      return this.snapshot();
    }

    if(this.lastValidTimestamp!==null){
      const delta=Math.max(0,Math.min(this.maxStepMs,timestampMs-this.lastValidTimestamp));
      this.remainingMs=Math.max(0,this.remainingMs-delta);
    }
    this.lastValidTimestamp=timestampMs;

    if(this.remainingMs<=0){
      this.complete=true;
      this.active=false;
    }

    return this.snapshot();
  }

  snapshot(){
    return{
      active:this.active,
      complete:this.complete,
      remainingMs:this.remainingMs,
      progress:1-this.remainingMs/this.requiredMs,
    };
  }
}
