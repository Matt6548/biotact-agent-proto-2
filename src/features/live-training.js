import { SpeedCalibration } from "../core/calibration.js";
import { averageVisibility, inFrameRatio, qualityGate, RollingMedian, velocityBetween } from "../core/motion-model.js";
import { StrikeDetector } from "../core/strike-detector.js";

const KEY={leftShoulder:11,rightShoulder:12,leftElbow:13,rightElbow:14,leftWrist:15,rightWrist:16,leftHip:23,rightHip:24};
const ESSENTIAL=Object.values(KEY);

export class LiveTrainingAnalyzer{
  constructor(){
    this.detectors={left:new StrikeDetector(),right:new StrikeDetector()};
    this.previous={left:null,right:null};
    this.speedFilters={left:new RollingMedian(3),right:new RollingMedian(3)};
    this.calibration=new SpeedCalibration();
    this.profile=null;
  }

  reset(){
    this.detectors.left.reset();
    this.detectors.right.reset();
    this.speedFilters.left.reset();
    this.speedFilters.right.reset();
    this.previous={left:null,right:null};
  }

  startCalibration(){
    this.reset();
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
    return true;
  }

  analyze({landmarks,worldLandmarks,timestampMs,fps}){
    if(!landmarks||!worldLandmarks){
      return{quality:{ok:false,reasons:["no-pose"]},metrics:null,strike:null,calibrating:this.calibration.active};
    }

    const visibility=averageVisibility(landmarks,ESSENTIAL);
    const bodyCoverage=inFrameRatio(landmarks,ESSENTIAL);
    const quality=qualityGate({visibility,fps,bodyCoverage});

    const leftPoint={...worldLandmarks[KEY.leftWrist],t:timestampMs};
    const rightPoint={...worldLandmarks[KEY.rightWrist],t:timestampMs};

    const rawLeftSpeed=velocityBetween(this.previous.left,leftPoint);
    const rawRightSpeed=velocityBetween(this.previous.right,rightPoint);
    const leftSpeed=this.speedFilters.left.push(rawLeftSpeed);
    const rightSpeed=this.speedFilters.right.push(rawRightSpeed);
    const maxWristSpeed=Math.max(leftSpeed,rightSpeed);

    if(this.calibration.active&&visibility>=0.65&&bodyCoverage>=0.6){
      this.calibration.add(maxWristSpeed);
    }

    const leftStrike=this.calibration.active?null:this.detectors.left.update({t:timestampMs,speed:leftSpeed,point:leftPoint});
    const rightStrike=this.calibration.active?null:this.detectors.right.update({t:timestampMs,speed:rightSpeed,point:rightPoint});

    this.previous.left=leftPoint;
    this.previous.right=rightPoint;

    const strike=!quality.ok||this.calibration.active?null:[
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
    };
  }
}
