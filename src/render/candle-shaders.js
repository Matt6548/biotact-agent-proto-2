// Original, compact GLSL for the existing Three.js renderer. No third-party shader code.
export const flameVertexShader = `
varying vec2 vUv;
uniform float uTime;
uniform float uTilt;
uniform float uInstability;
uniform float uImpact;
void main() {
  vUv = uv;
  vec3 p = position;
  float rise = smoothstep(0.0, 1.0, uv.y);
  float wobble = sin(uTime * 5.6 + uv.y * 9.5) * 0.018
               + sin(uTime * 10.7 - uv.y * 15.0) * 0.008;
  p.x += rise * rise * (uTilt * 0.34 + wobble * (0.3 + uInstability * 1.4 + uImpact));
  p.y += sin(uTime * 7.2 + uv.x * 3.0) * rise * 0.010 * (uInstability + uImpact);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

export const flameFragmentShader = `
varying vec2 vUv;
uniform float uTime;
uniform float uInstability;
uniform float uImpact;
uniform float uAlive;
void main() {
  float y = clamp(vUv.y, 0.0, 1.0);
  float x = abs(vUv.x - 0.5);
  // Tapered buoyant plume: narrow near the wick, a luminous lower body,
  // and a soft asymmetric tip. This is a visual approximation, not CFD.
  float bell = pow(max(0.0, sin(3.14159265 * y)), 0.88);
  float tip = 1.0 - 0.37 * smoothstep(0.43, 1.0, y);
  float width = 0.025 + 0.285 * bell * tip;
  width += (sin(uTime * 6.4 + y * 21.0) * 0.008 + sin(uTime * 9.8 - y * 29.0) * 0.005)
           * (0.3 + uInstability + 0.65 * uImpact) * bell;
  float normalized = x / max(width, 0.02);
  float contour = 1.0 - smoothstep(0.71, 1.07, normalized);
  float ends = smoothstep(0.0, 0.045, y) * (1.0 - smoothstep(0.962, 1.0, y));
  float core = exp(-4.5 * normalized * normalized);
  float centreHeat = core * smoothstep(0.04, 0.25, y) * (1.0 - smoothstep(0.7, 0.98, y));
  vec3 ember = vec3(0.95, 0.24, 0.035);
  vec3 gold = vec3(1.0, 0.67, 0.17);
  vec3 whiteHot = vec3(1.0, 0.965, 0.76);
  vec3 color = mix(ember, gold, 0.45 + 0.35 * smoothstep(0.06, 0.74, y));
  color = mix(color, whiteHot, centreHeat * 0.93);
  color = mix(vec3(0.13, 0.31, 0.79), color, smoothstep(0.035, 0.105, y));
  float breathe = 0.975 + 0.025 * sin(uTime * 7.2 + y * 6.0);
  float alpha = contour * ends * breathe * uAlive;
  if (alpha < 0.008) discard;
  gl_FragColor = vec4(color, alpha);
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
  float feather = 1.0 - smoothstep(0.12, 0.49, distanceFromCentre);
  float alpha = feather * vFade * uOpacity;
  if (alpha < 0.002) discard;
  gl_FragColor = vec4(0.56, 0.57, 0.57, alpha);
}`;
