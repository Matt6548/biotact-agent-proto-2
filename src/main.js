import "./style.css";
import { buildCoachFeedback } from "./core/coach.js";
import { TrainingProgression } from "./core/progression.js";
import { TrainingRound } from "./core/round.js";
import { StableReadiness, ValidDurationGate } from "./core/readiness.js";
import { DeviceDiagnostics } from "./core/device-diagnostics.js";
import { normalizeStrikeIntensity } from "./core/intensity.js";
import { MotionTraceRecorder, replayMotionTrace, validateMotionTrace } from "./core/motion-trace.js";
import { CandleTrainingSession } from "./features/candle-training.js";
import { LiveTrainingAnalyzer } from "./features/live-training.js";
import { createCandleTarget } from "./render/candle-target.js";
import { PoseTracker } from "./vision/pose-tracker.js";

const session=new CandleTrainingSession();
const analyzer=new LiveTrainingAnalyzer();
const progression=new TrainingProgression();
const round=new TrainingRound({attemptLimit:5});
const traceRecorder=new MotionTraceRecorder({maxFrames:900});
const poseReadiness=new StableReadiness({requiredConsecutive:6});
const calibrationClock=new ValidDurationGate({requiredMs:5000,maxStepMs:100});
const deviceDiagnostics=new DeviceDiagnostics({maxSamples:300,minSamples:30});
const root=document.querySelector("#app");
const HISTORY_KEY="martial-training-lab.attempts.v1";

root.innerHTML=`
<main class="lab">
  <header class="hero">
    <div><h1>Candle Strike</h1><p class="stage-label">Training Arena · local motion + reactive 3D target</p></div>
    <p class="lede">Five controlled strikes. Build a repeatable line, move the virtual flame, then earn the next distance.</p>
  </header>

  <section class="arena-status" aria-label="Training status">
    <div><span>Goal</span><strong id="arena-goal">Deflect the flame</strong></div>
    <div><span>Round</span><strong id="round-count">0 / 5</strong></div>
    <div><span>Target hits</span><strong id="round-success">0 / 3</strong></div>
    <button id="primary-action" type="button">Start training</button>
  </section>

  <section class="live-grid">
    <article class="camera-card" id="camera-card" data-camera="off">
      <div class="camera-head"><h2>Training view</h2><span class="status-pill" id="camera-status" data-state="idle">Camera off</span></div>
      <div class="camera-stage" id="camera-stage">
        <video id="camera" playsinline muted></video><canvas id="pose-overlay"></canvas>
        <div class="frame-guide" aria-hidden="true"><span>Keep shoulders and hips inside this area</span></div>
        <div id="mini-target-canvas" class="mini-target" aria-hidden="true"></div>
        <div id="hit-feedback" class="hit-feedback" aria-live="polite"></div>
        <div class="camera-empty" id="camera-empty"><strong>Start training when you are ready</strong><span>Then stand 1.5–2.5 m away with shoulders, elbows, wrists and hips visible.</span></div>
      </div>
      <div class="setup-line"><div><span>Setup</span><strong id="setup-state">Camera not started</strong></div><button id="stop-camera" class="text-button" type="button" disabled>Stop camera</button></div>
      <details class="tracking-details"><summary>Tracking details</summary><div class="metric-strip"><div><span>Quality</span><strong id="quality">—</strong></div><div><span>FPS</span><strong id="fps">—</strong></div><div><span>Model</span><strong id="model-backend">—</strong></div><div><span>Inference</span><strong id="inference-ms">—</strong></div><div><span>Busy skips/s</span><strong id="busy-skips">—</strong></div><div><span>Left wrist est.</span><strong id="left-speed">—</strong></div><div><span>Right wrist est.</span><strong id="right-speed">—</strong></div></div><div class="device-readiness-line"><span>Device readiness</span><strong id="device-readiness">Collecting…</strong><small>Engineering estimate from runtime FPS and inference latency; not a training or medical score.</small></div></details>
      <p class="camera-note">Use comfortable straight punches for calibration, not maximum effort. Keep real open flames away from the training area.</p>
    </article>

    <article class="target-card">
      <div class="target-head"><h2>Reactive target</h2><button class="text-button" id="reset" type="button">Reset target</button></div>
      <div class="scene" aria-label="Virtual candle"><div id="target-canvas" class="target-canvas"></div><div class="target-overlay"><span id="flame-state" aria-live="polite">Stable flame</span><small>Drag to inspect · wheel/pinch to zoom</small></div></div>
      <div class="strike-result" aria-live="polite"><div><span>Score</span><strong id="score">—</strong></div><div><span>Last strike</span><strong id="last-strike">Waiting</strong></div></div>
      <div class="coach-panel" aria-live="polite">
        <div class="level-line"><span>Training level</span><strong id="level">1 · Deflect</strong><span id="level-progress">0/3</span></div>
        <p id="coach-outcome">Start training to begin.</p><ul id="coach-cues"></ul>
      </div>
    </article>
  </section>

  <section class="round-summary" id="round-summary" hidden>
    <div><span>Round complete</span><strong id="summary-score">—</strong><small>average score</small></div>
    <div><span>Target hits</span><strong id="summary-success">—</strong><small>needed 3 of 5</small></div>
    <div><span>Best intensity</span><strong id="summary-speed">—</strong><small>normalized reference</small></div>
    <div><span>Best line</span><strong id="summary-line">—</strong><small>trajectory straightness</small></div>
  </section>

  <details class="history-card"><summary>Recent attempts <span id="history-count">0</span></summary><div class="history-head"><span>Stored only in this browser</span><button class="text-button" id="clear-history" type="button">Clear</button></div><ol id="history" class="history-list"></ol></details>

  <details class="field-test">
    <summary>Field test data</summary>
    <div class="field-test-body">
      <div>
        <strong>Motion trace</strong>
        <p>Records numeric motion coordinates, timestamps and FPS — no camera image, video or audio. Motion traces can still be sensitive movement data and stay local unless you explicitly export/share them.</p>
      </div>
      <div class="field-test-actions">
        <button id="trace-toggle" class="secondary-button" type="button">Start motion trace</button>
        <button id="trace-export" class="secondary-button" type="button" disabled>Export JSON</button>
        <label class="file-button">Import JSON<input id="trace-import" type="file" accept=".json,application/json" /></label>
        <button id="trace-replay" class="secondary-button" type="button" disabled>Replay analysis</button>
        <button id="trace-clear" class="secondary-button" type="button" disabled>Clear trace</button>
        <button id="device-report-export" class="secondary-button" type="button" disabled>Export device report</button>
      </div>
      <span id="trace-status">No trace recorded.</span>
    </div>
  </details>

  <details class="simulation"><summary>Engineering simulation controls</summary>
    <div class="demo-actions"><button id="demo-round" class="secondary-button" type="button">Start simulated round</button><span>Developer path for QA without a webcam.</span></div>
    <form id="controls" class="controls">
      <label>Strike speed <output id="speed-out">7.0</output><input id="speed" type="range" min="1" max="12" step="0.1" value="7" /></label>
      <label>Alignment <output id="alignment-out">90%</output><input id="alignment" type="range" min="0" max="1" step="0.01" value="0.9" /></label>
      <label>Virtual distance <output id="distance-out">30 cm</output><input id="distance" type="range" min="0.1" max="1" step="0.01" value="0.3" /></label>
      <button type="submit">Simulate strike</button>
    </form>
  </details>
</main>`;

const lab=root.querySelector(".lab");
lab.dataset.live="off";
const mobileTrainingQuery=window.matchMedia("(max-width: 600px)");
const candleRenderer=createCandleTarget(root.querySelector("#target-canvas"),{
  pixelRatio:mobileTrainingQuery.matches?1.4:2,
});
let miniCandleRenderer=null;
const miniTargetContainer=root.querySelector("#mini-target-canvas");
const video=root.querySelector("#camera"),overlay=root.querySelector("#pose-overlay"),ctx=overlay.getContext("2d");
const cameraCard=root.querySelector("#camera-card"),cameraEmpty=root.querySelector("#camera-empty");
const stopCamera=root.querySelector("#stop-camera"),cameraStatus=root.querySelector("#camera-status"),setupState=root.querySelector("#setup-state"),primaryAction=root.querySelector("#primary-action");
const qualityEl=root.querySelector("#quality"),fpsEl=root.querySelector("#fps"),modelBackendEl=root.querySelector("#model-backend"),inferenceEl=root.querySelector("#inference-ms"),busySkipsEl=root.querySelector("#busy-skips"),deviceReadinessEl=root.querySelector("#device-readiness"),leftSpeedEl=root.querySelector("#left-speed"),rightSpeedEl=root.querySelector("#right-speed");
const speed=root.querySelector("#speed"),alignment=root.querySelector("#alignment"),distance=root.querySelector("#distance"),flameState=root.querySelector("#flame-state"),score=root.querySelector("#score"),lastStrike=root.querySelector("#last-strike"),historyEl=root.querySelector("#history"),historyCount=root.querySelector("#history-count");
const coachOutcome=root.querySelector("#coach-outcome"),coachCues=root.querySelector("#coach-cues"),levelEl=root.querySelector("#level"),levelProgress=root.querySelector("#level-progress");
const arenaGoal=root.querySelector("#arena-goal"),roundCount=root.querySelector("#round-count"),roundSuccess=root.querySelector("#round-success"),roundSummary=root.querySelector("#round-summary"),hitFeedback=root.querySelector("#hit-feedback");
const traceToggle=root.querySelector("#trace-toggle"),traceExport=root.querySelector("#trace-export"),traceImport=root.querySelector("#trace-import"),traceReplay=root.querySelector("#trace-replay"),traceClear=root.querySelector("#trace-clear"),deviceReportExport=root.querySelector("#device-report-export"),traceStatus=root.querySelector("#trace-status");
let importedTrace=null,replayingTrace=false;
let tracker=null,relightTimer=null,hitTimer=null,attempts=readHistory(),cameraStarted=false,poseReady=false,calibrated=false,calibrating=false,roundLevel=null,lastRoundOutcome=null;

function syncRendererMode(){
  const useMini=mobileTrainingQuery.matches&&cameraStarted&&!document.hidden;
  if(useMini){
    if(!miniCandleRenderer){
      miniCandleRenderer=createCandleTarget(miniTargetContainer,{
        pixelRatio:1,
        interactive:false,
      });
      miniCandleRenderer.setState(session.flame.snapshot());
    }
    candleRenderer.setActive(false);
    miniCandleRenderer.setActive(true);
    cameraCard.dataset.rendererMode="mini";
    return;
  }

  if(miniCandleRenderer){
    miniCandleRenderer.dispose();
    miniCandleRenderer=null;
  }
  candleRenderer.setActive(!document.hidden);
  cameraCard.dataset.rendererMode=document.hidden?"paused":"full";
}

mobileTrainingQuery.addEventListener?.("change",syncRendererMode);
document.addEventListener("visibilitychange",syncRendererMode);
const CONNECTIONS=[[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24]];

function levelGoal(level){return level.id===1?"Deflect the flame":level.id===2?"Make the flame unstable":level.id===3?"Extinguish the flame":"Extinguish from longer virtual range";}
function readHistory(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]").slice(0,8);}catch{return[];}}
function writeHistory(){localStorage.setItem(HISTORY_KEY,JSON.stringify(attempts.slice(0,8)));}
function renderHistory(){
  historyCount.textContent=String(attempts.length);
  historyEl.innerHTML=attempts.length
    ?attempts.map((a)=>{
        const intensity=Number.isFinite(a.intensityRatio)?`${a.intensityRatio.toFixed(2)}× ref`:`${a.speed.toFixed(1)} m/s`;
        return `<li><span>${a.hand}</span><strong>${intensity}</strong><span>${a.straightness}% straight</span><b>${a.score}</b></li>`;
      }).join("")
    :`<li class="empty-history">No recorded attempts yet.</li>`;
}
function displayedLevel(){
  if(round.complete&&lastRoundOutcome?.completedLevel)return lastRoundOutcome.completedLevel;
  if(round.active&&roundLevel)return roundLevel;
  return progression.current();
}
function updateLevel(){
  const level=displayedLevel();
  arenaGoal.textContent=levelGoal(level);
  const hits=(round.active||round.complete)?Math.min(round.snapshot().successes,progression.requiredSuccesses):0;
  levelProgress.textContent=`${hits}/${progression.requiredSuccesses}`;
  if(round.complete&&lastRoundOutcome?.levelUp){
    levelEl.textContent=`Next · ${lastRoundOutcome.level.id} · ${lastRoundOutcome.level.name}`;
  }else{
    levelEl.textContent=`${level.id} · ${level.name}`;
  }
}
function updatePrimary(){
  if(calibrating){primaryAction.textContent="Calibrating…";primaryAction.disabled=true;return;}
  if(round.active){primaryAction.textContent=`Round active · ${round.snapshot().attempts}/${round.attemptLimit}`;primaryAction.disabled=true;return;}
  primaryAction.disabled=false;
  if(!cameraStarted)primaryAction.textContent="Start training";
  else if(!poseReady){primaryAction.textContent="Loading motion model…";primaryAction.disabled=true;}
  else if(!calibrated&&!poseReadiness.ready){primaryAction.textContent="Step into frame";primaryAction.disabled=true;}
  else if(!calibrated)primaryAction.textContent="Calibrate 5 s";
  else if(round.complete&&lastRoundOutcome?.levelUp)primaryAction.textContent=`Start next level · ${lastRoundOutcome.level.name}`;
  else if(round.complete)primaryAction.textContent="Repeat 5-strike round";
  else primaryAction.textContent="Start 5-strike round";
}
function updateRound(snapshot=round.snapshot()){
  roundCount.textContent=`${snapshot.attempts} / ${snapshot.attemptLimit}`;
  roundSuccess.textContent=`${Math.min(snapshot.successes,progression.requiredSuccesses)} / ${progression.requiredSuccesses}`;
  if(snapshot.complete){
    roundSummary.hidden=false;
    root.querySelector("#summary-score").textContent=String(snapshot.averageScore);
    root.querySelector("#summary-success").textContent=`${snapshot.successes}/${snapshot.attemptLimit}`;
    root.querySelector("#summary-speed").textContent=snapshot.bestIntensityRatio>0?`${snapshot.bestIntensityRatio.toFixed(2)}×`:"—";
    root.querySelector("#summary-line").textContent=`${Math.round(snapshot.bestStraightness*100)}%`;
  }
  updateLevel();updatePrimary();
}
renderHistory();updateLevel();updateRound();updatePrimary();

function saveAttempt(strike,result,level,intensity){
  attempts.unshift({
    hand:strike.hand==="left"?"L":"R",
    speed:strike.peakSpeed,
    intensityRatio:intensity.ratio,
    straightness:Math.round(strike.straightness*100),
    score:result.score.score,
    level:level.id,
    at:Date.now()
  });
  attempts=attempts.slice(0,8);writeHistory();renderHistory();
}
function showCoach(strike,result){
  const feedback=buildCoachFeedback({strike,result});
  coachOutcome.textContent=feedback.outcome;
  coachCues.innerHTML=feedback.cues.map((cue)=>`<li>${cue}</li>`).join("");
}
function flashResult(result){
  const label=result.flame.extinguished?"Extinguished":result.flame.instability>.65?"Strong instability":result.flame.tilt>.3?"Clear deflection":"Flame moved";
  hitFeedback.textContent=`${result.score.score} · ${label}`;
  hitFeedback.classList.remove("show");void hitFeedback.offsetWidth;hitFeedback.classList.add("show");
  clearTimeout(hitTimer);hitTimer=setTimeout(()=>hitFeedback.classList.remove("show"),1100);
}
function resetCandleOnly(){
  session.reset();
  candleRenderer.reset();
  miniCandleRenderer?.reset();
  flameState.textContent="Stable flame";
}
function scheduleRelight(){clearTimeout(relightTimer);relightTimer=setTimeout(resetCandleOnly,2200);}
function renderFlame(result,strikeLabel){
  const impulse=Math.min(1.35,(result.flame.effectiveStress??.3)*1.25);
  candleRenderer.triggerImpulse(impulse);
  miniCandleRenderer?.triggerImpulse(impulse);
  candleRenderer.setState(result.flame);
  miniCandleRenderer?.setState(result.flame);
  flameState.textContent=result.flame.extinguished?"Flame extinguished":result.flame.instability>.65?"Flame highly unstable":result.flame.tilt>.3?"Flame deflected":"Flame disturbed";
  score.textContent=String(result.score.score);lastStrike.textContent=strikeLabel||result.score.grade;flashResult(result);
}
function hapticFor(result){
  if(!navigator.vibrate)return;
  navigator.vibrate(result.flame.extinguished?[28,18,36]:18);
}

function drawPose(landmarks){
  if(!landmarks||!video.videoWidth||!video.videoHeight)return;
  if(overlay.width!==video.videoWidth||overlay.height!==video.videoHeight){overlay.width=video.videoWidth;overlay.height=video.videoHeight;}
  ctx.clearRect(0,0,overlay.width,overlay.height);ctx.lineWidth=Math.max(2,overlay.width/420);ctx.lineCap="round";ctx.strokeStyle="rgba(241,235,215,.84)";ctx.fillStyle="rgba(255,255,255,.96)";
  for(const[a,b]of CONNECTIONS){const pa=landmarks[a],pb=landmarks[b];if(!pa||!pb||(pa.visibility??0)<.5||(pb.visibility??0)<.5)continue;ctx.beginPath();ctx.moveTo(pa.x*overlay.width,pa.y*overlay.height);ctx.lineTo(pb.x*overlay.width,pb.y*overlay.height);ctx.stroke();}
  for(const index of[11,12,13,14,15,16,23,24]){const p=landmarks[index];if(!p||(p.visibility??0)<.5)continue;ctx.beginPath();ctx.arc(p.x*overlay.width,p.y*overlay.height,Math.max(4,overlay.width/180),0,Math.PI*2);ctx.fill();}
}
function setCameraStatus({state,message,delegate}){
  cameraStatus.dataset.state=state;
  cameraStatus.textContent=message;
  if(state==="ready"){
    poseReady=true;
    modelBackendEl.textContent=delegate||"—";
    if(cameraStarted&&!calibrating){
      cameraCard.dataset.pose="missing";
      setupState.textContent="Motion model ready · step into frame";
    }
    updatePrimary();
  }else if(state==="privacy-block"){
    setupState.textContent="External SDK request blocked · training data remains local";
  }else if(state==="error"){
    poseReady=false;
    if(cameraStarted)setupState.textContent="Motion model failed · stop camera and retry";
    updatePrimary();
  }else if(state==="starting"){
    poseReady=false;
    setupState.textContent="Starting camera…";
    updatePrimary();
  }
}

function processStrike(strike,{recordHistory=true,haptic=true}={}){
  clearTimeout(relightTimer);resetCandleOnly();
  const level=round.active&&roundLevel?roundLevel:progression.current();
  const intensity=normalizeStrikeIntensity(strike.peakSpeed,analyzer.profile);
  const result=session.strike({speed:intensity.trainingSpeed,alignment:strike.straightness,distance:level.distance});
  const hand=strike.hand==="left"?"L":"R";
  renderFlame(result,`${hand} · ${intensity.ratio.toFixed(2)}× ref · ${Math.round(strike.straightness*100)}% straight`);
  if(recordHistory)saveAttempt(strike,result,level,intensity);
  if(haptic)hapticFor(result);

  if(round.active){
    const success=progression.evaluate(result,roundLevel);
    const roundState=round.record({
      score:result.score.score,
      success,
      peakSpeed:strike.peakSpeed,
      straightness:strike.straightness,
      intensityRatio:intensity.ratio,
    });
    showCoach(strike,result);
    updateRound(roundState);

    if(roundState.complete){
      const completed=progression.completeRound({successes:roundState.successes});
      lastRoundOutcome=completed;
      roundLevel=null;
      updateLevel();updatePrimary();
      coachOutcome.textContent=completed.levelUp?`Level complete. Next: ${completed.level.name}.`:`Round complete: ${roundState.successes}/5 target hits. Reach ${progression.requiredSuccesses}/5 to advance.`;
      if(completed.levelUp)coachCues.innerHTML="<li>The completed round stays attached to its original goal; the new level begins only when you start again.</li>";
      setTimeout(()=>roundSummary.scrollIntoView({behavior:"smooth",block:"nearest"}),250);
    }
  }else{
    showCoach(strike,result);
    if(!round.complete)coachOutcome.textContent="Strike detected. Finish setup, then start a five-strike round.";
  }

  if(result.flame.extinguished)scheduleRelight();
  return result;
}

function finishCalibration(){
  if(!calibrating)return;
  calibrating=false;
  calibrationClock.reset();
  const profile=analyzer.finishCalibration();
  calibrated=Boolean(profile.ok);
  setupState.textContent=profile.ok
    ?"Ready · personal motion reference set"
    :profile.reason==="movement-too-slow"
      ?"Calibration failed · make 3–5 clear comfortable punches"
      :"Calibration failed · keep your full upper body visible";
  updatePrimary();
}

function updateLive(result){
  if(result.diagnostics){
    if(result.diagnostics.delegate)modelBackendEl.textContent=result.diagnostics.delegate;
    inferenceEl.textContent=Number.isFinite(result.diagnostics.inferenceMs)?`${Math.round(result.diagnostics.inferenceMs)} ms`:"—";
    busySkipsEl.textContent=Number.isFinite(result.diagnostics.busySkipsPerSecond)?String(result.diagnostics.busySkipsPerSecond):"—";
    const deviceReport=deviceDiagnostics.add({fps:result.fps,...result.diagnostics});
    const labels={insufficient:"Collecting…",ready:"Ready",constrained:"Constrained",limited:"Limited"};
    deviceReadinessEl.textContent=labels[deviceReport.status]||"Collecting…";
    deviceReadinessEl.dataset.state=deviceReport.status;
    deviceReportExport.disabled=deviceReport.status==="insufficient";
  }
  if(traceRecorder.active){
    traceRecorder.add(result);
    traceStatus.textContent=`Recording · ${traceRecorder.frames.length} frames`;
    if(!traceRecorder.active){
      traceToggle.textContent="Start motion trace";
      traceExport.disabled=traceRecorder.frames.length===0;
      traceStatus.textContent=`Trace capped · ${traceRecorder.frames.length} frames`;
    }
  }
  drawPose(result.landmarks);
  const analysis=analyzer.analyze(result);

  if(!analysis.metrics){
    cameraCard.dataset.pose="missing";
    poseReadiness.update(false);
    qualityEl.textContent="No pose";
    if(calibrating){
      calibrationClock.update({timestampMs:result.timestampMs,valid:false});
      setupState.textContent="Calibration paused · body not detected";
    }else if(poseReady){
      setupState.textContent="Step fully into frame";
    }
    updatePrimary();
    return;
  }

  const readiness=poseReadiness.update(analysis.quality.ok);
  cameraCard.dataset.pose=readiness.ready?"ready":analysis.quality.ok?"stabilizing":"adjust";
  fpsEl.textContent=String(analysis.metrics.fps);
  leftSpeedEl.textContent=`${analysis.metrics.leftWristSpeed.toFixed(1)} m/s`;
  rightSpeedEl.textContent=`${analysis.metrics.rightWristSpeed.toFixed(1)} m/s`;
  qualityEl.textContent=analysis.calibrating
    ?analysis.quality.ok?"Calibrating":"Paused"
    :readiness.ready?"Ready":analysis.quality.ok?"Hold position":analysis.quality.reasons.join(" · ");

  if(calibrating){
    const clock=calibrationClock.update({
      timestampMs:result.timestampMs,
      valid:analysis.quality.ok,
    });
    if(analysis.quality.ok){
      setupState.textContent=`Move now · ${(clock.remainingMs/1000).toFixed(1)} s valid`;
    }else{
      setupState.textContent="Calibration paused · adjust framing";
    }
    if(clock.complete)finishCalibration();
  }else{
    setupState.textContent=calibrated
      ?"Ready for round"
      :readiness.ready
        ?"Pose stable · calibrate next"
        :analysis.quality.ok
          ?"Hold position…"
          :"Adjust framing";
  }

  updatePrimary();
  if(analysis.strike)processStrike(analysis.strike);
}

async function startCameraFlow(){
  deviceDiagnostics.reset();
  deviceReadinessEl.textContent="Collecting…";
  deviceReadinessEl.dataset.state="insufficient";
  deviceReportExport.disabled=true;
  primaryAction.disabled=true;primaryAction.textContent="Starting camera…";
  try{
    analyzer.reset();poseReadiness.reset();calibrationClock.reset();poseReady=false;tracker=new PoseTracker({video,onResult:updateLive,onStatus:setCameraStatus});await tracker.start();
    cameraStarted=true;calibrated=false;cameraCard.dataset.camera="on";cameraCard.dataset.pose="loading";lab.dataset.live="on";cameraEmpty.hidden=true;stopCamera.disabled=false;
    syncRendererMode();
    setupState.textContent=poseReady?"Motion model ready · step into frame":"Camera ready · loading motion model…";
  }catch(error){
    setCameraStatus({state:"error",message:error?.message||"Camera failed"});
    setupState.textContent="Camera permission or device unavailable";
    cameraStarted=false;
    lab.dataset.live="off";
  }
  updatePrimary();
}
function runCalibration(){
  if(!tracker||!poseReady||!poseReadiness.ready||calibrating)return;
  analyzer.startCalibration();
  calibrationClock.start();
  calibrating=true;
  setupState.textContent="Move now · 5.0 s valid";
  updatePrimary();
}
function startRound({simulation=false}={}){
  round.start();roundLevel=progression.current();lastRoundOutcome=null;roundSummary.hidden=true;updateRound();
  coachOutcome.textContent=simulation?"Simulated round active. Use Simulate strike five times.":"Round active. Five controlled strikes.";
  coachCues.innerHTML="";resetCandleOnly();score.textContent="—";lastStrike.textContent="Waiting";
}

primaryAction.addEventListener("click",()=>{if(!cameraStarted){startCameraFlow();return;}if(!calibrated){runCalibration();return;}if(!round.active)startRound();});
stopCamera.addEventListener("click",()=>{
  if(traceRecorder.active){
    const trace=traceRecorder.stop();
    traceToggle.textContent="Start motion trace";
    traceExport.disabled=trace.frameCount===0;
    traceStatus.textContent=`Camera stopped · trace closed at ${trace.frameCount} frames.`;
  }
  if(calibrating){
    calibrating=false;
    calibrationClock.reset();
  }
  poseReadiness.reset();
  tracker?.stop();tracker=null;analyzer.reset();cameraStarted=false;poseReady=false;calibrated=false;cameraCard.dataset.camera="off";cameraCard.dataset.pose="off";lab.dataset.live="off";
  syncRendererMode();
  ctx.clearRect(0,0,overlay.width,overlay.height);cameraEmpty.hidden=false;
  stopCamera.disabled=true;qualityEl.textContent="—";fpsEl.textContent="—";modelBackendEl.textContent="—";inferenceEl.textContent="—";busySkipsEl.textContent="—";leftSpeedEl.textContent="—";rightSpeedEl.textContent="—";setupState.textContent="Camera not started";
  if(round.active){round.reset();roundLevel=null;lastRoundOutcome=null;roundSummary.hidden=true;coachOutcome.textContent="Round stopped with the camera. Start training when ready.";coachCues.innerHTML="";}
  updateRound();
});

function syncOutputs(){root.querySelector("#speed-out").value=Number(speed.value).toFixed(1);root.querySelector("#alignment-out").value=`${Math.round(Number(alignment.value)*100)}%`;root.querySelector("#distance-out").value=`${Math.round(Number(distance.value)*100)} cm`;}
[speed,alignment,distance].forEach((input)=>input.addEventListener("input",syncOutputs));syncOutputs();

root.querySelector("#demo-round").addEventListener("click",()=>startRound({simulation:true}));
root.querySelector("#controls").addEventListener("submit",(event)=>{
  event.preventDefault();
  const straightness=Number(alignment.value),peakSpeed=Number(speed.value)/2.5,strike={hand:"right",peakSpeed,straightness};
  if(round.active)processStrike(strike,{recordHistory:false,haptic:false});
  else renderFlame(session.strike({speed:Number(speed.value),alignment:straightness,distance:Number(distance.value)}),"Simulation");
});
root.querySelector("#reset").addEventListener("click",()=>{clearTimeout(relightTimer);resetCandleOnly();score.textContent="—";lastStrike.textContent="Waiting";coachOutcome.textContent=round.active?"Round active. Five controlled strikes.":"Start training to begin.";coachCues.innerHTML="";});
root.querySelector("#clear-history").addEventListener("click",()=>{attempts=[];writeHistory();renderHistory();});

traceToggle.addEventListener("click",()=>{
  if(traceRecorder.active){
    const trace=traceRecorder.stop();
    traceToggle.textContent="Start motion trace";
    traceExport.disabled=trace.frameCount===0;
    traceClear.disabled=trace.frameCount===0;
    traceStatus.textContent=`Recorded ${trace.frameCount} frames. Kept in this tab until cleared or re-recorded.`;
    return;
  }
  if(!cameraStarted||!poseReady){
    traceStatus.textContent="Start the camera and wait for the motion model first.";
    return;
  }
  traceRecorder.start({detectorProfile:analyzer.profile});
  importedTrace=null;
  traceReplay.disabled=true;
  traceClear.disabled=false;
  traceToggle.textContent="Stop motion trace";
  traceExport.disabled=true;
  traceStatus.textContent="Recording numeric pose data…";
});

deviceReportExport.addEventListener("click",()=>{
  const report=deviceDiagnostics.report();
  if(report.status==="insufficient"){
    traceStatus.textContent="Device report needs a little more live camera data.";
    return;
  }
  const blob=new Blob([JSON.stringify(report,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=`candle-strike-device-report-${new Date().toISOString().replace(/[:.]/g,"-")}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  traceStatus.textContent=`Exported device performance report · ${report.status} · ${report.sampleCount} samples.`;
});

traceExport.addEventListener("click",()=>{
  const trace=traceRecorder.export();
  if(!trace.frameCount){
    traceStatus.textContent="No trace to export.";
    return;
  }
  const blob=new Blob([JSON.stringify(trace,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=`candle-strike-motion-trace-${new Date().toISOString().replace(/[:.]/g,"-")}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  traceStatus.textContent=`Exported ${trace.frameCount} numeric frames.`;
});

traceImport.addEventListener("change",async()=>{
  const file=traceImport.files?.[0];
  importedTrace=null;
  traceReplay.disabled=true;
  if(!file)return;
  try{
    const parsed=JSON.parse(await file.text());
    const validation=validateMotionTrace(parsed);
    if(!validation.ok)throw new Error(validation.reason);
    importedTrace=parsed;
    traceReplay.disabled=false;
    traceClear.disabled=false;
    traceStatus.textContent=`Loaded ${validation.frameCount} frames locally for replay.`;
  }catch(error){
    traceStatus.textContent=`Import failed · ${error?.message||"invalid JSON"}`;
  }
});

traceReplay.addEventListener("click",async()=>{
  if(!importedTrace||replayingTrace)return;
  if(cameraStarted){
    traceStatus.textContent="Stop the live camera before replaying a trace.";
    return;
  }
  replayingTrace=true;
  traceReplay.disabled=true;
  analyzer.reset();
  if(importedTrace.detectorProfile)analyzer.applyProfile(importedTrace.detectorProfile);
  let strikes=0;
  traceStatus.textContent="Replaying trace analysis…";
  try{
    await replayMotionTrace(importedTrace,{
      speed:4,
      onFrame:(frame)=>{
        const analysis=analyzer.analyze(frame);
        if(analysis.strike){
          strikes+=1;
          processStrike(analysis.strike,{recordHistory:false,haptic:false});
        }
      },
    });
    traceStatus.textContent=`Replay complete · ${strikes} strike event${strikes===1?"":"s"} detected.`;
  }catch(error){
    traceStatus.textContent=`Replay failed · ${error?.message||"unknown error"}`;
  }finally{
    replayingTrace=false;
    traceReplay.disabled=false;
  }
});


traceClear.addEventListener("click",()=>{
  if(traceRecorder.active){
    traceRecorder.stop();
  }
  traceRecorder.reset();
  importedTrace=null;
  replayingTrace=false;
  traceImport.value="";
  traceToggle.textContent="Start motion trace";
  traceExport.disabled=true;
  traceReplay.disabled=true;
  traceClear.disabled=true;
  traceStatus.textContent="Trace cleared from this tab.";
});
