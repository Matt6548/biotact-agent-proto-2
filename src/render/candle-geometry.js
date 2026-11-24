import * as THREE from "three";

/** A modestly irregular, single-draw-call candle with an inset melted-wax well. */
export function createWaxGeometry({ segments = 72 } = {}) {
  const count = Math.min(96, Math.max(24, Number.isFinite(segments) ? Math.floor(segments) : 72));
  const positions = [];
  const colors = [];
  const indices = [];
  const wax = new THREE.Color(0xf3e4c8);
  const rings = [
    ...Array.from({ length: 13 }, (_, i) => ({ radius: 0.61 - i / 12 * 0.049, height: -1.075 + i / 12 * 2.15, rim: i === 12 })),
    { radius: 0.535, height: 1.075, well: 0.012 },
    { radius: 0.485, height: 1.064, well: 0.016 },
    { radius: 0.395, height: 1.015, well: 0.018 },
    { radius: 0.22, height: 0.990, well: 0.012 },
    { radius: 0.035, height: 0.997, well: 0.003 },
  ];

  for (let r = 0; r < rings.length; r += 1) {
    const ring = rings[r];
    for (let i = 0; i <= count; i += 1) {
      const angle = i / count * Math.PI * 2;
      const ripple = Math.sin(angle * 5 + 0.6) * 0.009 + Math.cos(angle * 11 - 0.8) * 0.0035;
      const waxFlow = Math.sin(angle * 7 + ring.height * 1.45) * 0.003;
      // Three slowly cooled wax drips are sculpted into the SAME mesh, not extra draw calls.
      const normalizedHeight = (ring.height + 1.075) / 2.15;
      const drips = [
        { a: 0.46, bottom: 0.64, spread: 0.17, depth: 0.028 },
        { a: 2.55, bottom: 0.80, spread: 0.12, depth: 0.022 },
        { a: 4.66, bottom: 0.49, spread: 0.19, depth: 0.034 },
      ];
      let dripThickness = 0;
      if (!ring.well) {
        for (const drip of drips) {
          const delta = Math.atan2(Math.sin(angle - drip.a), Math.cos(angle - drip.a));
          const along = Math.max(0, Math.min(1, (normalizedHeight - drip.bottom) / 0.20));
          dripThickness += drip.depth * Math.exp(-0.5 * (delta / drip.spread) ** 2) * along;
        }
      }
      const radius = ring.radius + ripple * (ring.well ? 0.35 : 1) + waxFlow + dripThickness;
      const rimWave = Math.sin(angle * 7 + 1.2) * 0.025 + Math.cos(angle * 13 - 0.2) * 0.010;
      const height = ring.height + (ring.rim ? rimWave : 0) + (ring.well ? rimWave * ring.well / 0.018 : 0);

      positions.push(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
      // Low-cost ivory/amber marbling (per-vertex colour, no texture lookup).
      const wave = 0.025 * Math.sin(angle * 4.2 + height * 1.7)
        + 0.014 * Math.cos(angle * 12.4 - height * 3.2);
      const candleTop = Math.max(0, Math.min(1, (height - 0.2) / 0.9));
      const dripHighlight = Math.min(0.027, dripThickness * 0.7);
      const nearPool = ring.well ? 0.05 : 0;
      colors.push(
        Math.min(1, wax.r * (0.955 + wave + candleTop * 0.035 + dripHighlight + nearPool)),
        Math.min(1, wax.g * (0.930 + wave * 0.79 + candleTop * 0.031 + dripHighlight + nearPool * 0.67)),
        Math.min(1, wax.b * (0.915 + wave * 0.70 + candleTop * 0.018 + nearPool * 0.22)),
      );
      if (r > 0 && i > 0) {
        const a = (r - 1) * (count + 1) + i - 1;
        const b = r * (count + 1) + i - 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }

  // The last top ring is small; close its centre instead of leaving a hole.
  const centre = positions.length / 3;
  positions.push(0, 0.998, 0);
  colors.push(wax.r, wax.g, wax.b);
  const last = (rings.length - 1) * (count + 1);
  for (let i = 0; i < count; i += 1) indices.push(last + i, centre, last + i + 1);

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  // The duplicated angular seam must have identical smooth normals.
  const normals = geometry.getAttribute("normal");
  const normal = new THREE.Vector3();
  for (let r = 0; r < rings.length; r += 1) {
    const a = r * (count + 1), b = a + count;
    normal.set(normals.getX(a) + normals.getX(b), normals.getY(a) + normals.getY(b), normals.getZ(a) + normals.getZ(b)).normalize();
    normals.setXYZ(a, normal.x, normal.y, normal.z);
    normals.setXYZ(b, normal.x, normal.y, normal.z);
  }
  normals.needsUpdate = true;
  geometry.computeBoundingSphere();
  return geometry;
}
