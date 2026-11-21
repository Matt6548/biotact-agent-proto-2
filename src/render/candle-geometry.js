import * as THREE from "three";

/** A modestly irregular, single-draw-call candle with an inset melted-wax well. */
export function createWaxGeometry({ segments = 72 } = {}) {
  const count = Math.max(24, Math.floor(segments));
  const positions = [];
  const colors = [];
  const indices = [];
  const wax = new THREE.Color(0xf3e4c8);
  const rings = [
    ...Array.from({ length: 13 }, (_, i) => ({ radius: 0.61 - i / 12 * 0.049, height: -1.075 + i / 12 * 2.15, rim: i === 12 })),
    { radius: 0.535, height: 1.075, well: 0.012 },
    { radius: 0.485, height: 1.064, well: 0.016 },
    { radius: 0.395, height: 1.015, well: 0.018 },
    { radius: 0.22, height: 1.005, well: 0.012 },
    { radius: 0.035, height: 1.012, well: 0.003 },
  ];

  for (let r = 0; r < rings.length; r += 1) {
    const ring = rings[r];
    for (let i = 0; i <= count; i += 1) {
      const angle = i / count * Math.PI * 2;
      const ripple = Math.sin(angle * 5 + 0.6) * 0.009 + Math.cos(angle * 11 - 0.8) * 0.0035;
      const waxFlow = Math.sin(angle * 7 + ring.height * 1.45) * 0.003;
      const radius = ring.radius + ripple * (ring.well ? 0.35 : 1) + waxFlow;
      const rimWave = Math.sin(angle * 7 + 1.2) * 0.025 + Math.cos(angle * 13 - 0.2) * 0.010;
      const height = ring.height + (ring.rim ? rimWave : 0) + (ring.well ? rimWave * ring.well / 0.018 : 0);

      positions.push(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
      const streak = 0.968 + 0.021 * Math.sin(angle * 4 + height * 2.2) + 0.011 * Math.cos(angle * 15 + height * 4.1);
      const shade = ring.well ? 1.015 : 1;
      colors.push(wax.r * streak * shade, wax.g * streak * shade, wax.b * streak * shade);
      if (r > 0 && i > 0) {
        const a = (r - 1) * (count + 1) + i - 1;
        const b = r * (count + 1) + i - 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }

  // The last top ring is small; close its centre instead of leaving a hole.
  const centre = positions.length / 3;
  positions.push(0, 1.013, 0);
  colors.push(wax.r, wax.g, wax.b);
  const last = (rings.length - 1) * (count + 1);
  for (let i = 0; i < count; i += 1) indices.push(last + i, centre, last + i + 1);

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
