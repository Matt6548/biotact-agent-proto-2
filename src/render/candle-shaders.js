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
  float wobble = sin(uTime * 7.4 + uv.y * 11.0) * 0.026
               + sin(uTime * 11.3 - uv.y * 18.0) * 0.012;
  p.x += rise * rise * (uTilt * 0.35 + wobble * (0.35 + uInstability * 1.8 + uImpact));
  p.y += sin(uTime * 8.1 + uv.x * 3.0) * rise * 0.012 * (uInstability + uImpact);
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
  float bell = pow(max(0.0, sin(3.14159265 * y)), 0.82);
  float width = 0.055 + 0.36 * bell * (1.0 - 0.20 * y);
  width += (sin(uTime * 6.9 + y * 23.0) * 0.013 + sin(uTime * 11.0 - y * 31.0) * 0.008)
           * (0.4 + uInstability + 0.7 * uImpact) * bell;
  float normalized = x / max(width, 0.025);
  float contour = 1.0 - smoothstep(0.75, 1.04, normalized);
  float ends = smoothstep(0.0, 0.055, y) * (1.0 - smoothstep(0.955, 1.0, y));
  float core = 1.0 - smoothstep(0.05, 0.62, normalized);
  vec3 amber = vec3(1.0, 0.32, 0.055);
  vec3 golden = vec3(1.0, 0.78, 0.25);
  vec3 ivory = vec3(1.0, 0.97, 0.77);
  vec3 color = mix(amber, golden, 0.35 + 0.52 * smoothstep(0.09, 0.70, y));
  color = mix(color, ivory, core * 0.84 * smoothstep(0.10, 0.45, y) * (1.0 - smoothstep(0.8, 1.0, y)));
  color = mix(vec3(0.18, 0.39, 0.95), color, smoothstep(0.015, 0.18, y));
  float breathe = 0.96 + 0.04 * sin(uTime * 8.5 + y * 8.0);
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
