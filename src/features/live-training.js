import { SpeedCalibration } from "../core/calibration.js";
import { averageVisibility, inFrameRatio, qualityGate, RollingMedian, velocityBetween } from "../core/motion-model.js";
import { StrikeDetector } from "../core/strike-detector.js";

const KEY={leftShoulder:11,rightShoulder:12,leftElbow:13,rightElbow:14,leftWrist:15,rightWrist:16,leftHip:23,rightHip:24};
const ESSENTIAL=Object.values(KEY);

function hasPoint(point){
  return point&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&Number.isFinite(point.z);
}

export class LiveTrainingAnalyzer{
  constructor(){
    this.detectors={left:new StrikeDetector(),right:new StrikeDetector()};
    this.previous={left:null,right:null};
    this.speedFilters={left:new RollingMedian(3),right:new RollingMedian(3)};
    this.calibration=new SpeedCalibration();
    this.profile=null;
    this.trackingValid=false;
  }

  resetMotionState(){
    this.detectors.left.reset();
    this.detectors.right.reset();
    this.speedFilters.left.reset();
    this.speedFilters.right.reset();
    this.previous={left:null,right:null};
    this.trackingValid=false;
  }

  reset(){
    this.resetMotionState();
  }

  startCalibration(){
    this.resetMotionState();
    this.calibration.start();
  }

  finishCalibration(){
    const profile=this.calibration.finish();
    if(profile.ok)this.applyProfile(profile);
    return profile;
  }

  applyProfile(profile){
    if(!profile?.detector)return false;
    this.profile=profile;
    this.detectors.left.configure(profile.detector);
    this.detectors.right.configure(profile.detector);
    this.speedFilters.left.reset();
    this.speedFilters.right.reset();
    this.previous={left:null,right:null};
    this.trackingValid=false;
    return true;
  }

  analyze({landmarks,worldLandmarks,timestampMs,fps}){
    if(!landmarks||!worldLandmarks){
      this.resetMotionState();
      return{
        quality:{ok:false,reasons:["no-pose"]},
        metrics:null,
        strike:null,
        calibrating:this.calibration.active,
        trackingReset:true,
      };
    }

    const visibility=averageVisibility(landmarks,ESSENTIAL);
    const bodyCoverage=inFrameRatio(landmarks,ESSENTIAL);
    const leftWorld=worldLandmarks[KEY.leftWrist];
    const rightWorld=worldLandmarks[KEY.rightWrist];
    const missingWrist=!hasPoint(leftWorld)||!hasPoint(rightWorld);
    const quality=qualityGate({visibility,fps,bodyCoverage});

    if(missingWrist){
      quality.ok=false;
      quality.reasons=[...quality.reasons,"missing-wrist-world"];
    }

    if(!quality.ok){
      this.resetMotionState();
      return{
        quality,
        metrics:{
          visibility,
          bodyCoverage,
          fps,
          leftWristSpeed:0,
          rightWristSpeed:0,
          rawLeftWristSpeed:0,
          rawRightWristSpeed:0,
          maxWristSpeed:0,
        },
        strike:null,
        calibrating:this.calibration.active,
        profile:this.profile,
        trackingReset:true,
      };
    }

    const leftPoint={...leftWorld,t:timestampMs};
    const rightPoint={...rightWorld,t:timestampMs};

    if(!this.trackingValid){
      this.previous.left=leftPoint;
      this.previous.right=rightPoint;
      this.trackingValid=true;
      return{
        quality,
        metrics:{
          visibility,
          bodyCoverage,
          fps,
          leftWristSpeed:0,
          rightWristSpeed:0,
          rawLeftWristSpeed:0,
          rawRightWristSpeed:0,
          maxWristSpeed:0,
        },
        strike:null,
        calibrating:this.calibration.active,
        profile:this.profile,
        trackingReset:false,
        trackingPrimed:true,
      };
    }

    const rawLeftSpeed=velocityBetween(this.previous.left,leftPoint);
    const rawRightSpeed=velocityBetween(this.previous.right,rightPoint);
    const leftSpeed=this.speedFilters.left.push(rawLeftSpeed);
    const rightSpeed=this.speedFilters.right.push(rawRightSpeed);
    const maxWristSpeed=Math.max(leftSpeed,rightSpeed);

    if(this.calibration.active)this.calibration.add(maxWristSpeed);

    const leftStrike=this.calibration.active?null:this.detectors.left.update({t:timestampMs,speed:leftSpeed,point:leftPoint});
    const rightStrike=this.calibration.active?null:this.detectors.right.update({t:timestampMs,speed:rightSpeed,point:rightPoint});

    this.previous.left=leftPoint;
    this.previous.right=rightPoint;

    const strike=this.calibration.active?null:[
      leftStrike&&{...leftStrike,hand:"left"},
      rightStrike&&{...rightStrike,hand:"right"},
    ].filter(Boolean).sort((a,b)=>b.peakSpeed-a.peakSpeed)[0]??null;

    return{
      quality,
      metrics:{
        visibility,bodyCoverage,fps,
        leftWristSpeed:leftSpeed,
        rightWristSpeed:rightSpeed,
        rawLeftWristSpeed:rawLeftSpeed,
        rawRightWristSpeed:rawRightSpeed,
        maxWristSpeed
      },
      strike,
      calibrating:this.calibration.active,
      profile:this.profile,
      trackingReset:false,
      trackingPrimed:false,
    };
  }
}
