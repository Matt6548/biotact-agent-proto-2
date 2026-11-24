/**
 * EXPERIMENTAL: a conservative visual hand-approach gesture heuristic.
 * Monocular hand landmarks cannot establish a punch, real force, depth or airflow.
 * A complete, coherent expansion followed by retraction is required; uncertain
 * or ambiguous inputs produce neutral feedback rather than a strike.
 */
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const within = (n, lo, hi) => Number.isFinite(n) && n >= lo && n <= hi;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const MAX_GAP_MS = 180;

function handGeometry(points) {
  if (!Array.isArray(points) || points.length !== 21 || points.some((p) =>
    !p || !within(p.x, -0.04, 1.04) || !within(p.y, -0.04, 1.04) || !Number.isFinite(p.z))) return null;
  const core = [0, 5, 9, 17].map((i) => points[i]);
  if (core.some((p) => !within(p.x, 0.025, .975) || !within(p.y, .025, .975))) return null;
  const width = dist(points[5], points[17]);
  const height = dist(points[0], points[9]);
  if (!within(width, .028, .62) || !within(height, .035, .67) ||
      !within(width / height, .42, 2.45)) return null;
  const center = {x:(points[0].x+points[5].x+points[9].x+points[17].x)/4,
    y:(points[0].y+points[5].y+points[9].y+points[17].y)/4};
  if (!within(center.x, .12, .88) || !within(center.y, .12, .88)) return null;
  return {center, width, height, scale: Math.sqrt(width * height)};
}

export class HandForwardAnalyzer {
  constructor({ mirrorX = true } = {}) {
    this.mirrorX = !!mirrorX;
    this.resetMotionState();
  }
  resetMotionState() {
    this.prev = null;
    this.phase = 'idle';
    this.riseFrames = 0;
    this.riseBase = null;
    this.startScale = 0;
    this.startCenter = null;
    this.startedAt = 0;
    this.peakScale = 0;
    this.retractFrames = 0;
    this.lastStrikeAt = -Infinity;
    this.maxLateral = 0;
  }
  reject(reason) {
    this.resetMotionState();
    return {quality:{ok:false,reasons:[reason]}, strike:null, metrics:null, trackingReset:true};
  }
  analyze({hands, timestampMs, fps} = {}) {
    // Two hands can belong to separate people, and the API has no identity guarantee.
    if (!Array.isArray(hands) || hands.length !== 1) return this.reject(hands?.length > 1 ? 'ambiguous-hands' : 'hand-not-visible');
    const geom = handGeometry(hands[0]);
    if (!geom) return this.reject('hand-partly-hidden');
    if (!Number.isFinite(timestampMs)) return this.reject('invalid-timestamp');
    if (Number.isFinite(fps) && fps < 10) return this.reject('low-tracking-fps');
    if (!this.prev) {
      this.prev = {...geom,t:timestampMs};
      return {quality:{ok:true,reasons:[]},strike:null,metrics:{relativeScale:1},trackingPrimed:true};
    }
    const dt = timestampMs-this.prev.t;
    if (dt <= 0 || dt > MAX_GAP_MS) return this.reject('tracking-gap');
    const ratio = geom.scale/this.prev.scale;
    const shapeDelta = Math.abs(Math.log((geom.width/this.prev.width)/(geom.height/this.prev.height)));
    const centerJump = dist(geom.center,this.prev.center);
    if (!within(ratio,.78,1.28) || shapeDelta > .16 || centerJump > .13)
      return this.reject('hand-shape-or-position-jump');
    // Two stable axes must expand together: sideways waves and palm rotation
    // must not be mistaken for a fist moving toward the lens.
    const widthRise = geom.width/this.prev.width;
    const heightRise = geom.height/this.prev.height;
    const speed = Math.log(ratio)/(dt/1000);
    const rising = speed > .48 && widthRise > 1.009 && heightRise > 1.009;
    const retreating = speed < -.32 && widthRise < .994 && heightRise < .994;
    const previous = this.prev;
    this.prev = {...geom,t:timestampMs};
    let strike = null;
    if (this.phase === 'idle') {
      if (rising) {
        if (this.riseFrames === 0) this.riseBase = previous;
        this.riseFrames++;
        if (this.riseFrames >= 2 && timestampMs-this.lastStrikeAt >= 450) {
          this.phase = 'out';
          this.startScale = this.riseBase.scale;
          this.startCenter = this.riseBase.center;
          this.startedAt = this.riseBase.t;
          this.peakScale = geom.scale;
          this.maxLateral = 0;
        }
      } else {
        this.riseFrames = 0;
        this.riseBase = null;
      }
    } else if (this.phase === 'out') {
      this.peakScale = Math.max(this.peakScale,geom.scale);
      this.maxLateral = Math.max(this.maxLateral,dist(geom.center,this.startCenter));
      if (timestampMs-this.startedAt > 650 || this.maxLateral > .145) {
        this.phase = 'recovery';
      } else if (retreating) {
        this.retractFrames++;
        if (this.retractFrames >= 2) {
          const expansion = this.peakScale/this.startScale;
          const durationMs = timestampMs-this.startedAt;
          const shrink = geom.scale/this.peakScale;
          // A pulse in size, on both axes, then a confirmed reversal.
          if (expansion >= 1.23 && shrink <= .94 && durationMs >= 115 &&
              this.maxLateral <= .145 && timestampMs-this.lastStrikeAt >= 450) {
            const startScreenX = this.mirrorX ? 1-this.startCenter.x : this.startCenter.x;
            const endScreenX = this.mirrorX ? 1-geom.center.x : geom.center.x;
            const movementX = endScreenX-startScreenX;
            const direction = Math.abs(movementX) >= .025 ? Math.sign(movementX) :
              (endScreenX < .5 ? -1 : 1);
            strike = {
              t:timestampMs,hand:direction<0?'left':'right',visualDirection:direction,
              // Dimensionless proxy scaled for existing FlameModel, NOT measured speed.
              peakSpeed:clamp(4*Math.log(expansion)/(durationMs/1000),.01,8),
              straightness:clamp(1-this.maxLateral/.30, .78, 1),
              displacement:expansion-1,
              durationMs,
              // Heuristic geometry-quality score, NOT a probability or force.
              confidence:clamp(.42+.28*(expansion-1)+.2*(1-this.maxLateral/.145),.3,.82),
              cue:'apparent-hand-approach',
            };
            this.lastStrikeAt=timestampMs;
          }
          this.phase='recovery';
        }
      } else if (rising) {
        this.retractFrames=0;
      }
    } else if (this.phase === 'recovery') {
      if (geom.scale <= this.startScale*1.085) {
        this.phase='idle';
        this.riseFrames=0;
        this.riseBase=null;
      }
    }
    return {quality:{ok:true,reasons:[]},strike,metrics:{
      relativeScale:clamp(geom.scale/Math.max(this.startScale||geom.scale,.0001),0,4),
      gesturePhase:this.phase,
    },trackingPrimed:false};
  }
}
