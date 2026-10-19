import { CandleRenderer } from "./candle-renderer.js";

class FallbackCandleTarget{
  constructor(container){
    this.container=container;
    this.state={tilt:0,instability:0,stability:1,extinguished:false};
    this.pulseTimer=null;
    this.active=true;

    container.replaceChildren();
    container.dataset.rendererKind="fallback";
    container.innerHTML=`
      <div class="fallback-target" role="img" aria-label="Fallback virtual candle target">
        <div class="fallback-air" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="fallback-flame-wrap">
          <div class="fallback-flame"></div>
          <div class="fallback-smoke"></div>
        </div>
        <div class="fallback-wick"></div>
        <div class="fallback-candle"></div>
      </div>
    `;
    this.flame=container.querySelector(".fallback-flame");
    this.smoke=container.querySelector(".fallback-smoke");
    this.air=container.querySelector(".fallback-air");
  }

  setState(next){
    if(!next)return;
    this.state={...this.state,...next};
    const tilt=(this.state.tilt||0)*30;
    this.flame.style.setProperty("--fallback-tilt",`${tilt}deg`);
    this.flame.style.setProperty("--fallback-instability",String(this.state.instability||0));
    this.flame.classList.toggle("is-out",Boolean(this.state.extinguished));
    this.smoke.classList.toggle("show",Boolean(this.state.extinguished));
  }

  triggerImpulse(strength=.5){
    const safe=Math.max(.15,Math.min(1.35,Number(strength)||.5));
    this.air.style.setProperty("--fallback-air-strength",String(safe));
    this.air.classList.remove("pulse");
    void this.air.offsetWidth;
    this.air.classList.add("pulse");
    clearTimeout(this.pulseTimer);
    this.pulseTimer=setTimeout(()=>this.air.classList.remove("pulse"),700);
  }

  reset(){
    this.state={tilt:0,instability:0,stability:1,extinguished:false};
    this.flame.style.setProperty("--fallback-tilt","0deg");
    this.flame.style.setProperty("--fallback-instability","0");
    this.flame.classList.remove("is-out");
    this.smoke.classList.remove("show");
    this.air.classList.remove("pulse");
  }

  setActive(active){
    this.active=Boolean(active);
    this.container.dataset.active=this.active?"true":"false";
  }

  dispose(){
    clearTimeout(this.pulseTimer);
    this.container.replaceChildren();
    delete this.container.dataset.rendererKind;
    delete this.container.dataset.active;
  }
}

export function createCandleTarget(container,options={}){
  try{
    const renderer=new CandleRenderer(container,options);
    container.dataset.rendererKind="webgl";
    return renderer;
  }catch(error){
    console.warn("WebGL candle unavailable; using fallback target.",error);
    container.replaceChildren();
    return new FallbackCandleTarget(container);
  }
}
