import "./style.css";
import { CandleTrainingSession } from "./features/candle-training.js";
import { LiveTrainingAnalyzer } from "./features/live-training.js";
import { PoseTracker } from "./vision/pose-tracker.js";

const session = new CandleTrainingSession();
const analyzer = new LiveTrainingAnalyzer();
const root = document.querySelector("#app");

root.innerHTML = `
  <main class="lab">
    <header class="hero">
      <div>
        <p class="eyebrow">Stage 1 · camera & motion foundation</p>
        <h1>Candle Strike</h1>
      </div>
      <p class="lede">Train a controlled non-contact strike. The camera estimates motion locally in your browser; the current flame response is deterministic but still awaiting physical calibration.</p>
    </header>

    <section class="live-grid">
      <article class="camera-card">
        <div class="camera-head">
          <div>
            <span class="section-kicker">Live motion</span>
            <h2>Camera trainer</h2>
          </div>
          <span class="status-pill" id="camera-status" data-state="idle">Camera off</span>
        </div>

        <div class="camera-stage">
          <video id="camera" playsinline muted></video>
          <canvas id="pose-overlay"></canvas>
          <div class="camera-empty" id="camera-empty">
            <strong>Stand 1.5–2.5 m from the camera</strong>
            <span>Keep shoulders, elbows, wrists and hips visible.</span>
          </div>
        </div>

        <div class="camera-actions">
          <button id="start-camera" type="button">Start camera</button>
          <button id="stop-camera" class="secondary" type="button" disabled>Stop</button>
        </div>

        <div class="metric-strip">
          <div><span>Quality</span><strong id="quality">—</strong></div>
          <div><span>FPS</span><strong id="fps">—</strong></div>
          <div><span>Left wrist</span><strong id="left-speed">—</strong></div>
          <div><span>Right wrist</span><strong id="right-speed">—</strong></div>
        </div>

        <p class="camera-note">Use the virtual candle for camera training. Do not practice punches close to a real open flame.</p>
      </article>

      <article class="target-card">
        <div class="target-head">
          <div>
            <span class="section-kicker">Training target</span>
            <h2>Virtual candle</h2>
          </div>
          <button class="text-button" id="reset" type="button">Reset</button>
        </div>

        <div class="scene" aria-label="Virtual candle">
          <div class="flame" id="flame"></div>
          <div class="wick"></div>
          <div class="candle"></div>
          <p id="flame-state" aria-live="polite">Stable flame</p>
        </div>

        <div class="strike-result" aria-live="polite">
          <div><span>Score</span><strong id="score">—</strong></div>
          <div><span>Last strike</span><strong id="last-strike">Waiting</strong></div>
        </div>
      </article>
    </section>

    <details class="simulation">
      <summary>Engineering simulation controls</summary>
      <form id="controls" class="controls">
        <label>Strike speed <output id="speed-out">7.0</output>
          <input id="speed" type="range" min="1" max="12" step="0.1" value="7" />
        </label>
        <label>Alignment <output id="alignment-out">90%</output>
          <input id="alignment" type="range" min="0" max="1" step="0.01" value="0.9" />
        </label>
        <label>Virtual distance <output id="distance-out">30 cm</output>
          <input id="distance" type="range" min="0.1" max="1" step="0.01" value="0.3" />
        </label>
        <button type="submit">Simulate strike</button>
      </form>
    </details>
  </main>
`;

const video = root.querySelector("#camera");
const overlay = root.querySelector("#pose-overlay");
const ctx = overlay.getContext("2d");
const cameraEmpty = root.querySelector("#camera-empty");
const startCamera = root.querySelector("#start-camera");
const stopCamera = root.querySelector("#stop-camera");
const cameraStatus = root.querySelector("#camera-status");
const qualityEl = root.querySelector("#quality");
const fpsEl = root.querySelector("#fps");
const leftSpeedEl = root.querySelector("#left-speed");
const rightSpeedEl = root.querySelector("#right-speed");

const speed = root.querySelector("#speed");
const alignment = root.querySelector("#alignment");
const distance = root.querySelector("#distance");
const flame = root.querySelector("#flame");
const flameState = root.querySelector("#flame-state");
const score = root.querySelector("#score");
const lastStrike = root.querySelector("#last-strike");

let tracker = null;

const CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
];

function renderFlame(result, strikeLabel) {
  flame.style.setProperty("--tilt", `${result.flame.tilt * 32}deg`);
  flame.classList.toggle("out", result.flame.extinguished);
  flameState.textContent = result.flame.extinguished
    ? "Flame extinguished"
    : result.flame.instability > 0.65
      ? "Flame highly unstable"
      : result.flame.tilt > 0.3
        ? "Flame deflected"
        : "Flame disturbed";
  score.textContent = String(result.score.score);
  lastStrike.textContent = strikeLabel || result.score.grade;
}

function drawPose(landmarks) {
  if (!landmarks || !video.videoWidth || !video.videoHeight) return;
  if (overlay.width !== video.videoWidth || overlay.height !== video.videoHeight) {
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
  }

  ctx.clearRect(0, 0, overlay.width, overlay.height);
  ctx.lineWidth = Math.max(2, overlay.width / 420);
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(245, 241, 225, .82)";
  ctx.fillStyle = "rgba(255, 255, 255, .95)";

  for (const [a, b] of CONNECTIONS) {
    const pa = landmarks[a], pb = landmarks[b];
    if (!pa || !pb || (pa.visibility ?? 0) < 0.5 || (pb.visibility ?? 0) < 0.5) continue;
    ctx.beginPath();
    ctx.moveTo(pa.x * overlay.width, pa.y * overlay.height);
    ctx.lineTo(pb.x * overlay.width, pb.y * overlay.height);
    ctx.stroke();
  }

  for (const index of [11,12,13,14,15,16,23,24]) {
    const point = landmarks[index];
    if (!point || (point.visibility ?? 0) < 0.5) continue;
    ctx.beginPath();
    ctx.arc(point.x * overlay.width, point.y * overlay.height, Math.max(4, overlay.width / 180), 0, Math.PI * 2);
    ctx.fill();
  }
}

function setCameraStatus({ state, message }) {
  cameraStatus.dataset.state = state;
  cameraStatus.textContent = message;
}

function updateLive(result) {
  drawPose(result.landmarks);
  const analysis = analyzer.analyze(result);

  if (!analysis.metrics) {
    qualityEl.textContent = "No pose";
    return;
  }

  fpsEl.textContent = String(analysis.metrics.fps);
  leftSpeedEl.textContent = `${analysis.metrics.leftWristSpeed.toFixed(1)} m/s`;
  rightSpeedEl.textContent = `${analysis.metrics.rightWristSpeed.toFixed(1)} m/s`;
  qualityEl.textContent = analysis.quality.ok ? "Ready" : analysis.quality.reasons.join(" · ");

  if (analysis.strike) {
    const virtualSpeed = Math.min(12, analysis.strike.peakSpeed * 2.5);
    const result = session.strike({
      speed: virtualSpeed,
      alignment: analysis.strike.straightness,
      distance: 0.3,
    });
    const hand = analysis.strike.hand === "left" ? "L" : "R";
    renderFlame(
      result,
      `${hand} · ${analysis.strike.peakSpeed.toFixed(1)} m/s · ${Math.round(analysis.strike.straightness * 100)}% straight`,
    );
  }
}

startCamera.addEventListener("click", async () => {
  startCamera.disabled = true;
  try {
    analyzer.reset();
    tracker = new PoseTracker({
      video,
      onResult: updateLive,
      onStatus: setCameraStatus,
    });
    await tracker.start();
    cameraEmpty.hidden = true;
    stopCamera.disabled = false;
  } catch (error) {
    setCameraStatus({ state: "error", message: error?.message || "Camera failed" });
    startCamera.disabled = false;
  }
});

stopCamera.addEventListener("click", () => {
  tracker?.stop();
  tracker = null;
  analyzer.reset();
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  cameraEmpty.hidden = false;
  startCamera.disabled = false;
  stopCamera.disabled = true;
  qualityEl.textContent = "—";
  fpsEl.textContent = "—";
  leftSpeedEl.textContent = "—";
  rightSpeedEl.textContent = "—";
});

function syncOutputs() {
  root.querySelector("#speed-out").value = Number(speed.value).toFixed(1);
  root.querySelector("#alignment-out").value = `${Math.round(Number(alignment.value) * 100)}%`;
  root.querySelector("#distance-out").value = `${Math.round(Number(distance.value) * 100)} cm`;
}
[speed, alignment, distance].forEach((input) => input.addEventListener("input", syncOutputs));
syncOutputs();

root.querySelector("#controls").addEventListener("submit", (event) => {
  event.preventDefault();
  renderFlame(
    session.strike({
      speed: Number(speed.value),
      alignment: Number(alignment.value),
      distance: Number(distance.value),
    }),
    "Simulation",
  );
});

root.querySelector("#reset").addEventListener("click", () => {
  session.reset();
  analyzer.reset();
  flame.style.setProperty("--tilt", "0deg");
  flame.classList.remove("out");
  flameState.textContent = "Stable flame";
  score.textContent = "—";
  lastStrike.textContent = "Waiting";
});
