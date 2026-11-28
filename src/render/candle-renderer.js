import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createWaxGeometry } from "./candle-geometry.js";
import {
  flameVertexShader, flameFragmentShader, glowFragmentShader,
  smokeVertexShader, smokeFragmentShader,
} from "./candle-shaders.js";

import { TrackingRenderBudget, budgetPixelRatio } from "./tracking-render-budget.js";

const clamp = THREE.MathUtils.clamp;
const CANDLE_FOCUS = [0, 0.74, 0];
// Exponential approach in seconds, not in frames. No inference of real air speed.
export function approachVisual(value, target, rate, dt) {
  return target + (value - target) * Math.exp(-rate * Math.max(0, dt));
}
const finiteClamp = (value, min, max) => Number.isFinite(value) ? clamp(value, min, max) : 0;

// Keep the full candle and tray in the default composition, including
// a reserve for the shader's bending flame. Manual orbit/zoom is unchanged.
export function createCandleCamera(aspect = 1) {
  const camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 100);
  camera.position.set(0.36, 1.70, 5.80);
  camera.lookAt(...CANDLE_FOCUS);
  camera.updateMatrixWorld(true);
  return camera;
}

export class CandleRenderer {
  constructor(container, { active = true, pixelRatio = 2, interactive = true } = {}) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.active = false;
    this.raf = null;
    this.pixelRatioCap = pixelRatio;
    this.trackingBudget = new TrackingRenderBudget();
    this.lastRenderAt = -Infinity;
    this.interactive = interactive;
    this.state = { tilt: 0, instability: 0, stability: 1, extinguished: false };
    this.wasExtinguished = false;
    this.smokeLife = 0;
    this.airPulseLife = 0;
    this.airPulseStrength = 0;
    this.impactLife = 0;
    this.visualTime = 0;
    this.smokeDirection = 0;
    this.emberHeat = 1;

    this.scene = new THREE.Scene();
    this.camera = createCandleCamera();
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    // No directional hard shadow map: a softer single-draw contact shadow is below.
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute("aria-label", "Interactive 3D candle training target");
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.candleRenderStats = () => this.getRenderMetrics();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = this.interactive;
    this.controls.enabled = this.interactive;
    this.controls.enablePan = false;
    this.controls.minDistance = 4.1;
    this.controls.maxDistance = 7.4;
    this.controls.minPolarAngle = 1.0;
    this.controls.maxPolarAngle = 1.48;
    this.controls.target.set(...CANDLE_FOCUS);

    this.makeScene();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.renderOnce();
    this.setActive(active);
  }

  makeScene() {
    this.scene.add(new THREE.HemisphereLight(0xf2e7d4, 0x1f252e, 1.05));
    const key = new THREE.DirectionalLight(0xffecd2, 1.7);
    key.position.set(3, 5, 4);
    key.castShadow = false; // No projection wedge through the base/table.
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x93a8cc, 0.5);
    rim.position.set(-4, 2.7, -3);
    this.scene.add(rim);

    // Oversized matte plane has no visible oval boundary. A tiny fragment shader
    // simulates the warm pool of light WITHOUT postprocessing or downloaded textures.
    this.floorLightUniforms = { uTime: { value: 0 }, uAlive: { value: 1 } };
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.ShaderMaterial({
        uniforms: this.floorLightUniforms,
        vertexShader: `
          varying vec2 vPosition;
          void main() {
            vPosition = position.xy;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          varying vec2 vPosition;
          uniform float uTime;
          uniform float uAlive;
          void main() {
            float distanceSquared = dot(vPosition, vPosition);
            float pool = exp(-0.39 * distanceSquared);
            float flicker = 0.975 + 0.025 * sin(uTime * 7.6);
            vec3 graphite = vec3(0.073, 0.068, 0.070);
            vec3 reflectedAmber = vec3(0.185, 0.101, 0.048);
            gl_FragColor = vec4(graphite + reflectedAmber * pool * flicker * uAlive, 1.0);
          }`,
        toneMapped: false,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.23;
    floor.receiveShadow = false;
    this.scene.add(floor);

    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.15, 2.65),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        vertexShader: "varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
        fragmentShader: `
          varying vec2 vUv;
          void main() {
            vec2 p = (vUv - vec2(0.5)) * vec2(1.25, 1.15);
            float d = dot(p, p);
            float broad = exp(-8.5 * d);
            float nearBase = exp(-28.0 * d);
            float alpha = 0.19 * broad + 0.14 * nearBase;
            gl_FragColor = vec4(0.023, 0.017, 0.014, alpha);
          }`,
      }),
    );
    contactShadow.rotation.x = -Math.PI / 2;
    // 0.011 above table avoids z-fighting while still below the tray.
    contactShadow.position.set(0.05, -1.219, 0.035);
    this.scene.add(contactShadow);

    const tray = new THREE.Mesh(
      new THREE.CylinderGeometry(0.80, 0.84, 0.11, 64),
      new THREE.MeshStandardMaterial({ color: 0x39322c, roughness: 0.48, metalness: 0.58 }),
    );
    tray.position.y = -1.14;
    tray.castShadow = false;
    tray.receiveShadow = false;
    this.scene.add(tray);
    const trayRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.79, 0.024, 8, 64),
      new THREE.MeshStandardMaterial({ color: 0x8b6b43, metalness: 0.67, roughness: 0.41 }),
    );
    trayRim.rotation.x = Math.PI / 2;
    trayRim.position.y = -1.075;
    this.scene.add(trayRim);

    this.candle = new THREE.Mesh(
      createWaxGeometry(),
      new THREE.MeshStandardMaterial({
        vertexColors: true, roughness: 0.56, metalness: 0,
        emissive: 0x57310f, emissiveIntensity: 0.085,
      }),
    );
    this.candle.castShadow = false;
    this.candle.receiveShadow = false;
    this.scene.add(this.candle);

    const wickCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.01, 1.018, 0),
      new THREE.Vector3(0, 1.16, 0.005),
      new THREE.Vector3(-0.027, 1.30, 0.01),
      new THREE.Vector3(-0.015, 1.345, 0.018),
    ]);
    this.wick = new THREE.Mesh(
      new THREE.TubeGeometry(wickCurve, 14, 0.020, 7, false),
      new THREE.MeshStandardMaterial({ color: 0x211b17, roughness: 1 }),
    );
    this.scene.add(this.wick);
    this.ember = new THREE.Mesh(
      new THREE.SphereGeometry(0.027, 10, 8),
      new THREE.MeshStandardMaterial({
        color: 0xe36f21, emissive: 0xff6418, emissiveIntensity: 1.5, roughness: 0.9,
      }),
    );
    this.ember.position.set(-0.015, 1.346, 0.018);
    this.scene.add(this.ember);

    this.flameUniforms = {
      uTime: { value: 0 }, uTilt: { value: 0 }, uInstability: { value: 0 },
      uImpact: { value: 0 }, uAlive: { value: 1 },
      uLayer: { value: 0 }, uPhase: { value: 0 }, uHalfHeight: { value: 0.65 },
    };
    const flameMaterial = new THREE.ShaderMaterial({
      vertexShader: flameVertexShader,
      fragmentShader: flameFragmentShader,
      uniforms: this.flameUniforms,
      transparent: true, depthWrite: false,
      side: THREE.DoubleSide, toneMapped: false,
    });
    const glowMaterial = new THREE.ShaderMaterial({
      vertexShader: flameVertexShader,
      fragmentShader: glowFragmentShader,
      uniforms: { ...this.flameUniforms, uHalfHeight: { value: 0.95 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide, toneMapped: false,
    });
    this.flameGroup = new THREE.Group();
    // Root at the actual charred wick tip; yaw-only billboard preserves world vertical.
    this.flameGroup.position.copy(this.ember.position);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.9, 10, 16), glowMaterial);
    glow.position.y = 0.65;
    glow.renderOrder = 2;
    this.flameGroup.add(glow);
    // Crossed, translucent sheets suggest volume as the observer moves.
    // Two cheap shells, the central hot core and one glow: no ray marching/bloom.
    this.flameShells = [];
    for (const [angle, phase, x, z] of [
      [-0.53, -1.2, 0, 0],
      [0.55, 1.15, 0, 0],
    ]) {
      const shell = new THREE.Mesh(
        new THREE.PlaneGeometry(0.94, 1.31, 10, 18),
        new THREE.ShaderMaterial({
          vertexShader: flameVertexShader, fragmentShader: flameFragmentShader,
          uniforms: {
            ...this.flameUniforms,
            uLayer: { value: 1 },
            uPhase: { value: phase },
            uHalfHeight: { value: 0.655 },
          },
          transparent: true, depthWrite: false, toneMapped: false,
          side: THREE.DoubleSide,
        }),
      );
      shell.rotation.y = angle;
      shell.position.set(x, 0.655, z);
      shell.renderOrder = 3;
      this.flameShells.push(shell);
      this.flameGroup.add(shell);
    }
    this.flamePlane = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.30, 14, 24), flameMaterial);
    this.flamePlane.position.y = 0.65;
    this.flamePlane.renderOrder = 4;
    this.flameGroup.add(this.flamePlane);
    this.scene.add(this.flameGroup);

    // Bring a real point light slightly forward/low so it reaches the wax and rim.
    this.flameLight = new THREE.PointLight(0xffae63, 5.2, 5.2, 2);
    this.flameLight.position.set(0, 1.57, 0.31);
    this.scene.add(this.flameLight);

    const smokeCount = 28;
    this.smokeSeeds = Array.from({ length: smokeCount }, (_, i) => ({
      phase: i * 2.39,
      speed: 0.76 + (i % 5) * 0.09,
      spread: 0.11 + (i % 4) * 0.026,
    }));
    this.smokeGeometry = new THREE.BufferGeometry();
    this.smokeGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(smokeCount * 3), 3));
    this.smokeGeometry.setAttribute("aAge", new THREE.BufferAttribute(new Float32Array(smokeCount), 1));
    this.smokeUniforms = { uPixelRatio: { value: 1 }, uOpacity: { value: 0 } };
    this.smoke = new THREE.Points(this.smokeGeometry, new THREE.ShaderMaterial({
      vertexShader: smokeVertexShader, fragmentShader: smokeFragmentShader,
      uniforms: this.smokeUniforms,
      transparent: true, depthWrite: false, toneMapped: false,
    }));
    this.smoke.frustumCulled = false;
    this.smoke.visible = false;
    this.scene.add(this.smoke);

    const airCount = 36;
    this.airSeeds = Array.from({ length: airCount }, (_, i) => ({
      phase: i * 0.91,
      offset: (i / airCount) * 0.85,
      vertical: ((i % 9) - 4) * 0.025,
      depth: ((i % 7) - 3) * 0.025,
    }));
    this.airGeometry = new THREE.BufferGeometry();
    this.airGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(airCount * 3), 3));
    this.airMaterial = new THREE.PointsMaterial({
      color: 0xcbd4cf, size: 0.065, transparent: true, opacity: 0,
      depthWrite: false, sizeAttenuation: true,
    });
    this.airPulse = new THREE.Points(this.airGeometry, this.airMaterial);
    this.airPulse.frustumCulled = false;
    this.airPulse.visible = false;
    this.scene.add(this.airPulse);
  }

  setState(next) {
    if (!next) return;
    const previous = this.wasExtinguished;
    this.state = { ...this.state, ...next };
    this.wasExtinguished = Boolean(this.state.extinguished);
    if (this.wasExtinguished && !previous) {
      this.smokeLife = 1;
      this.smokeDirection = finiteClamp(this.state.tilt, -1, 1);
    } else if (previous && !this.wasExtinguished) {
      this.smokeLife = 0;
      if (this.smokeUniforms) this.smokeUniforms.uOpacity.value = 0;
      if (this.smoke) this.smoke.visible = false;
    }
  }

  triggerImpulse(strength = 0.5) {
    this.airPulseStrength = clamp(Number(strength) || 0, 0.15, 1.35);
    this.airPulseLife = 1;
    this.impactLife = Math.min(1, 0.4 + this.airPulseStrength * 0.45);
  }

  reset() {
    this.state = { tilt: 0, instability: 0, stability: 1, extinguished: false };
    this.wasExtinguished = false;
    this.smokeLife = 0;
    this.airPulseLife = 0;
    this.impactLife = 0;
    this.smokeDirection = 0;
    this.emberHeat = 1;
    this.flameUniforms.uAlive.value = 1;
    if (this.floorLightUniforms) this.floorLightUniforms.uAlive.value = 1;
    this.flameUniforms.uTilt.value = 0;
    this.flameUniforms.uInstability.value = 0;
    this.flameUniforms.uImpact.value = 0;
    this.smokeUniforms.uOpacity.value = 0;
    this.airMaterial.opacity = 0;
    this.ember.visible = true;
    if (this.ember.material) this.ember.material.emissiveIntensity = 1.5;
    if (this.flameLight) this.flameLight.intensity = 5.2;
    if (this.flameGroup) this.flameGroup.visible = true;
    if (this.smoke) this.smoke.visible = false;
    if (this.airPulse) this.airPulse.visible = false;
    if (this.candle) this.candle.material.emissiveIntensity = 0.085;
    if (this.renderer && !this.active) this.renderOnce();
  }

  updateSmoke(dt, elapsed) {
    // Let the flame collapse before smoke starts at the wick.
    if (this.smokeLife <= 0 || (this.flameUniforms?.uAlive.value ?? 0) > 0.12) {
      this.smokeUniforms.uOpacity.value = 0;
      if (this.smoke) this.smoke.visible = false;
      return;
    }
    if (this.smoke) this.smoke.visible = true;
    this.smokeLife = Math.max(0, this.smokeLife - dt * 0.25);
    const progress = 1 - this.smokeLife;
    const positions = this.smokeGeometry.attributes.position.array;
    const ages = this.smokeGeometry.attributes.aAge.array;
    for (let i = 0; i < this.smokeSeeds.length; i += 1) {
      const seed = this.smokeSeeds[i];
      const age = clamp(progress * 1.45 - i / this.smokeSeeds.length * 0.67, 0, 1);
      ages[i] = age;
      const direction = finiteClamp(this.smokeDirection, -1, 1);
      positions[i * 3] = -0.015 + Math.sin(elapsed * 1.12 + seed.phase) * seed.spread * age
        + direction * age * age * 0.32;
      positions[i * 3 + 1] = 1.346 + age * (0.50 + seed.speed * 0.73);
      positions[i * 3 + 2] = Math.cos(elapsed * 0.78 + seed.phase) * seed.spread * 0.65 * age;
    }
    this.smokeGeometry.attributes.position.needsUpdate = true;
    this.smokeGeometry.attributes.aAge.needsUpdate = true;
    this.smokeUniforms.uOpacity.value = this.smokeLife * 0.44;
  }

  updateAirPulse(dt, elapsed) {
    if (this.airPulseLife <= 0) {
      this.airMaterial.opacity = 0;
      this.airPulse.visible = false;
      return;
    }
    this.airPulse.visible = true;
    this.airPulseLife = Math.max(0, this.airPulseLife - dt * 1.05);
    const progress = 1 - this.airPulseLife;
    const positions = this.airGeometry.attributes.position.array;
    const direction = finiteClamp(this.state.tilt, -1, 1) < 0 ? -1 : 1;
    const packetX = direction * (-2.7 + progress * 3.1);
    for (let i = 0; i < this.airSeeds.length; i += 1) {
      const seed = this.airSeeds[i];
      positions[i * 3] = packetX - direction * seed.offset * (0.7 + 0.2 * this.airPulseStrength);
      positions[i * 3 + 1] = 1.72 + seed.vertical + Math.sin(elapsed * 12 + seed.phase) * 0.035 * this.airPulseStrength;
      positions[i * 3 + 2] = seed.depth + Math.cos(elapsed * 9 + seed.phase) * 0.025 * this.airPulseStrength;
    }
    this.airGeometry.attributes.position.needsUpdate = true;
    this.airMaterial.opacity = Math.sin(Math.PI * progress) * 0.08 * Math.min(1, this.airPulseStrength);
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const nativeRatio = Math.min(window.devicePixelRatio || 1, this.pixelRatioCap, width <= 420 ? 1.35 : 2);
    const ratio = this.trackingBudget.active
      ? budgetPixelRatio(width,height,nativeRatio,this.trackingBudget.tier.maxPixels)
      : nativeRatio;
    this.renderer.setPixelRatio(ratio);
    this.smokeUniforms.uPixelRatio.value = ratio;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  setTrackingBudget(active) {
    if (!this.trackingBudget.setActive(active)) return;
    this.lastRenderAt = -Infinity;
    this.resize();
    if (!this.active) this.renderOnce();
  }

  sampleTrackingBudget(fps, now) {
    if (this.trackingBudget.sample(fps, now)) this.resize();
  }

  setActive(active) {
    const next = Boolean(active);
    if (next === this.active) return;
    this.active = next;
    if (next) {
      this.lastRenderAt = -Infinity;
      this.clock.start();
      this.animate();
    } else {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
      this.renderOnce();
    }
  }

  renderOnce() {
    this.controls.update();
    this.flameGroup.rotation.set(0, Math.atan2(this.camera.position.x - this.flameGroup.position.x, this.camera.position.z - this.flameGroup.position.z), 0);
    this.renderer.render(this.scene, this.camera);
  }

  animate = () => {
    if (!this.active) {
      this.raf = null;
      return;
    }
    this.raf = requestAnimationFrame(this.animate);
    const now = performance.now();
    if (this.trackingBudget.active && now-this.lastRenderAt < 1000/this.trackingBudget.tier.renderFps-1) return;
    this.lastRenderAt = now;
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.visualTime += dt;
    const elapsed = this.visualTime;
    this.controls.update();
    this.impactLife = Math.max(0, this.impactLife - dt * 1.55);
    this.flameUniforms.uTime.value = elapsed;
    this.flameUniforms.uTilt.value = approachVisual(this.flameUniforms.uTilt.value, finiteClamp(this.state.tilt, -1, 1) * 0.82, 17, dt);
    this.flameUniforms.uInstability.value = approachVisual(this.flameUniforms.uInstability.value, finiteClamp(this.state.instability, 0, 1), 12, dt);
    this.flameUniforms.uImpact.value = approachVisual(this.flameUniforms.uImpact.value, this.impactLife, 16, dt);
    const aliveTarget = this.state.extinguished ? 0 : 1;
    const aliveNext = approachVisual(this.flameUniforms.uAlive.value, aliveTarget, this.state.extinguished ? 14 : 9, dt);
    this.flameUniforms.uAlive.value = Math.abs(aliveNext - aliveTarget) < 0.004 ? aliveTarget : aliveNext;

    this.flameGroup.rotation.set(0, Math.atan2(this.camera.position.x - this.flameGroup.position.x, this.camera.position.z - this.flameGroup.position.z), 0);
    const alive = this.flameUniforms.uAlive.value;
    const flicker = 0.93 + 0.055 * Math.sin(elapsed * 12.7) + 0.025 * Math.sin(elapsed * 8.1);
    const tilt = this.flameUniforms.uTilt.value;
    const instability = this.flameUniforms.uInstability.value;
    const brightness = alive * (1 - 0.24 * instability);
    this.flameGroup.visible = alive > 0.004;
    this.flameLight.intensity = 5.2 * flicker * brightness;
    this.flameLight.position.x = 0.16 * tilt + Math.sin(elapsed * 7.1) * 0.022;
    this.floorLightUniforms.uTime.value = elapsed;
    this.floorLightUniforms.uAlive.value = brightness;
    this.candle.material.emissiveIntensity = 0.018 + 0.067 * brightness;
    this.emberHeat = approachVisual(this.emberHeat, this.state.extinguished ? 0 : 1, this.state.extinguished ? 1.4 : 10, dt);
    this.ember.visible = this.emberHeat > 0.025;
    this.ember.material.emissiveIntensity = 1.5 * this.emberHeat;

    this.updateAirPulse(dt, elapsed);
    this.updateSmoke(dt, elapsed);
    this.renderer.render(this.scene, this.camera);
  };

  getRenderMetrics() {
    const { render, memory } = this.renderer.info;
    return {
      drawCalls: render.calls,
      triangles: render.triangles,
      geometries: memory.geometries,
      textures: memory.textures,
      canvasWidth: this.renderer.domElement.width,
      canvasHeight: this.renderer.domElement.height,
      pixelRatio: this.renderer.getPixelRatio(),
      trackingBudget: this.trackingBudget.active ? this.trackingBudget.tier.name : "off",
      shadowMapEnabled: this.renderer.shadowMap.enabled,
      flameAlive: this.flameUniforms.uAlive.value,
      flameTilt: this.flameUniforms.uTilt?.value ?? 0,
      smokeOpacity: this.smokeUniforms?.uOpacity.value ?? 0,
      emberHeat: this.emberHeat ?? 0,
      cameraFov: this.camera?.fov ?? 46,
    };
  }

  dispose() {
    this.active = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.resizeObserver.disconnect();
    this.controls.dispose();
    const geometries = new Set();
    const materials = new Set();
    this.scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) {
        const collection = Array.isArray(object.material) ? object.material : [object.material];
        collection.forEach((material) => materials.add(material));
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    delete this.renderer.domElement.candleRenderStats;
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.container.replaceChildren();
  }
}
