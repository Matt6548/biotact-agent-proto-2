import "./style.css";
import { CandleTrainingSession } from "./features/candle-training.js";

const session = new CandleTrainingSession();
const root = document.querySelector("#app");

root.innerHTML = `
<section class="lab">
  <header>
    <p class="eyebrow">Stage 0 · engineering harness</p>
    <h1>Candle Strike</h1>
    <p class="lede">Tune a simulated non-contact strike and observe the deterministic flame response. Camera tracking comes next.</p>
  </header>
  <div class="workspace">
    <div class="scene" aria-label="Virtual candle">
      <div class="flame" id="flame"></div><div class="wick"></div><div class="candle"></div>
      <p id="flame-state" aria-live="polite">Stable flame</p>
    </div>
    <form id="controls" class="controls">
      <label>Strike speed <output id="speed-out">7.0</output><input id="speed" type="range" min="1" max="12" step="0.1" value="7" /></label>
      <label>Alignment <output id="alignment-out">90%</output><input id="alignment" type="range" min="0" max="1" step="0.01" value="0.9" /></label>
      <label>Distance <output id="distance-out">30 cm</output><input id="distance" type="range" min="0.1" max="1" step="0.01" value="0.3" /></label>
      <div class="actions"><button type="submit">Simulate strike</button><button type="button" class="secondary" id="reset">Reset</button></div>
    </form>
  </div>
  <section class="result" aria-live="polite"><strong id="score">Score —</strong><span id="grade">No attempt yet</span></section>
</section>`;

const speed=root.querySelector("#speed"), alignment=root.querySelector("#alignment"), distance=root.querySelector("#distance");
const flame=root.querySelector("#flame"), flameState=root.querySelector("#flame-state"), score=root.querySelector("#score"), grade=root.querySelector("#grade");

function syncOutputs() {
  root.querySelector("#speed-out").value=Number(speed.value).toFixed(1);
  root.querySelector("#alignment-out").value=`${Math.round(Number(alignment.value)*100)}%`;
  root.querySelector("#distance-out").value=`${Math.round(Number(distance.value)*100)} cm`;
}
[speed,alignment,distance].forEach((input)=>input.addEventListener("input",syncOutputs));
syncOutputs();

root.querySelector("#controls").addEventListener("submit",(event)=>{
  event.preventDefault();
  const result=session.strike({speed:Number(speed.value),alignment:Number(alignment.value),distance:Number(distance.value)});
  flame.style.setProperty("--tilt",`${result.flame.tilt*32}deg`);
  flame.classList.toggle("out",result.flame.extinguished);
  flameState.textContent=result.flame.extinguished?"Flame extinguished":result.flame.instability>0.65?"Flame highly unstable":result.flame.tilt>0.3?"Flame deflected":"Flame disturbed";
  score.textContent=`Score ${result.score.score}`;
  grade.textContent=result.score.grade;
});
root.querySelector("#reset").addEventListener("click",()=>{
  session.reset(); flame.style.setProperty("--tilt","0deg"); flame.classList.remove("out");
  flameState.textContent="Stable flame"; score.textContent="Score —"; grade.textContent="No attempt yet";
});
