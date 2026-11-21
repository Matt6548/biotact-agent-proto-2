import { SpeedCalibration } from "../core/calibration.js";
import { averageVisibility, inFrameRatio, qualityGate, RollingMedian, velocityBetween } from "../core/motion-model.js";
import { StrikeDetector } from "../core/strike-detector.js";

const KEY={leftShoulder:11,rightShoulder:12,leftElbow:13,rightElbow:14,leftWrist:15,rightWrist:16,leftHip:23,rightHip:24};
const ESSENTIAL=Object.values(KEY);
const MAX_TRACKING_GAP_MS=180;
const MAX_PLAUSIBLE_WRIST_SPEED=9;

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
    this.lastTimestampMs=null;
    this.lastEmittedAt=-Infinity;
  }

  resetMotionState(){
    this.detectors.left.reset();
    this.detectors.right.reset();
    this.speedFilters.left.reset();
    this.speedFilters.right.reset();
    this.previous={left:null,right:null};
    this.trackingValid=false;
    this.lastTimestampMs=null;
    this.lastEmittedAt=-Infinity;
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

    // Global mean visibility can hide an occluded striking hand.
    if([KEY.leftWrist,KEY.rightWrist,KEY.leftElbow,KEY.rightElbow]
      .some((index)=>(landmarks[index]?.visibility??0)<.65)){
      quality.ok=false;
      quality.reasons.push("arm-occluded");
    }

    if(!Number.isFinite(timestampMs)){
      quality.ok=false;
      quality.reasons.push("invalid-timestamp");
    }else if(this.lastTimestampMs!==null){
      const delta=timestampMs-this.lastTimestampMs;
      if(delta<=0||delta>MAX_TRACKING_GAP_MS){
        quality.ok=false;
        quality.reasons.push("tracking-gap");
      }
    }

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
      this.lastTimestampMs=timestampMs;
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
    if(rawLeftSpeed>MAX_PLAUSIBLE_WRIST_SPEED||rawRightSpeed>MAX_PLAUSIBLE_WRIST_SPEED){
      this.resetMotionState();
      return{
        quality:{ok:false,reasons:["implausible-wrist-jump"]},
        metrics:null,strike:null,calibrating:this.calibration.active,
        profile:this.profile,trackingReset:true,
      };
    }
    const leftSpeed=this.speedFilters.left.push(rawLeftSpeed);
    const rightSpeed=this.speedFilters.right.push(rawRightSpeed);
    const maxWristSpeed=Math.max(leftSpeed,rightSpeed);

    if(this.calibration.active)this.calibration.add(maxWristSpeed);

    const leftStrike=this.calibration.active?null:this.detectors.left.update({
      t:timestampMs,speed:leftSpeed,point:leftPoint,origin:worldLandmarks[KEY.leftShoulder],
    });
    const rightStrike=this.calibration.active?null:this.detectors.right.update({
      t:timestampMs,speed:rightSpeed,point:rightPoint,origin:worldLandmarks[KEY.rightShoulder],
    });

    this.previous.left=leftPoint;
    this.previous.right=rightPoint;
    this.lastTimestampMs=timestampMs;

    const candidate=this.calibration.active?null:[
      leftStrike&&{...leftStrike,hand:"left"},
      rightStrike&&{...rightStrike,hand:"right"},
    ].filter(Boolean).sort((a,b)=>b.peakSpeed-a.peakSpeed)[0]??null;
    // Do not count the second arm or a trailing release as a separate strike.
    const strike=candidate&&timestampMs-this.lastEmittedAt>=300?candidate:null;
    if(strike)this.lastEmittedAt=timestampMs;

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
