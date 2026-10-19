export class TrainingRound{
  constructor({attemptLimit=5}={}){
    this.attemptLimit=attemptLimit;
    this.reset();
  }

  reset(){
    this.active=false;
    this.complete=false;
    this.attempts=[];
  }

  start(){
    this.active=true;
    this.complete=false;
    this.attempts=[];
    return this.snapshot();
  }

  record({score=0,success=false,peakSpeed=0,straightness=0,intensityRatio=0}={}){
    if(!this.active||this.complete)return this.snapshot();
    this.attempts.push({
      score:Number.isFinite(score)?score:0,
      success:Boolean(success),
      peakSpeed:Number.isFinite(peakSpeed)?peakSpeed:0,
      straightness:Number.isFinite(straightness)?straightness:0,
      intensityRatio:Number.isFinite(intensityRatio)?intensityRatio:0,
    });
    if(this.attempts.length>=this.attemptLimit){
      this.complete=true;
      this.active=false;
    }
    return this.snapshot();
  }

  summary(){
    if(!this.attempts.length){
      return{attempts:0,successes:0,bestScore:0,averageScore:0,bestSpeed:0,bestStraightness:0,bestIntensityRatio:0};
    }
    const attempts=this.attempts.length;
    const successes=this.attempts.filter((a)=>a.success).length;
    const bestScore=Math.max(...this.attempts.map((a)=>a.score));
    const averageScore=Math.round(this.attempts.reduce((sum,a)=>sum+a.score,0)/attempts);
    const bestSpeed=Math.max(...this.attempts.map((a)=>a.peakSpeed));
    const bestStraightness=Math.max(...this.attempts.map((a)=>a.straightness));
    const bestIntensityRatio=Math.max(...this.attempts.map((a)=>a.intensityRatio||0));
    return{attempts,successes,bestScore,averageScore,bestSpeed,bestStraightness,bestIntensityRatio};
  }

  snapshot(){
    return{
      active:this.active,
      complete:this.complete,
      attemptLimit:this.attemptLimit,
      remaining:Math.max(0,this.attemptLimit-this.attempts.length),
      ...this.summary(),
    };
  }
}
