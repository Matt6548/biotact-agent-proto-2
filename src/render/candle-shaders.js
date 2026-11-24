// Original, compact GLSL for the existing Three.js renderer. No third-party shader code.
export const flameVertexShader = `
varying vec2 vUv;
uniform float uTime;
uniform float uTilt;
uniform float uInstability;
uniform float uImpact;
uniform float uLayer;
uniform float uPhase;
uniform float uAlive;
uniform float uHalfHeight;
void main() {
  vUv = uv;
  vec3 p = position;
  float rise = smoothstep(0.02, 1.0, uv.y);
  // The tip bends independently of the base and no longer traces a fixed centreline.
  float slowSway = sin(uTime * 3.7 + uv.y * 5.4 + uPhase) * 0.039;
  float fineMotion = sin(uTime * 10.3 + uv.y * 14.0 + uPhase) * 0.012;
  float asymmetry = -0.044 + slowSway + fineMotion;
  float strain = clamp(abs(uTilt) * 0.62 + uInstability * 0.28 + uImpact * 0.16, 0.0, 1.0);
  float heightScale = mix(0.12, 1.0, sqrt(clamp(uAlive, 0.0, 1.0))) * (1.0 - 0.24 * strain);
  p.y = (p.y + uHalfHeight) * heightScale - uHalfHeight;
  p.x += rise * rise * (uTilt * 0.42 + asymmetry * (0.8 + uInstability + uImpact)) * heightScale;
  p.x += rise * uLayer * 0.022 * sin(uv.y * 5.0 + uPhase);
  p.y += sin(uTime * 6.3 + uv.x * 6.2 + uPhase) * rise * 0.008 * (uInstability + uImpact);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

export const flameFragmentShader = `
varying vec2 vUv;
uniform float uTime;
uniform float uInstability;
uniform float uImpact;
uniform float uAlive;
uniform float uLayer;
uniform float uPhase;
void main() {
  float y = clamp(vUv.y, 0.0, 1.0);
  // Unequal left/right contour and a drifting, irregular tip (not a symmetric teardrop).
  float centre = 0.5 - 0.045 * y * y
    + 0.031 * sin(uTime * 3.4 + y * 4.5 + uPhase) * y * y
    + 0.010 * sin(uTime * 8.3 + y * 13.2 + uPhase) * y;
  float dx = vUv.x - centre;
  float bell = pow(max(0.0, sin(3.14159265 * y)), 0.82);
  float rightBias = mix(0.78, 1.16, smoothstep(-0.012, 0.012, dx));
  float width = (0.013 + 0.30 * bell * (1.0 - 0.44 * smoothstep(0.40, 1.0, y))) * rightBias;
  width += 0.008 * sin(uTime * 5.6 + y * 22.0 + uPhase)
    * bell * (0.40 + uInstability + 0.75 * uImpact);
  float spread = abs(dx) / max(width, 0.012);
  float contour = 1.0 - smoothstep(0.68, 1.07, spread);
  float ends = smoothstep(0.0, 0.055, y) * (1.0 - smoothstep(0.960, 1.0, y));
  // Luminous soot zone, not a solid yellow disk: soften the edge and leave
  // the fuel-vapour region around the wick darker.
  float internalRipple = 0.94 + 0.06 * sin(uTime * 6.1 - y * 15.0 + vUv.x * 7.0 + uPhase);
  float core = exp(-3.6 * spread * spread) * smoothstep(0.15, 0.39, y)
    * (1.0 - smoothstep(0.78, 0.98, y)) * internalRipple;
  float darkFoot = exp(-13.0 * spread * spread) * (1.0 - smoothstep(0.08, 0.26, y));
  vec3 orangeShell = vec3(0.94, 0.265, 0.035);
  vec3 honey = vec3(1.0, 0.68, 0.16);
  vec3 whiteCore = vec3(1.0, 0.97, 0.80);
  vec3 flame = mix(orangeShell, honey, 0.37 + 0.43 * smoothstep(0.08, 0.72, y));
  flame = mix(flame, whiteCore, core * 0.96 * (1.0 - uLayer));
  // Brief blue foot around the wick, rapidly giving way to warm incandescence.
  flame = mix(vec3(0.13, 0.29, 0.90), flame, smoothstep(0.025, 0.145, y));
  flame = mix(flame, orangeShell, uLayer * 0.32);
  flame = mix(flame, vec3(0.12, 0.085, 0.06), darkFoot * 0.65);
  float breathe = 0.95 + 0.05 * sin(uTime * 7.9 + y * 7.0 + uPhase);
  float layerOpacity = mix(0.96, 0.24, uLayer);
  float alpha = contour * ends * breathe * layerOpacity * uAlive * (1.0 - 0.27 * darkFoot);
  if (alpha < 0.008) discard;
  gl_FragColor = vec4(flame, alpha);
}`;

export const glowFragmentShader = `
varying vec2 vUv;
uniform float uTime;
uniform float uAlive;
uniform float uImpact;
void main() {
  vec2 p = (vUv - vec2(0.5, 0.48)) * vec2(1.55, 1.25);
  float haze = exp(-7.8 * dot(p, p));
  float shimmer = 0.94 + 0.06 * sin(uTime * 9.5);
  gl_FragColor = vec4(1.0, 0.42, 0.11, haze * (0.12 + 0.035 * uImpact) * uAlive * shimmer);
}`;

export const smokeVertexShader = `
attribute float aAge;
uniform float uPixelRatio;
varying float vFade;
void main() {
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  float age = clamp(aAge, 0.0, 1.0);
  vFade = smoothstep(0.00, 0.22, age) * (1.0 - smoothstep(0.73, 1.0, age));
  gl_PointSize = min(40.0, (6.0 + age * 29.0) * uPixelRatio * 5.0 / max(2.0, -view.z));
  gl_Position = projectionMatrix * view;
}`;

export const smokeFragmentShader = `
uniform float uOpacity;
varying float vFade;
void main() {
  vec2 centre = gl_PointCoord - vec2(0.5);
  float distanceFromCentre = length(centre);
  float feather = exp(-16.0 * distanceFromCentre * distanceFromCentre)
    * (1.0 - smoothstep(0.34, 0.50, distanceFromCentre));
  float alpha = feather * vFade * uOpacity;
  if (alpha < 0.002) discard;
  gl_FragColor = vec4(0.56, 0.57, 0.57, alpha);
}`;
