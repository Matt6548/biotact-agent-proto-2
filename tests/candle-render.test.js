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
