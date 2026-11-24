/**
 * One-way runtime decision, separate from gesture confidence. A slow GPU can
 * initialize successfully yet make hand tracking unusable. Warmup and isolated
 * spikes are ignored; do not retry GPU during the same worker session.
 */
export class HandDelegateLatencyGate {
  constructor({warmupFrames=2,slowMs=120,consecutiveSlow=3}={}){
    this.warmupFrames=warmupFrames;
    this.slowMs=slowMs;
    this.consecutiveSlow=consecutiveSlow;
    this.samples=0;
    this.slow=0;
    this.switched=false;
  }
  observe(inferenceMs,delegate){
    if(delegate!=='GPU'||this.switched||!Number.isFinite(inferenceMs)||inferenceMs<0)return false;
    this.samples++;
    if(this.samples<=this.warmupFrames)return false;
    this.slow=inferenceMs>this.slowMs?this.slow+1:0;
    if(this.slow<this.consecutiveSlow)return false;
    this.switched=true;
    return true;
  }
}
