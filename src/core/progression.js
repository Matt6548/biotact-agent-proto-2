export const TRAINING_LEVELS=[
  {id:1,name:"Deflect",distance:.22,success:(result)=>(result.flame.effectiveStress??0)>=.34},
  {id:2,name:"Destabilize",distance:.30,success:(result)=>(result.flame.instability??0)>=.72},
  {id:3,name:"Extinguish",distance:.30,success:(result)=>Boolean(result.flame.extinguished)},
  {id:4,name:"Long range",distance:.42,success:(result)=>Boolean(result.flame.extinguished)},
];

export class TrainingProgression{
  constructor({level=1,requiredSuccesses=3}={}){
    this.requiredSuccesses=requiredSuccesses;
    this.levelIndex=Math.max(0,Math.min(TRAINING_LEVELS.length-1,level-1));
  }

  current(){return TRAINING_LEVELS[this.levelIndex];}

  evaluate(result,level=this.current()){
    return Boolean(level.success(result));
  }

  completeRound({successes=0}={}){
    const completedLevel=this.current();
    const passed=successes>=this.requiredSuccesses;
    let levelUp=false;

    if(passed&&this.levelIndex<TRAINING_LEVELS.length-1){
      this.levelIndex+=1;
      levelUp=true;
    }

    return{
      passed,
      levelUp,
      successes,
      requiredSuccesses:this.requiredSuccesses,
      completedLevel,
      level:this.current(),
    };
  }

  reset(){this.levelIndex=0;}
}
