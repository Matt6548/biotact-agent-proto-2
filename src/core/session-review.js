const FOCUS={
  "line-control":{
    title:"Line control",
    cue:"Keep the wrist path narrow and repeat the same line before adding intensity.",
  },
  "tempo-control":{
    title:"Tempo control",
    cue:"Match the same comfortable acceleration across the whole round.",
  },
  "candle-effect":{
    title:"Candle effect",
    cue:"Keep the clean line and build acceleration smoothly until the flame response repeats.",
  },
  repeatability:{
    title:"Repeatability",
    cue:"Hold the same pattern for another round before increasing difficulty.",
  },
};

export class TrainingSessionReview{
  constructor({maxRounds=12}={}){
    this.maxRounds=Math.max(1,Math.floor(maxRounds));
    this.reset();
  }

  reset(){
    this.rounds=[];
    return this.snapshot();
  }

  recordRound({levelId=1,roundSummary={},insight={}}={}){
    const attempts=Math.max(0,Number(roundSummary.attempts)||0);
    if(!attempts)return this.snapshot();

    this.rounds.push({
      levelId:Number.isFinite(levelId)?levelId:1,
      attempts,
      successes:Math.max(0,Number(roundSummary.successes)||0),
      averageScore:Math.max(0,Number(roundSummary.averageScore)||0),
      repeatabilityIndex:insight.ready&&Number.isFinite(insight.repeatabilityIndex)
        ?Math.max(0,Math.min(100,insight.repeatabilityIndex))
        :null,
      limiter:FOCUS[insight.limiter]?insight.limiter:"repeatability",
    });
    if(this.rounds.length>this.maxRounds)this.rounds.shift();
    return this.snapshot();
  }

  snapshot(){
    if(!this.rounds.length){
      return{
        roundsCompleted:0,
        totalAttempts:0,
        targetHits:0,
        averageScore:0,
        averageRepeatability:null,
        focus:{key:"repeatability",...FOCUS.repeatability},
      };
    }

    const roundsCompleted=this.rounds.length;
    const totalAttempts=this.rounds.reduce((sum,round)=>sum+round.attempts,0);
    const targetHits=this.rounds.reduce((sum,round)=>sum+round.successes,0);
    const weightedScore=this.rounds.reduce((sum,round)=>sum+round.averageScore*round.attempts,0);
    const averageScore=totalAttempts?Math.round(weightedScore/totalAttempts):0;

    const repeatability=this.rounds
      .map((round)=>round.repeatabilityIndex)
      .filter(Number.isFinite);
    const averageRepeatability=repeatability.length
      ?Math.round(repeatability.reduce((sum,value)=>sum+value,0)/repeatability.length)
      :null;

    const counts={};
    for(const round of this.rounds){
      if(round.limiter==="repeatability")continue;
      counts[round.limiter]=(counts[round.limiter]||0)+1;
    }
    const focusKey=Object.entries(counts)
      .sort((a,b)=>b[1]-a[1])[0]?.[0]||"repeatability";

    return{
      roundsCompleted,
      totalAttempts,
      targetHits,
      averageScore,
      averageRepeatability,
      focus:{key:focusKey,...FOCUS[focusKey]},
    };
  }
}
