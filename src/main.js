import "./style.css";
import { CandleTrainingSession } from "./features/candle-training.js";
import { LiveTrainingAnalyzer } from "./features/live-training.js";
import { CandleRenderer } from "./render/candle-renderer.js";
import { PoseTracker } from "./vision/pose-tracker.js";

const session=new CandleTrainingSession();
const analyzer=new LiveTrainingAnalyzer();
const root=document.querySelector("#app");
const HISTORY_KEY="martial-training-lab.attempts.v1";

root.innerHTML=`
<main class="lab">
  <header class="hero">
    <div>
      <h1>Candle Strike</h1>
      <p class="stage-label">Stage 3 · live camera + interactive 3D target</p>
    </div>
    <p class="lede">A non-contact martial-arts training experiment: local pose analysis drives a deterministic virtual flame. The 3D target visualizes the measured result; it does not invent the measurement.</p>
  </header>

  <section class="live-grid">
    <article class="camera-card">
      <div class="camera-head"><h2>Camera trainer</h2><span class="status-pill" id="camera-status" data-state="idle">Camera off</span></div>
      <div class="camera-stage">
        <video id="camera" playsinline muted></video><canvas id="pose-overlay"></canvas>
        <div class="camera-empty" id="camera-empty"><strong>Stand 1.5–2.5 m from the camera</strong><span>Keep shoulders, elbows, wrists and hips visible.</span></div>
      </div>
      <div class="camera-actions">
        <button id="start-camera" type="button">Start camera</button>
        <button id="calibrate" class="secondary" type="button" disabled>Calibrate 5 s</button>
        <button id="stop-camera" class="secondary" type="button" disabled>Stop</button>
      </div>
      <div class="calibration-line"><span>Calibration</span><strong id="calibration-state">Default thresholds</strong></div>
      <div class="metric-strip">
        <div><span>Quality</span><strong id="quality">—</strong></div><div><span>FPS</span><strong id="fps">—</strong></div>
        <div><span>Left wrist</span><strong id="left-speed">—</strong></div><div><span>Right wrist</span><strong id="right-speed">—</strong></div>
      </div>
      <p class="camera-note">Calibrate with 3–5 comfortable straight punches, not maximum effort. Keep real open flames away from the training area.</p>
    </article>

    <article class="target-card">
      <div class="target-head"><h2>Interactive 3D target</h2><button class="text-button" id="reset" type="button">Reset target</button></div>
      <div class="scene" aria-label="Virtual candle">
        <div id="target-canvas" class="target-canvas"></div>
        <div class="target-overlay"><span id="flame-state" aria-live="polite">Stable flame</span><small>Drag to inspect · wheel/pinch to zoom</small></div>
      </div>
      <div class="strike-result" aria-live="polite"><div><span>Score</span><strong id="score">—</strong></div><div><span>Last strike</span><strong id="last-strike">Waiting</strong></div></div>
    </article>
  </section>

  <section class="history-card">
    <div class="history-head"><h2>Recent attempts</h2><button class="text-button" id="clear-history" type="button">Clear</button></div>
    <ol id="history" class="history-list"></ol>
  </section>

  <details class="simulation"><summary>Engineering simulation controls</summary>
    <form id="controls" class="controls">
      <label>Strike speed <output id="speed-out">7.0</output><input id="speed" type="range" min="1" max="12" step="0.1" value="7" /></label>
      <label>Alignment <output id="alignment-out">90%</output><input id="alignment" type="range" min="0" max="1" step="0.01" value="0.9" /></label>
      <label>Virtual distance <output id="distance-out">30 cm</output><input id="distance" type="range" min="0.1" max="1" step="0.01" value="0.3" /></label>
      <button type="submit">Simulate strike</button>
    </form>
  </details>
</main>`;

const candleRenderer=new CandleRenderer(root.querySelector("#target-canvas"));
const video=root.querySelector("#camera"),overlay=root.querySelector("#pose-overlay"),ctx=overlay.getContext("2d");
const cameraEmpty=root.querySelector("#camera-empty"),startCamera=root.querySelector("#start-camera"),stopCamera=root.querySelector("#stop-camera"),calibrateBtn=root.querySelector("#calibrate");
const cameraStatus=root.querySelector("#camera-status"),qualityEl=root.querySelector("#quality"),fpsEl=root.querySelector("#fps"),leftSpeedEl=root.querySelector("#left-speed"),rightSpeedEl=root.querySelector("#right-speed"),calibrationState=root.querySelector("#calibration-state");
const speed=root.querySelector("#speed"),alignment=root.querySelector("#alignment"),distance=root.querySelector("#distance"),flameState=root.querySelector("#flame-state"),score=root.querySelector("#score"),lastStrike=root.querySelector("#last-strike"),historyEl=root.querySelector("#history");
let tracker=null,calibrationTimer=null,attempts=readHistory();
const CONNECTIONS=[[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24]];

function readHistory(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]").slice(0,8);}catch{return[];}}
function writeHistory(){localStorage.setItem(HISTORY_KEY,JSON.stringify(attempts.slice(0,8)));}
function renderHistory(){historyEl.innerHTML=attempts.length?attempts.map((a)=>`<li><span>${a.hand}</span><strong>${a.speed.toFixed(1)} m/s</strong><span>${a.straightness}% straight</span><b>${a.score}</b></li>`).join(""):`<li class="empty-history">No recorded attempts yet.</li>`;}
renderHistory();

function saveAttempt({hand,peakSpeed,straightness},result){attempts.unshift({hand:hand==="left"?"L":"R",speed:peakSpeed,straightness:Math.round(straightness*100),score:result.score.score,at:Date.now()});attempts=attempts.slice(0,8);writeHistory();renderHistory();}

function renderFlame(result,strikeLabel){
  candleRenderer.setState(result.flame);
  flameState.textContent=result.flame.extinguished?"Flame extinguished":result.flame.instability>.65?"Flame highly unstable":result.flame.tilt>.3?"Flame deflected":"Flame disturbed";
  score.textContent=String(result.score.score);lastStrike.textContent=strikeLabel||result.score.grade;
}

function drawPose(landmarks){
  if(!landmarks||!video.videoWidth||!video.videoHeight)return;
  if(overlay.width!==video.videoWidth||overlay.height!==video.videoHeight){overlay.width=video.videoWidth;overlay.height=video.videoHeight;}
  ctx.clearRect(0,0,overlay.width,overlay.height);ctx.lineWidth=Math.max(2,overlay.width/420);ctx.lineCap="round";ctx.strokeStyle="rgba(241,235,215,.84)";ctx.fillStyle="rgba(255,255,255,.96)";
  for(const[a,b]of CONNECTIONS){const pa=landmarks[a],pb=landmarks[b];if(!pa||!pb||(pa.visibility??0)<.5||(pb.visibility??0)<.5)continue;ctx.beginPath();ctx.moveTo(pa.x*overlay.width,pa.y*overlay.height);ctx.lineTo(pb.x*overlay.width,pb.y*overlay.height);ctx.stroke();}
  for(const index of[11,12,13,14,15,16,23,24]){const p=landmarks[index];if(!p||(p.visibility??0)<.5)continue;ctx.beginPath();ctx.arc(p.x*overlay.width,p.y*overlay.height,Math.max(4,overlay.width/180),0,Math.PI*2);ctx.fill();}
}

function setCameraStatus({state,message}){cameraStatus.dataset.state=state;cameraStatus.textContent=message;}
function updateLive(result){
  drawPose(result.landmarks);const analysis=analyzer.analyze(result);
  if(!analysis.metrics){qualityEl.textContent="No pose";return;}
  fpsEl.textContent=String(analysis.metrics.fps);leftSpeedEl.textContent=`${analysis.metrics.leftWristSpeed.toFixed(1)} m/s`;rightSpeedEl.textContent=`${analysis.metrics.rightWristSpeed.toFixed(1)} m/s`;
  qualityEl.textContent=analysis.calibrating?"Calibrating":analysis.quality.ok?"Ready":analysis.quality.reasons.join(" · ");
  if(analysis.strike){
    const result=session.strike({speed:Math.min(12,analysis.strike.peakSpeed*2.5),alignment:analysis.strike.straightness,distance:.3});
    const hand=analysis.strike.hand==="left"?"L":"R";
    renderFlame(result,`${hand} · ${analysis.strike.peakSpeed.toFixed(1)} m/s · ${Math.round(analysis.strike.straightness*100)}% straight`);saveAttempt(analysis.strike,result);
  }
}

startCamera.addEventListener("click",async()=>{startCamera.disabled=true;try{analyzer.reset();tracker=new PoseTracker({video,onResult:updateLive,onStatus:setCameraStatus});await tracker.start();cameraEmpty.hidden=true;stopCamera.disabled=false;calibrateBtn.disabled=false;}catch(error){setCameraStatus({state:"error",message:error?.message||"Camera failed"});startCamera.disabled=false;}});
calibrateBtn.addEventListener("click",()=>{if(!tracker||calibrationTimer)return;analyzer.startCalibration();calibrateBtn.disabled=true;calibrationState.textContent="Move now · 5 s";let remaining=5;const tick=setInterval(()=>{remaining-=1;if(remaining>0)calibrationState.textContent=`Move now · ${remaining} s`;},1000);calibrationTimer=setTimeout(()=>{clearInterval(tick);calibrationTimer=null;const profile=analyzer.finishCalibration();calibrateBtn.disabled=false;calibrationState.textContent=profile.ok?`Personal · peak reference ${profile.peak.toFixed(1)} m/s`:`Calibration failed · ${profile.reason}`;},5000);});
stopCamera.addEventListener("click",()=>{if(calibrationTimer){clearTimeout(calibrationTimer);calibrationTimer=null;}tracker?.stop();tracker=null;analyzer.reset();ctx.clearRect(0,0,overlay.width,overlay.height);cameraEmpty.hidden=false;startCamera.disabled=false;stopCamera.disabled=true;calibrateBtn.disabled=true;qualityEl.textContent="—";fpsEl.textContent="—";leftSpeedEl.textContent="—";rightSpeedEl.textContent="—";});
function syncOutputs(){root.querySelector("#speed-out").value=Number(speed.value).toFixed(1);root.querySelector("#alignment-out").value=`${Math.round(Number(alignment.value)*100)}%`;root.querySelector("#distance-out").value=`${Math.round(Number(distance.value)*100)} cm`;}
[speed,alignment,distance].forEach((input)=>input.addEventListener("input",syncOutputs));syncOutputs();
root.querySelector("#controls").addEventListener("submit",(event)=>{event.preventDefault();renderFlame(session.strike({speed:Number(speed.value),alignment:Number(alignment.value),distance:Number(distance.value)}),"Simulation");});
root.querySelector("#reset").addEventListener("click",()=>{session.reset();candleRenderer.reset();flameState.textContent="Stable flame";score.textContent="—";lastStrike.textContent="Waiting";});
root.querySelector("#clear-history").addEventListener("click",()=>{attempts=[];writeHistory();renderHistory();});
