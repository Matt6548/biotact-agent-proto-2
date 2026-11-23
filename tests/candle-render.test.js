import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createWaxGeometry } from "../src/render/candle-geometry.js";
import { CandleRenderer } from "../src/render/candle-renderer.js";
import {
  flameVertexShader, flameFragmentShader, glowFragmentShader,
  smokeVertexShader, smokeFragmentShader,
} from "../src/render/candle-shaders.js";

test("single wax mesh has finite geometry, a real inset well, and mobile-friendly density", () => {
  const geometry = createWaxGeometry();
  const positions = geometry.getAttribute("position");
  assert.ok(positions.count < 1800);
  assert.ok(geometry.index.count / 3 < 3500);
  assert.ok([...positions.array].every(Number.isFinite));
  assert.ok(geometry.getAttribute("normal"));
  assert.ok(geometry.getAttribute("color"));
  const top = [];
  const inner = [];
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const radius = Math.hypot(x, z);
    if (radius > 0.54 && y > 1.04) top.push(y);
    if (radius < 0.30 && y > 0.97) inner.push(y);
  }
  assert.ok(top.length > 20 && inner.length > 20);
  assert.ok(Math.max(...top) - Math.min(...inner) > 0.045);
  assert.ok(geometry.boundingSphere.radius > 1);
  geometry.dispose();
});

test("wax tessellation remains bounded for the smallest supported circle", () => {
  const geometry = createWaxGeometry({ segments: 24 });
  assert.equal(geometry.getAttribute("position").count, 18 * 25 + 1);
  assert.ok(geometry.index.count > 0);
  geometry.dispose();
});

test("independent shaders declare response and smoke uniforms", () => {
  for (const shader of [flameVertexShader, flameFragmentShader]) {
    assert.match(shader, /uInstability/);
  }
  assert.match(flameVertexShader, /uTilt/);
  assert.match(flameFragmentShader, /uAlive/);
  assert.match(glowFragmentShader, /uAlive/);
  assert.match(smokeVertexShader, /uPixelRatio/);
  assert.match(smokeFragmentShader, /uOpacity/);
});

test("extinction spawns smoke only once and a new impulse remains bounded", () => {
  const renderer = Object.create(CandleRenderer.prototype);
  renderer.state = { extinguished: false };
  renderer.wasExtinguished = false;
  renderer.smokeLife = 0;
  renderer.setState({ extinguished: true });
  assert.equal(renderer.smokeLife, 1);
  renderer.smokeLife = 0.8;
  renderer.setState({ extinguished: true });
  assert.equal(renderer.smokeLife, 0.8);
  renderer.triggerImpulse(100);
  assert.equal(renderer.airPulseStrength, 1.35);
  assert.ok(renderer.impactLife <= 1);
});

test("soft smoke remains finite, fades, and relighting resets all effects", () => {
  const renderer = Object.create(CandleRenderer.prototype);
  const count = 28;
  renderer.state = { extinguished: true };
  renderer.wasExtinguished = true;
  renderer.smokeLife = 1;
  renderer.smokeSeeds = Array.from({ length: count }, (_, i) => ({
    phase: i * 2.39, speed: 0.76, spread: 0.12,
  }));
  renderer.smokeGeometry = new THREE.BufferGeometry();
  renderer.smokeGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  renderer.smokeGeometry.setAttribute("aAge", new THREE.BufferAttribute(new Float32Array(count), 1));
  renderer.smokeUniforms = { uOpacity: { value: 0 } };
  renderer.airMaterial = { opacity: 0.2 };
  renderer.flameUniforms = {
    uAlive: { value: 0 }, uTilt: { value: 0.9 },
    uInstability: { value: 0.8 }, uImpact: { value: 1 },
  };
  renderer.ember = { visible: false };
  renderer.airPulseLife = 0.7;
  renderer.impactLife = 0.8;
  renderer.updateSmoke(0.05, 1.5);
  assert.ok(renderer.smokeGeometry.attributes.position.array.every(Number.isFinite));
  assert.ok(renderer.smokeGeometry.attributes.aAge.array.every((value) => value >= 0 && value <= 1));
  assert.ok(renderer.smokeUniforms.uOpacity.value > 0);
  renderer.reset();
  assert.equal(renderer.smokeUniforms.uOpacity.value, 0);
  assert.equal(renderer.flameUniforms.uAlive.value, 1);
  assert.equal(renderer.airPulseLife, 0);
  assert.equal(renderer.ember.visible, true);
  renderer.smokeGeometry.dispose();
});

test("wax drips remain procedural, bounded and show subtle nonuniform colour", () => {
  const geometry = createWaxGeometry();
  const positions = geometry.getAttribute("position");
  const colours = geometry.getAttribute("color");
  const ringSize = 73;
  const ring = 11;
  const radii = [];
  const reds = [];
  for (let i = ring * ringSize; i < (ring + 1) * ringSize; i += 1) {
    radii.push(Math.hypot(positions.getX(i), positions.getZ(i)));
    reds.push(colours.getX(i));
  }
  assert.ok(Math.max(...radii) - Math.min(...radii) > 0.028, "soft raised drips should break the uniform cylinder");
  assert.ok(Math.max(...reds) - Math.min(...reds) > 0.014, "coloured wax should not be flat");
  assert.ok([...colours.array].every(Number.isFinite));
  assert.ok([...colours.array].every((c) => c >= 0 && c <= 1));
  geometry.dispose();
});

test("crossed flame layers preserve response, blue base and relight uniforms", () => {
  assert.match(flameVertexShader, /uLayer/);
  assert.match(flameVertexShader, /uPhase/);
  assert.match(flameFragmentShader, /rightBias/);
  assert.match(flameFragmentShader, /whiteCore/);
  assert.match(flameFragmentShader, /uLayer/);
  assert.match(flameFragmentShader, /uAlive/);
  const renderer = Object.create(CandleRenderer.prototype);
  renderer.flameUniforms = {
    uAlive: { value: 0 }, uTilt: { value: 0.9 },
    uInstability: { value: 0.8 }, uImpact: { value: 1 },
  };
  renderer.floorLightUniforms = { uAlive: { value: 0 } };
  renderer.smokeUniforms = { uOpacity: { value: 0.4 } };
  renderer.airMaterial = { opacity: 0.1 };
  renderer.ember = { visible: false };
  renderer.reset();
  assert.equal(renderer.flameUniforms.uAlive.value, 1);
  assert.equal(renderer.floorLightUniforms.uAlive.value, 1);
  assert.equal(renderer.ember.visible, true);
  assert.equal(renderer.smokeUniforms.uOpacity.value, 0);
});

test("renderer read-only diagnostics are scoped and disposal frees each resource once", () => {
  const counts = { geometry: 0, materialA: 0, materialB: 0, renderer: 0, context: 0, controls: 0, observer: 0, dom: 0 };
  const geometry = { dispose: () => { counts.geometry += 1; } };
  const materialA = { dispose: () => { counts.materialA += 1; } };
  const materialB = { dispose: () => { counts.materialB += 1; } };
  const canvas = { width: 390, height: 620, candleRenderStats: () => ({}) };
  const candle = Object.create(CandleRenderer.prototype);
  candle.renderer = {
    info: { render: { calls: 14, triangles: 3400 }, memory: { geometries: 13, textures: 0 } },
    domElement: canvas,
    shadowMap: { enabled: false },
    getPixelRatio: () => 1.35,
    dispose: () => { counts.renderer += 1; },
    forceContextLoss: () => { counts.context += 1; },
  };
  candle.flameUniforms = { uAlive: { value: 1 } };
  candle.scene = {
    traverse: (visit) => {
      visit({ geometry, material: [materialA, materialB] });
      visit({ geometry, material: materialA });
    },
  };
  candle.resizeObserver = { disconnect: () => { counts.observer += 1; } };
  candle.controls = { dispose: () => { counts.controls += 1; } };
  candle.container = { replaceChildren: () => { counts.dom += 1; } };
  candle.raf = null;
  const metrics = candle.getRenderMetrics();
  assert.equal(metrics.drawCalls, 14);
  assert.equal(metrics.pixelRatio, 1.35);
  assert.equal(metrics.shadowMapEnabled, false);
  assert.equal(metrics.flameAlive, 1);
  candle.dispose();
  assert.equal(canvas.candleRenderStats, undefined);
  assert.deepEqual(counts, {
    geometry: 1, materialA: 1, materialB: 1,
    renderer: 1, context: 1, controls: 1, observer: 1, dom: 1,
  });
});
