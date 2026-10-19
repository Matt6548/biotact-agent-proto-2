export const TRAINING_LEVELS=[
  {id:1,name:"Deflect",distance:.22,success:(result)=>(result.flame.effectiveStress??0)>=.34},
  {id:2,name:"Destabilize",distance:.30,success:(result)=>(result.flame.instability??0)>=.72},
  {id:3,name:"Extinguish",distance:.30,success:(result)=>Boolean(result.flame.extinguished)},
  {id:4,name:"Long range",distance:.42,success:(result)=>Boolean(result.flame.extinguished)},
];

export class TrainingProgression{
  constructor({level=1,requiredStreak=3}={}){
    this.requiredStreak=requiredStreak;
    this.levelIndex=Math.max(0,Math.min(TRAINING_LEVELS.length-1,level-1));
    this.streak=0;
  }

  current(){return TRAINING_LEVELS[this.levelIndex];}

  record(result){
    const level=this.current();
    const success=Boolean(level.success(result));
    this.streak=success?this.streak+1:0;
    let levelUp=false;
    if(this.streak>=this.requiredStreak&&this.levelIndex<TRAINING_LEVELS.length-1){
      this.levelIndex+=1;this.streak=0;levelUp=true;
    }
    return{success,levelUp,streak:this.streak,level:this.current()};
  }

  reset(){this.levelIndex=0;this.streak=0;}
}
