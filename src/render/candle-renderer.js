import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createWaxGeometry } from "./candle-geometry.js";
import {
  flameVertexShader, flameFragmentShader, glowFragmentShader,
  smokeVertexShader, smokeFragmentShader,
} from "./candle-shaders.js";

const clamp = THREE.MathUtils.clamp;

export class CandleRenderer {
  constructor(container, { active = true, pixelRatio = 2, interactive = true } = {}) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.active = false;
    this.raf = null;
    this.pixelRatioCap = pixelRatio;
    this.interactive = interactive;
    this.state = { tilt: 0, instability: 0, stability: 1, extinguished: false };
    this.wasExtinguished = false;
    this.smokeLife = 0;
    this.airPulseLife = 0;
    this.airPulseStrength = 0;
    this.impactLife = 0;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    // A natural, almost eye-level frontal view: the candle stands ahead of us.
    this.camera.position.set(0.45, 1.82, 5.25);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute("aria-label", "Interactive 3D candle training target");
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = this.interactive;
    this.controls.enabled = this.interactive;
    this.controls.enablePan = false;
    this.controls.minDistance = 4.1;
    this.controls.maxDistance = 7.4;
    this.controls.minPolarAngle = 1.0;
    this.controls.maxPolarAngle = 1.48;
    this.controls.target.set(0, 0.72, 0);

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
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    key.shadow.camera.left = -3;
    key.shadow.camera.right = 3;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -3;
    key.shadow.normalBias = 0.025;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x93a8cc, 0.5);
    rim.position.set(-4, 2.7, -3);
    this.scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(3.5, 64),
      new THREE.MeshStandardMaterial({ color: 0x201c19, roughness: 0.97 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.23;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 2.5),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        vertexShader: "varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
        fragmentShader: "varying vec2 vUv; void main(){float r=length((vUv-0.5)*2.0); gl_FragColor=vec4(0.0,0.0,0.0,0.27*(1.0-smoothstep(0.32,1.0,r)));}",
      }),
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = -1.218;
    this.scene.add(contactShadow);

    const tray = new THREE.Mesh(
      new THREE.CylinderGeometry(0.80, 0.84, 0.11, 64),
      new THREE.MeshStandardMaterial({ color: 0x39322c, roughness: 0.48, metalness: 0.58 }),
    );
    tray.position.y = -1.14;
    tray.castShadow = true;
    tray.receiveShadow = true;
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
        vertexColors: true, roughness: 0.67, metalness: 0,
        emissive: 0x342411, emissiveIntensity: 0.04,
      }),
    );
    this.candle.castShadow = true;
    this.candle.receiveShadow = true;
    this.scene.add(this.candle);

    const wickCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.01, 1.018, 0),
      new THREE.Vector3(0, 1.16, 0.005),
      new THREE.Vector3(-0.027, 1.30, 0.01),
      new THREE.Vector3(-0.015, 1.385, 0.018),
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
    this.ember.position.set(-0.015, 1.386, 0.018);
    this.scene.add(this.ember);

    this.flameUniforms = {
      uTime: { value: 0 }, uTilt: { value: 0 }, uInstability: { value: 0 },
      uImpact: { value: 0 }, uAlive: { value: 1 },
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
      uniforms: this.flameUniforms,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide, toneMapped: false,
    });
    this.flameGroup = new THREE.Group();
    // Billboard around the flame's centre, not the scene's origin.
    this.flameGroup.position.set(0, 2.0, 0);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.9, 10, 16), glowMaterial);
    glow.renderOrder = 2;
    this.flameGroup.add(glow);
    this.flamePlane = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.30, 14, 24), flameMaterial);
    this.flamePlane.renderOrder = 3;
    this.flameGroup.add(this.flamePlane);
    this.scene.add(this.flameGroup);

    this.flameLight = new THREE.PointLight(0xffa653, 2.3, 3.8, 2);
    this.flameLight.position.set(0, 1.63, 0.11);
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
    this.scene.add(this.airPulse);
  }

  setState(next) {
    if (!next) return;
    const justExtinguished = Boolean(next.extinguished) && !this.wasExtinguished;
    this.state = { ...this.state, ...next };
    this.wasExtinguished = Boolean(this.state.extinguished);
    if (justExtinguished) this.smokeLife = 1;
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
    this.flameUniforms.uAlive.value = 1;
    this.flameUniforms.uTilt.value = 0;
    this.flameUniforms.uInstability.value = 0;
    this.flameUniforms.uImpact.value = 0;
    this.smokeUniforms.uOpacity.value = 0;
    this.airMaterial.opacity = 0;
    this.ember.visible = true;
  }

  updateSmoke(dt, elapsed) {
    if (this.smokeLife <= 0) {
      this.smokeUniforms.uOpacity.value = 0;
      return;
    }
    this.smokeLife = Math.max(0, this.smokeLife - dt * 0.25);
    const progress = 1 - this.smokeLife;
    const positions = this.smokeGeometry.attributes.position.array;
    const ages = this.smokeGeometry.attributes.aAge.array;
    for (let i = 0; i < this.smokeSeeds.length; i += 1) {
      const seed = this.smokeSeeds[i];
      const age = clamp(progress * 1.45 - i / this.smokeSeeds.length * 0.67, 0, 1);
      ages[i] = age;
      positions[i * 3] = Math.sin(elapsed * 1.12 + seed.phase) * seed.spread * age + age * age * 0.13;
      positions[i * 3 + 1] = 1.40 + age * (0.68 + seed.speed);
      positions[i * 3 + 2] = Math.cos(elapsed * 0.78 + seed.phase) * seed.spread * 0.65 * age;
    }
    this.smokeGeometry.attributes.position.needsUpdate = true;
    this.smokeGeometry.attributes.aAge.needsUpdate = true;
    this.smokeUniforms.uOpacity.value = this.smokeLife * 0.44;
  }

  updateAirPulse(dt, elapsed) {
    if (this.airPulseLife <= 0) {
      this.airMaterial.opacity = 0;
      return;
    }
    this.airPulseLife = Math.max(0, this.airPulseLife - dt * 1.05);
    const progress = 1 - this.airPulseLife;
    const positions = this.airGeometry.attributes.position.array;
    const packetX = -2.7 + progress * 3.1;
    for (let i = 0; i < this.airSeeds.length; i += 1) {
      const seed = this.airSeeds[i];
      positions[i * 3] = packetX - seed.offset * (0.7 + 0.2 * this.airPulseStrength);
      positions[i * 3 + 1] = 1.72 + seed.vertical + Math.sin(elapsed * 12 + seed.phase) * 0.035 * this.airPulseStrength;
      positions[i * 3 + 2] = seed.depth + Math.cos(elapsed * 9 + seed.phase) * 0.025 * this.airPulseStrength;
    }
    this.airGeometry.attributes.position.needsUpdate = true;
    this.airMaterial.opacity = Math.sin(Math.PI * progress) * 0.08 * Math.min(1, this.airPulseStrength);
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, this.pixelRatioCap, width <= 420 ? 1.35 : 2);
    this.renderer.setPixelRatio(ratio);
    this.smokeUniforms.uPixelRatio.value = ratio;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  setActive(active) {
    const next = Boolean(active);
    if (next === this.active) return;
    this.active = next;
    if (next) {
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
    this.flameGroup.quaternion.copy(this.camera.quaternion);
    this.renderer.render(this.scene, this.camera);
  }

  animate = () => {
    if (!this.active) {
      this.raf = null;
      return;
    }
    this.raf = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;
    this.controls.update();
    this.impactLife = Math.max(0, this.impactLife - dt * 1.55);
    this.flameUniforms.uTime.value = elapsed;
    this.flameUniforms.uTilt.value = THREE.MathUtils.lerp(this.flameUniforms.uTilt.value, clamp(Number(this.state.tilt) || 0, -1, 1) * 0.82, 0.17);
    this.flameUniforms.uInstability.value = THREE.MathUtils.lerp(this.flameUniforms.uInstability.value, clamp(Number(this.state.instability) || 0, 0, 1), 0.13);
    this.flameUniforms.uImpact.value = THREE.MathUtils.lerp(this.flameUniforms.uImpact.value, this.impactLife, 0.23);
    this.flameUniforms.uAlive.value = THREE.MathUtils.lerp(this.flameUniforms.uAlive.value, this.state.extinguished ? 0 : 1, this.state.extinguished ? 0.16 : 0.09);

    this.flameGroup.quaternion.copy(this.camera.quaternion);
    const alive = this.flameUniforms.uAlive.value;
    const flicker = 0.93 + 0.055 * Math.sin(elapsed * 12.7) + 0.025 * Math.sin(elapsed * 8.1);
    this.flameLight.intensity = 2.3 * flicker * alive * (1 + this.impactLife * 0.10);
    this.flameLight.position.x = Math.sin(elapsed * 7.1) * 0.035 * (1 + this.flameUniforms.uInstability.value);
    this.ember.visible = alive > 0.05;

    this.updateAirPulse(dt, elapsed);
    this.updateSmoke(dt, elapsed);
    this.renderer.render(this.scene, this.camera);
  };

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
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.container.replaceChildren();
  }
}
