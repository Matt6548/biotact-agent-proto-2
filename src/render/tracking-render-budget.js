// Adapted quality-tier / hysteresis design from Damián Sire, MIT.
// https://github.com/damiansire/web-ar-hand-tracking/blob/af0cbcf94dbcf8e07b6da593d3ff04a7459f2c58/src/domain/perf-governor.ts
// License: licenses/web-ar-hand-tracking-MIT.txt. Candle-specific pixel budgets,
// elapsed-time thresholds and camera-result cadence, not upstream FPS constants.
export const TRACKING_TIERS=Object.freeze([
 Object.freeze({name:"high",maxPixels:600000,renderFps:30}),
 Object.freeze({name:"balanced",maxPixels:300000,renderFps:24}),
 Object.freeze({name:"low",maxPixels:150000,renderFps:20}),
 Object.freeze({name:"minimum",maxPixels:75000,renderFps:15}),
]);
export function budgetPixelRatio(width,height,nativeRatio,maxPixels){
 return Math.min(nativeRatio,Math.sqrt(maxPixels/(Math.max(1,width)*Math.max(1,height))));
}
export class TrackingRenderBudget{
 constructor(){this.active=false;this.index=1;this.last=null;this.below=0;this.above=0;this.cooldown=0;}
 get tier(){return TRACKING_TIERS[this.index];}
 setActive(active){
  active=Boolean(active);
  if(active===this.active)return false;
  this.active=active;this.index=1;this.last=null;this.below=0;this.above=0;this.cooldown=0;
  return true;
 }
 sample(fps,now){
  if(!this.active||!Number.isFinite(fps)||fps<0||!Number.isFinite(now))return false;
  const prev=this.last;
  if(prev!==null&&now<=prev)return false;
  this.last=now;
  if(prev===null)return false;
  const dt=now-prev;
  if(dt>1500){this.below=0;this.above=0;return false;}
  if(this.cooldown>0){this.cooldown=Math.max(0,this.cooldown-dt);return false;}
  if(fps<7&&this.index<TRACKING_TIERS.length-1){this.below+=dt;this.above=0;}
  else if(fps>=12&&this.index>0){this.above+=dt;this.below=0;}
  else{this.below=0;this.above=0;}
  if(this.below>=1200){this.index++;}
  else if(this.above>=6000){this.index--;}
  else return false;
  this.below=0;this.above=0;this.cooldown=2200;return true;
 }
}
