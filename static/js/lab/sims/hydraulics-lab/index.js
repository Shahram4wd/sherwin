import {
  THREE,
  SceneManager,
  UIPanel,
  clamp,
  lerp,
  randRange,
  BurstSystem,
} from '@lab/core';
import { DestructibleMesh, FractureOptions } from '@dgreenheck/three-pinata';

const GRAPH_WINDOW_SEC = 45;
const DEFAULT_PRESSURE_MPA = 12;
const PRACTICAL_UNITS = 'practical';
const SI_UNITS = 'si';
const MAX_PISTON_DIAMETER_M = 0.32;
const MAX_FORCE_KN = 780_000;
const MAX_PRESSURE_PA = (MAX_FORCE_KN * 1000) / areaFromDiameter(MAX_PISTON_DIAMETER_M);
const CANVAS_BG_DARK = '#080810';
const CANVAS_BG_LIGHT = '#ffffff';
const RAM_HALF_HEIGHT = 2.1;
const PRESS_PLATE_HALF_HEIGHT = 0.225;
const RAM_PLATE_CONTACT_OVERLAP = 0.02;
const MATERIAL_HALF_HEIGHT = 1.1;
const MATERIAL_PLATE_CONTACT_OVERLAP = 0.015;
const FRACTURE_BASE_FRAGMENT_COUNT = 16;
const FRACTURE_MAX_FRAGMENT_COUNT = 30;
const FRACTURE_CRACK_GAP_M = 0.035;
const PRESSURE_RAMP_BASE_MPA_PER_SEC = 14;
const PRESSURE_RAMP_VALVE_GAIN_MPA_PER_SEC = 42;

function createCautionTapeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(canvas.width, canvas.height);
  const period = 64;
  const stripeWidth = 24;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const stripe = ((x + y) % period) < stripeWidth;
      if (stripe) {
        image.data[i] = 17;
        image.data[i + 1] = 24;
        image.data[i + 2] = 39;
      } else {
        image.data[i] = 250;
        image.data[i + 1] = 204;
        image.data[i + 2] = 21;
      }
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.repeat.set(1, 1);
  return texture;
}

function createFloorGridTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.6)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 16; i++) {
    const p = Math.round((i / 16) * size) + 0.5;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
  }
  // The grid dies out toward the edge of the pad.
  const fade = ctx.createRadialGradient(size / 2, size / 2, size * 0.12, size / 2, size / 2, size * 0.5);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createElementEngraveTexture(material) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#c9ced6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const symbol = material.symbol || material.code;
  const atomicNumber = String(material.atomicNumber || '');
  const atomicMass = Number(material.atomicMass || 0)
    .toFixed(3)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.lineWidth = 8;
  ctx.strokeRect(44, 44, 424, 424);

  ctx.font = '700 54px Space Grotesk, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.23)';
  ctx.fillText(atomicNumber, 77, 117);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillText(atomicNumber, 72, 112);

  ctx.font = '700 192px Space Grotesk, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillText(symbol, 262, 268);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.46)';
  ctx.fillText(symbol, 256, 262);

  ctx.font = '700 44px Space Grotesk, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillText(atomicMass, 438, 458);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.fillText(atomicMass, 432, 452);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function createMaterialNameEngraveTexture(material) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#c9ced6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.lineWidth = 8;
  ctx.strokeRect(44, 44, 424, 424);

  const label = String(material.name || material.code || 'Material').trim();
  const words = label.split(/\s+/).filter(Boolean);
  const lines = [];
  if (words.length <= 2) {
    lines.push(words.join(' '));
  } else {
    const mid = Math.ceil(words.length / 2);
    lines.push(words.slice(0, mid).join(' '));
    lines.push(words.slice(mid).join(' '));
  }

  const mainCode = String(material.code || '').trim();
  if (mainCode) {
    ctx.font = '700 58px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fillText(mainCode, 261, 130);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillText(mainCode, 256, 124);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lineHeight = 96;
  const startY = lines.length > 1 ? 228 : 260;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    ctx.font = '700 70px Space Grotesk, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillText(line, 260, startY + i * lineHeight);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.46)';
    ctx.fillText(line, 256, startY - 6 + i * lineHeight);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function areaFromDiameter(diameterM) {
  return Math.PI * Math.pow(diameterM / 2, 2);
}

function formatPressure(pa, units) {
  const mpa = pa / 1_000_000;
  const bar = pa / 100_000;
  return units === PRACTICAL_UNITS
    ? `${bar.toFixed(1)} bar (${mpa.toFixed(2)} MPa)`
    : `${mpa.toFixed(2)} MPa (${bar.toFixed(1)} bar)`;
}

function formatForce(newtons, units) {
  const abs = Math.abs(newtons);
  if (abs >= 1_000_000) {
    const mn = newtons / 1_000_000;
    const kn = newtons / 1000;
    return units === PRACTICAL_UNITS
      ? `${mn.toFixed(2)} MN (${kn.toFixed(0)} kN)`
      : `${mn.toFixed(2)} MN (${kn.toFixed(0)} kN)`;
  }
  if (abs >= 1000) {
    const kn = newtons / 1000;
    return units === PRACTICAL_UNITS
      ? `${kn.toFixed(1)} kN (${newtons.toFixed(0)} N)`
      : `${kn.toFixed(1)} kN (${newtons.toFixed(0)} N)`;
  }
  return `${newtons.toFixed(0)} N`;
}

function formatDiameter(diameterM, units) {
  const mm = diameterM * 1000;
  const inch = diameterM / 0.0254;
  return units === PRACTICAL_UNITS
    ? `${inch.toFixed(2)} in (${mm.toFixed(0)} mm)`
    : `${mm.toFixed(0)} mm (${inch.toFixed(2)} in)`;
}

function riskLabel(score) {
  if (score >= 75) return 'Critical';
  if (score >= 50) return 'High';
  if (score >= 25) return 'Moderate';
  return 'Low';
}

function riskClass(score) {
  return riskLabel(score).toLowerCase();
}

function createSelectField(label, options, value, onChange) {
  const wrapper = document.createElement('div');
  wrapper.className = 'miniapp-field';
  const lbl = document.createElement('label');
  lbl.textContent = label;
  const select = document.createElement('select');
  select.className = 'miniapp-select';
  options.forEach((opt) => {
    const el = document.createElement('option');
    el.value = opt.value;
    el.textContent = opt.label;
    if (opt.value === value) el.selected = true;
    select.appendChild(el);
  });
  select.addEventListener('change', () => onChange(select.value));
  wrapper.appendChild(lbl);
  wrapper.appendChild(select);
  wrapper.select = select;
  return wrapper;
}

class PressureGraph {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.points = [];
  }

  push(t, pressurePa) {
    this.points.push({ t, pressurePa });
    const cutoff = t - GRAPH_WINDOW_SEC;
    while (this.points.length > 1 && this.points[0].t < cutoff) this.points.shift();
  }

  clear() {
    this.points = [];
  }

  draw() {
    const ctx = this.ctx;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const y = 12 + i * ((height - 24) / 3);
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(width - 10, y);
      ctx.stroke();
    }

    if (this.points.length < 2) return;
    const tMax = this.points[this.points.length - 1].t;
    const tMin = Math.max(0, tMax - GRAPH_WINDOW_SEC);
    const pMax = Math.max(1, ...this.points.map((p) => p.pressurePa));

    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#60a5fa';
    this.points.forEach((point, index) => {
      const x = 12 + ((point.t - tMin) / GRAPH_WINDOW_SEC) * (width - 24);
      const y = height - 12 - (point.pressurePa / pMax) * (height - 24);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const last = this.points[this.points.length - 1];
    const lx = 12 + ((last.t - tMin) / GRAPH_WINDOW_SEC) * (width - 24);
    const ly = height - 12 - (last.pressurePa / pMax) * (height - 24);
    ctx.fillStyle = '#c7d2fe';
    ctx.beginPath();
    ctx.arc(lx, ly, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class HydraulicsLabApp {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(`Container #${containerId} not found`);

    this.materials = {};
    this.units = SI_UNITS;
    this.materialKey = 'aluminum_6061';
    this.targetPressurePa = DEFAULT_PRESSURE_MPA * 1_000_000;
    this.currentPressurePa = 0;
    this.previousPressurePa = 0;
    this.valveOpening = 0.7;
    this.pistonDiameterM = 0.2;
    this.running = false;
    this.timeSec = 0;
    this.efficiency = 0.9;
    this.riskScore = 0;
    this.stage = 'Elastic';
    this.events = [];
    this.lastEvent = 'Idle';
    this.activeFault = null;
    this.materialCompression = 0;
    this.pressureDropPulse = 0;
    this._graphSampleAccumulator = 0;

    // Smoke & camera shake state
    this._smokeParticles = [];
    this._cameraShakeOffset = new THREE.Vector3();
    this._cameraBasePos = null;
    this._themeObserver = null;

    // Theme-reactive visual references
    this._floorMesh = null;
    this._frameMaterial = null;
    this._ambientGlow = null;
    this._themeKeyLight = null;
    this._themeFillLight = null;
    this._rimLight = null;
    this._gridMesh = null;
    this._fluidMesh = null;
    this._lampMaterial = null;
    this._gaugeTexture = null;
    this._gaugeLast = -1;
    this._sparks = null;

    this.materialFragments = [];
    this.materialFractured = false;
  }

  async init() {
    await this._loadMaterials();

    const highFx = window.matchMedia('(min-width: 900px)').matches
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.engine = new SceneManager(this.container, {
      background: this._getCanvasBackground(),
      orbit: true,
      shadows: true,
      toneMapping: 'aces',
      exposure: 1.05,
      defaultLights: false,
    });
    // Reflections make the chrome ram and steel frame read as metal.
    await this.engine.setEnvironment(0.9);
    if (highFx) {
      this.engine.enableBloom({ strength: 0.32, radius: 0.55, threshold: 0.86 })
        .then(() => this._applyThemeVisuals())
        .catch(() => {});
    }
    this._watchThemeChanges();
    this._buildScene();
    this._updateMaterialAppearance();
    this._buildControls();
    this._buildInfoPanel();
    this._buildActionsPanel();
    this._buildGraphPanel();
    this._buildPresetsPanel();
    this._updateAllUI();

    this.engine.onTick((dt) => {
      this._tickSimulation(dt);
      this._tickVisuals(dt);
      this.graph.draw();
    });
    this.engine.start();
  }

  _getCanvasBackground() {
    return document.documentElement.getAttribute('data-theme') === 'light'
      ? CANVAS_BG_LIGHT
      : CANVAS_BG_DARK;
  }

  _applyCanvasBackground() {
    if (!this.engine || !this.engine.renderer) return;
    this.engine.renderer.setClearColor(this._getCanvasBackground(), 1);
  }

  _applyThemeVisuals() {
    const isLightTheme = document.documentElement.getAttribute('data-theme') === 'light';
    if (!this.engine || !this.engine.renderer) return;

    this.engine.renderer.toneMappingExposure = isLightTheme ? 0.92 : 1.05;
    if (this.engine.bloomPass) {
      // Bloom on a white page glows the background itself; keep only a trace of it.
      this.engine.bloomPass.strength = isLightTheme ? 0.05 : 0.32;
    }
    if (this.engine.scene && 'environmentIntensity' in this.engine.scene) {
      // The studio environment is bright; on a white page it flattens everything.
      this.engine.scene.environmentIntensity = isLightTheme ? 0.4 : 0.9;
    }
    if (this.engine.scene && this.engine.scene.fog) {
      this.engine.scene.fog.color.set(this._getCanvasBackground());
      this.engine.scene.fog.near = isLightTheme ? 30 : 20;
      this.engine.scene.fog.far = isLightTheme ? 62 : 44;
    }
    if (this._themeKeyLight) {
      this._themeKeyLight.intensity = isLightTheme ? 2.8 : 2.6;
    }
    if (this._themeFillLight) {
      this._themeFillLight.intensity = isLightTheme ? 0.9 : 0.7;
      this._themeFillLight.groundColor.setHex(isLightTheme ? 0x6b7280 : 0x1a1208);
    }
    if (this._rimLight) {
      this._rimLight.intensity = isLightTheme ? 12 : 26;
    }
    if (this._floorMesh) {
      this._floorMesh.material.color.setHex(isLightTheme ? 0xb4bfcc : 0x1a2030);
      this._floorMesh.material.roughness = isLightTheme ? 0.75 : 0.45;
    }
    if (this._gridMesh) {
      this._gridMesh.material.opacity = isLightTheme ? 0.16 : 0.28;
    }
    if (this._frameMaterial) {
      this._frameMaterial.color.setHex(isLightTheme ? 0x475569 : 0x3d4a5c);
    }
  }

  _watchThemeChanges() {
    this._applyCanvasBackground();
    this._applyThemeVisuals();
    this._themeObserver = new MutationObserver(() => {
      this._applyCanvasBackground();
      this._applyThemeVisuals();
    });
    this._themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  }

  async _loadMaterials() {
    const resp = await fetch('/static/data/hydraulics_materials.json');
    const data = await resp.json();
    this.materials = data.materials;
  }

  _buildScene() {
    const scene = this.engine.scene;
    scene.fog = new THREE.Fog(this._getCanvasBackground(), 20, 44);

    // Floor: a round steel pad with a faint blueprint grid and a caution stripe ring.
    this._floorMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(11, 11.6, 0.6, 96),
      new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.45, metalness: 0.35 })
    );
    this._floorMesh.position.y = -4.5;
    this._floorMesh.receiveShadow = true;
    scene.add(this._floorMesh);

    this._gridMesh = new THREE.Mesh(
      new THREE.CircleGeometry(10.6, 96),
      new THREE.MeshBasicMaterial({ map: createFloorGridTexture(), transparent: true, opacity: 0.28, depthWrite: false })
    );
    this._gridMesh.rotation.x = -Math.PI / 2;
    this._gridMesh.position.y = -4.19;
    scene.add(this._gridMesh);

    const tape = createCautionTapeTexture();
    tape.wrapT = THREE.RepeatWrapping;
    tape.repeat.set(3, 3);
    const stripe = new THREE.Mesh(
      new THREE.RingGeometry(6.6, 7.3, 96),
      new THREE.MeshStandardMaterial({ map: tape, roughness: 0.7, metalness: 0.05 })
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.y = -4.185;
    stripe.receiveShadow = true;
    scene.add(stripe);

    // Frame: two I-beam pillars on bolted feet, and a top beam.
    this._frameMaterial = new THREE.MeshStandardMaterial({ color: 0x3d4a5c, metalness: 0.75, roughness: 0.42 });
    const boltMaterial = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.3 });
    const shadowed = (obj) => {
      obj.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      return obj;
    };
    const makePillar = (x) => {
      const g = new THREE.Group();
      const web = new THREE.Mesh(new THREE.BoxGeometry(0.28, 7.6, 0.7), this._frameMaterial);
      const flangeFront = new THREE.Mesh(new THREE.BoxGeometry(0.8, 7.6, 0.16), this._frameMaterial);
      const flangeBack = flangeFront.clone();
      flangeFront.position.z = 0.35;
      flangeBack.position.z = -0.35;
      const foot = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 1.3), this._frameMaterial);
      foot.position.y = -3.8 + 0.175;
      g.add(web, flangeFront, flangeBack, foot);
      [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]].forEach(([bx, bz]) => {
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 10), boltMaterial);
        bolt.position.set(bx, -3.8 + 0.4, bz);
        g.add(bolt);
      });
      g.position.set(x, -0.4, 0);
      return shadowed(g);
    };
    this.leftPillar = makePillar(-3.4);
    this.rightPillar = makePillar(3.4);
    scene.add(this.leftPillar, this.rightPillar);

    const topBeam = shadowed(new THREE.Mesh(new THREE.BoxGeometry(7.9, 0.9, 1.05), this._frameMaterial));
    topBeam.position.set(0, 3.5, 0);
    scene.add(topBeam);
    for (const bx of [-3.4, -1.6, 1.6, 3.4]) {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 12), boltMaterial);
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(bx, 3.5, 0.585);
      scene.add(bolt);
    }

    // Hydraulic cylinder: blue body, steel end caps, a sight glass with glowing fluid.
    this.cylinder = shadowed(new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 3.6, 48),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.62, roughness: 0.3 })
    ));
    this.cylinder.position.set(0, 2.4, 0);
    scene.add(this.cylinder);
    const capMaterial = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.25 });
    for (const [y, h] of [[4.05, 0.32], [0.72, 0.28]]) {
      const cap = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, h, 48), capMaterial));
      cap.position.set(0, y, 0);
      scene.add(cap);
    }
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 2.6, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.2 })
    );
    glass.position.set(0.6, 2.4, 0.98);
    scene.add(glass);
    this._fluidMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 1, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 1.2, roughness: 0.3 })
    );
    this._fluidMesh.position.set(0.6, 1.2, 0.98);
    scene.add(this._fluidMesh);

    // Hose from the pump unit up and over into the cylinder.
    const hosePath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-5.1, -2.2, -0.9),
      new THREE.Vector3(-5.4, 0.6, -0.9),
      new THREE.Vector3(-3.8, 3.2, -0.6),
      new THREE.Vector3(-1.4, 3.05, -0.4),
      new THREE.Vector3(-1.05, 2.6, -0.2),
    ]);
    const hose = shadowed(new THREE.Mesh(
      new THREE.TubeGeometry(hosePath, 48, 0.11, 10, false),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85, metalness: 0.1 })
    ));
    scene.add(hose);
    const pump = shadowed(new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.0, 1.5), this._frameMaterial));
    pump.position.set(-5.1, -3.2, -0.9);
    scene.add(pump);
    this._lampMaterial = new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x34d399, emissiveIntensity: 1.6, roughness: 0.4 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), this._lampMaterial);
    lamp.position.set(-5.1, -2.05, -0.12);
    scene.add(lamp);

    // Ram (chrome) and press plate (brushed steel with a dark rim).
    this.ram = shadowed(new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 4.2, 48),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 1.0, roughness: 0.12 })
    ));
    this.ram.position.set(0, 0.6, 0);
    scene.add(this.ram);

    this.pressPlate = shadowed(new THREE.Mesh(
      new THREE.BoxGeometry(2.9, 0.45, 2.9),
      new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.85, roughness: 0.32 })
    ));
    this.pressPlate.position.set(0, -1.75, 0);
    const plateRim = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 0.12, 3.0),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.6, roughness: 0.5 })
    );
    plateRim.position.y = -0.19;
    this.pressPlate.add(plateRim);
    scene.add(this.pressPlate);

    const outerMaterial = new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.62, metalness: 0.12 });
    const innerMaterial = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9, metalness: 0.05 });
    this.materialMesh = new DestructibleMesh(
      new THREE.BoxGeometry(2.4, 2.2, 2.4),
      outerMaterial,
      innerMaterial
    );
    this.materialMesh.position.set(0, -3.1, 0);
    this.materialMesh.castShadow = true;
    this.materialMesh.receiveShadow = true;
    scene.add(this.materialMesh);

    // Pressure gauge on the right pillar; its face is a live canvas.
    this._gaugeCanvas = document.createElement('canvas');
    this._gaugeCanvas.width = 256;
    this._gaugeCanvas.height = 256;
    this._gaugeTexture = new THREE.CanvasTexture(this._gaugeCanvas);
    this._gaugeTexture.colorSpace = THREE.SRGBColorSpace;
    const gauge = new THREE.Group();
    const gaugeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.18, 40), capMaterial);
    gaugeBody.rotation.x = Math.PI / 2;
    const gaugeFace = new THREE.Mesh(new THREE.CircleGeometry(0.55, 40), new THREE.MeshBasicMaterial({ map: this._gaugeTexture }));
    gaugeFace.position.z = 0.095;
    gauge.add(gaugeBody, gaugeFace);
    gauge.position.set(3.4, 1.6, 0.55);
    scene.add(gauge);
    this._drawGauge(0);

    // Lights: warm key with shadows, cool rim, soft fill, and the amber work glow by the block.
    this._themeKeyLight = new THREE.DirectionalLight(0xfff1e0, 2.6);
    this._themeKeyLight.position.set(6, 9, 7);
    this._themeKeyLight.castShadow = true;
    this._themeKeyLight.shadow.mapSize.set(2048, 2048);
    this._themeKeyLight.shadow.camera.near = 2;
    this._themeKeyLight.shadow.camera.far = 40;
    this._themeKeyLight.shadow.camera.left = -9;
    this._themeKeyLight.shadow.camera.right = 9;
    this._themeKeyLight.shadow.camera.top = 9;
    this._themeKeyLight.shadow.camera.bottom = -9;
    this._themeKeyLight.shadow.bias = -0.0006;
    this._themeKeyLight.shadow.normalBias = 0.02;
    scene.add(this._themeKeyLight);

    this._themeFillLight = new THREE.HemisphereLight(0xbfd4ff, 0x1a1208, 0.7);
    scene.add(this._themeFillLight);

    this._rimLight = new THREE.PointLight(0x22d3ee, 26, 40, 1.6);
    this._rimLight.position.set(-6, 4, -7);
    scene.add(this._rimLight);

    this._ambientGlow = new THREE.PointLight(0xffa23d, 18, 24, 1.8);
    this._ambientGlow.position.set(0.6, -1.4, 3.6);
    scene.add(this._ambientGlow);

    // Sparks for yield and crush moments.
    this._sparks = new BurstSystem(scene, { max: 600, gravity: -9.8, additive: true, sizeScale: 260 });

    // Smoke particle system
    this._initSmoke(scene);

    this.engine.camera.position.set(1.6, 1.2, 14.8);
    this.engine.controls.target.set(0, -1.0, 0);
    this.engine.controls.minDistance = 7;
    this.engine.controls.maxDistance = 30;
    this.engine.controls.maxPolarAngle = Math.PI * 0.53;
    this.engine.controls.enablePan = false;
    this._cameraBasePos = this.engine.camera.position.clone();
    this._applyThemeVisuals();
  }

  _drawGauge(ratio) {
    if (!this._gaugeCanvas) return;
    const ctx = this._gaugeCanvas.getContext('2d');
    const size = 256;
    const c = size / 2;
    const r = 104;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#0b1220';
    ctx.beginPath();
    ctx.arc(c, c, 124, 0, Math.PI * 2);
    ctx.fill();
    const a0 = Math.PI * 0.75;
    const sweep = Math.PI * 1.5;
    ctx.lineWidth = 12;
    ctx.lineCap = 'butt';
    [[0, 0.6, 'rgba(52,211,153,0.85)'], [0.6, 0.8, 'rgba(255,208,138,0.9)'], [0.8, 1, 'rgba(239,45,45,0.95)']].forEach(([f0, f1, col]) => {
      ctx.strokeStyle = col;
      ctx.beginPath();
      ctx.arc(c, c, r, a0 + sweep * f0, a0 + sweep * f1);
      ctx.stroke();
    });
    ctx.strokeStyle = 'rgba(226,232,240,0.85)';
    ctx.lineWidth = 2;
    for (let k = 0; k <= 12; k++) {
      const ta = a0 + sweep * k / 12;
      const inner = k % 3 === 0 ? 74 : 82;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(ta) * inner, c + Math.sin(ta) * inner);
      ctx.lineTo(c + Math.cos(ta) * 92, c + Math.sin(ta) * 92);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(226,232,240,0.7)';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MPa', c, c + 64);
    const na = a0 + sweep * clamp(ratio, 0, 1);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(c - Math.cos(na) * 16, c - Math.sin(na) * 16);
    ctx.lineTo(c + Math.cos(na) * 88, c + Math.sin(na) * 88);
    ctx.stroke();
    ctx.strokeStyle = '#ef2d2d';
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(na) * 62, c + Math.sin(na) * 62);
    ctx.lineTo(c + Math.cos(na) * 88, c + Math.sin(na) * 88);
    ctx.stroke();
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(c, c, 9, 0, Math.PI * 2);
    ctx.fill();
    this._gaugeTexture.needsUpdate = true;
  }

  _initSmoke(scene) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(200,200,200,0.6)');
    gradient.addColorStop(0.4, 'rgba(160,160,160,0.3)');
    gradient.addColorStop(1, 'rgba(100,100,100,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    this._smokeTexture = new THREE.CanvasTexture(canvas);
    this._smokeGroup = new THREE.Group();
    scene.add(this._smokeGroup);
  }

  _spawnSmokePuff(origin, intensity) {
    const mat = new THREE.SpriteMaterial({
      map: this._smokeTexture,
      transparent: true,
      opacity: 0.25 + intensity * 0.35,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    const spread = 1.2 + intensity * 0.8;
    sprite.position.set(
      origin.x + randRange(-spread, spread),
      origin.y + randRange(0, 0.5),
      origin.z + randRange(-spread, spread)
    );
    const size = randRange(0.6, 1.2) + intensity * 0.6;
    sprite.scale.set(size, size, 1);
    this._smokeGroup.add(sprite);
    this._smokeParticles.push({
      sprite,
      vel: new THREE.Vector3(
        randRange(-0.3, 0.3),
        randRange(1.2, 2.8),
        randRange(-0.3, 0.3)
      ),
      life: 0,
      maxLife: randRange(1.2, 2.5),
      growRate: randRange(0.6, 1.4),
    });
  }

  _tickSmoke(dt, intensity) {
    // Spawn new puffs based on intensity (0..1)
    if (intensity > 0) {
      const spawnRate = 2 + intensity * 14;
      const count = Math.floor(spawnRate * dt + (Math.random() < (spawnRate * dt % 1) ? 1 : 0));
      const origin = this.pressPlate.position;
      for (let i = 0; i < count; i++) {
        this._spawnSmokePuff(origin, intensity);
      }
    }

    // Update existing particles
    for (let i = this._smokeParticles.length - 1; i >= 0; i--) {
      const p = this._smokeParticles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this._smokeGroup.remove(p.sprite);
        p.sprite.material.dispose();
        this._smokeParticles.splice(i, 1);
        continue;
      }
      const t = p.life / p.maxLife;
      p.sprite.position.addScaledVector(p.vel, dt);
      p.sprite.scale.x += p.growRate * dt;
      p.sprite.scale.y += p.growRate * dt;
      p.sprite.material.opacity = (1 - t) * (0.25 + intensity * 0.35);
    }
  }

  _tickCameraShake(dt) {
    const cam = this.engine.camera;
    // Restore previous offset
    cam.position.sub(this._cameraShakeOffset);

    // Compute shake magnitude from risk score
    // Starts at riskScore 50 (High), maxes out at 100 (Critical)
    const shakeStrength = clamp((this.riskScore - 50) / 50, 0, 1);
    if (shakeStrength > 0) {
      const magnitude = shakeStrength * 0.18;
      this._cameraShakeOffset.set(
        randRange(-magnitude, magnitude),
        randRange(-magnitude, magnitude),
        randRange(-magnitude * 0.5, magnitude * 0.5)
      );
    } else {
      this._cameraShakeOffset.set(0, 0, 0);
    }
    cam.position.add(this._cameraShakeOffset);
  }

  _buildControls() {
    const panel = new UIPanel(this.container, 'top-left', 'Controls');
    panel.addHTML('<div class="miniapp-title">🛠 Hydraulics Controls</div>');

    this._pressureSlider = panel.addSlider('Target Pressure (MPa)', 0, Math.round(MAX_PRESSURE_PA / 1_000_000), DEFAULT_PRESSURE_MPA, (v) => {
      this.targetPressurePa = Number(v) * 1_000_000;
      this._updateAllUI();
    });

    this._valveSlider = panel.addSlider('Valve Opening (%)', 10, 100, 70, (v) => {
      this.valveOpening = Number(v) / 100;
      this._updateAllUI();
    });

    this._diameterSlider = panel.addSlider('Piston Diameter (mm)', 80, 320, 200, (v) => {
      this.pistonDiameterM = Number(v) / 1000;
      this._updateAllUI();
    });

    const materialField = createSelectField(
      'Material',
      Object.entries(this.materials).map(([value, material]) => ({ value, label: material.name })),
      this.materialKey,
      (value) => {
        this.materialKey = value;
        this._clearFractureFragments();
        this._restoreMaterialBlock();
        this._updateMaterialAppearance();
        this._updateAllUI();
      }
    );
    panel.el.appendChild(materialField);
    this._materialSelect = materialField.select;

    const unitField = createSelectField(
      'Units',
      [
        { value: SI_UNITS, label: 'SI / International' },
        { value: PRACTICAL_UNITS, label: 'Practical / Shop' },
      ],
      this.units,
      (value) => {
        this.units = value;
        this._updateAllUI();
      }
    );
    panel.el.appendChild(unitField);
    this._unitSelect = unitField.select;
  }

  _buildInfoPanel() {
    const panel = new UIPanel(this.container, 'top-right', 'Status');
    this._infoEl = panel.addDisplay('hydraulics-info', '');
  }

  _buildActionsPanel() {
    const panel = new UIPanel(this.container, 'bottom-left', 'Actions');
    panel.addHTML('<div class="miniapp-subtitle">Experiment Controls</div>');
    panel.addButton('Start Press', () => this._startPress());
    panel.addButton('Release Pressure', () => this._releasePressure());
    panel.addButton('Emergency Stop', () => this._emergencyStop());
    panel.addButton('Reset', () => this._reset(), 'miniapp-btn--reset');
    this._actionsInfo = panel.addDisplay('hydraulics-actions-info', '');
  }

  _buildGraphPanel() {
    const panel = new UIPanel(this.container, 'bottom-right', 'Graph');
    panel.addHTML('<div class="miniapp-subtitle">Pressure vs Time</div>');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <canvas class="miniapp-chart"></canvas>
      <div class="miniapp-chart-meta">
        <span id="graph-window">45s window</span>
        <span id="graph-event">Idle</span>
      </div>
    `;
    panel.el.appendChild(wrapper);
    this._graphWindowEl = wrapper.querySelector('#graph-window');
    this._graphEventEl = wrapper.querySelector('#graph-event');
    this.graph = new PressureGraph(wrapper.querySelector('canvas'));
  }

  _buildPresetsPanel() {
    const bar = document.createElement('div');
    bar.className = 'miniapp-presets';
    bar.innerHTML = '<span class="miniapp-presets-label">Presets:</span>';
    const presets = [
      { label: 'Safe Press', targetMpa: 8, valve: 0.75, diameterM: 0.18, material: 'pine_wood' },
      { label: 'Overpowered', targetMpa: 32, valve: 0.95, diameterM: 0.24, material: 'aluminum_6061' },
      { label: 'Weak System', targetMpa: 4, valve: 0.4, diameterM: 0.14, material: 'ductile_iron' },
      { label: 'High Efficiency', targetMpa: 18, valve: 0.85, diameterM: 0.2, material: 'tungsten' },
      { label: 'Sponge Demo', targetMpa: 1.2, valve: 0.8, diameterM: 0.16, material: 'sponge' },
    ];

    presets.forEach((preset) => {
      const btn = document.createElement('button');
      btn.className = 'miniapp-preset-btn';
      btn.textContent = preset.label;
      btn.addEventListener('click', () => this._loadPreset(preset));
      bar.appendChild(btn);
    });
    this.container.appendChild(bar);
  }

  _loadPreset(preset) {
    this.targetPressurePa = preset.targetMpa * 1_000_000;
    this.valveOpening = preset.valve;
    this.pistonDiameterM = preset.diameterM;
    this.materialKey = preset.material;
    this._pressureSlider.setValue(preset.targetMpa);
    this._valveSlider.setValue(Math.round(preset.valve * 100));
    this._diameterSlider.setValue(Math.round(preset.diameterM * 1000));
    this._materialSelect.value = preset.material;
    this._clearFractureFragments();
    this._restoreMaterialBlock();
    this._updateMaterialAppearance();
    this._pushEvent(`Loaded ${preset.label} preset`, 'preset');
    this._updateAllUI();
  }

  _startPress() {
    this.running = true;
    this.activeFault = null;
    this._pushEvent('Press started', 'start');
    this._updateAllUI();
  }

  _releasePressure() {
    this.running = false;
    this.targetPressurePa = 0;
    this._pressureSlider.setValue(0);
    this.pressureDropPulse = 1;
    this._pushEvent('Pressure released', 'release');
    this._updateAllUI();
  }

  _emergencyStop() {
    this.running = false;
    this.currentPressurePa *= 0.15;
    this.targetPressurePa = 0;
    this._pressureSlider.setValue(0);
    this.pressureDropPulse = 1;
    this.activeFault = 'emergency_stop';
    this._pushEvent('Emergency stop triggered', 'emergency_stop');
    this._updateAllUI();
  }

  _reset() {
    this.units = SI_UNITS;
    this.materialKey = 'aluminum_6061';
    this.targetPressurePa = DEFAULT_PRESSURE_MPA * 1_000_000;
    this.currentPressurePa = 0;
    this.previousPressurePa = 0;
    this.valveOpening = 0.7;
    this.pistonDiameterM = 0.2;
    this.running = false;
    this.timeSec = 0;
    this.efficiency = 0.9;
    this.riskScore = 0;
    this.stage = 'Elastic';
    this.events = [];
    this.lastEvent = 'Idle';
    this.activeFault = null;
    this.materialCompression = 0;
    this.pressureDropPulse = 0;
    this._graphSampleAccumulator = 0;
    this._clearFractureFragments();
    this._restoreMaterialBlock();
    this.graph.clear();
    this._pressureSlider.setValue(DEFAULT_PRESSURE_MPA);
    this._valveSlider.setValue(70);
    this._diameterSlider.setValue(200);
    this._materialSelect.value = this.materialKey;
    this._unitSelect.value = this.units;
    this._updateMaterialAppearance();
    this._updateAllUI();
  }

  _tickSimulation(dt) {
    this.timeSec += dt;
    this.previousPressurePa = this.currentPressurePa;
    const target = this.running ? this.targetPressurePa : 0;
    const pressureGap = target - this.currentPressurePa;
    const rampRateMpaPerSec = PRESSURE_RAMP_BASE_MPA_PER_SEC + this.valveOpening * PRESSURE_RAMP_VALVE_GAIN_MPA_PER_SEC;
    const rampStepPa = rampRateMpaPerSec * 1_000_000 * dt;
    const appliedStepPa = Math.min(Math.abs(pressureGap), rampStepPa);
    const leakTerm = this.activeFault === 'seal_leak' ? this.currentPressurePa * 0.18 * dt : 0;
    const signedStep = Math.sign(pressureGap) * appliedStepPa;
    this.currentPressurePa = clamp(this.currentPressurePa + signedStep - leakTerm, 0, MAX_PRESSURE_PA);

    if (this.pressureDropPulse > 0) {
      this.currentPressurePa *= lerp(1, 0.78, this.pressureDropPulse);
      this.pressureDropPulse = Math.max(0, this.pressureDropPulse - dt * 2.5);
    }

    const pressureRateMpa = Math.abs(this.currentPressurePa - this.previousPressurePa) / Math.max(dt, 0.001) / 1_000_000;
    this._updateMaterialStage();

    const material = this.materials[this.materialKey];
    const safeRatio = clamp(this.currentPressurePa / (material.yieldMpa * 1_000_000), 0, 1.6);
    const materialMargin = clamp(1 - (this.currentPressurePa / (material.crushMpa * 1_000_000)), -0.4, 1);
    const cavitationProxy = this.valveOpening < 0.18 && pressureRateMpa > 4 ? 1 : 0;
    const spikeProxy = clamp(pressureRateMpa / 10, 0, 1);
    const efficiencyPenalty = (1 - this.valveOpening) * 25 + (this.activeFault === 'seal_leak' ? 20 : 0);

    this.efficiency = clamp(0.95 - ((1 - this.valveOpening) * 0.18) - (safeRatio > 1 ? 0.2 : 0) - (this.activeFault === 'seal_leak' ? 0.12 : 0), 0.22, 0.98);
    this.riskScore = clamp(
      Math.round((safeRatio * 42) + (spikeProxy * 24) + ((1 - materialMargin) * 22) + (cavitationProxy * 12) + efficiencyPenalty),
      0,
      100
    );

    this._maybeTriggerEvents(pressureRateMpa);

    this._graphSampleAccumulator += dt;
    if (this._graphSampleAccumulator >= 0.12) {
      this.graph.push(this.timeSec, this.currentPressurePa);
      this._graphSampleAccumulator = 0;
    }

    this._updateAllUI();
  }

  _updateMaterialStage() {
    const material = this.materials[this.materialKey];
    const pressureMpa = this.currentPressurePa / 1_000_000;
    if (pressureMpa >= material.crushMpa) {
      this.stage = 'Crush';
      this.materialCompression = clamp(0.55 + ((pressureMpa - material.crushMpa) / Math.max(material.crushMpa, 1)) * 0.2, 0, 0.72);
    } else if (pressureMpa >= material.yieldMpa) {
      this.stage = 'Yield';
      this.materialCompression = clamp(0.15 + ((pressureMpa - material.yieldMpa) / Math.max(material.crushMpa - material.yieldMpa, 0.001)) * 0.35, 0, 0.5);
    } else if (pressureMpa >= material.elasticMpa) {
      this.stage = 'Elastic';
      this.materialCompression = clamp(((pressureMpa - material.elasticMpa) / Math.max(material.yieldMpa - material.elasticMpa, 0.001)) * 0.12, 0, 0.16);
    } else {
      this.stage = 'Elastic';
      this.materialCompression = clamp((pressureMpa / Math.max(material.elasticMpa, 0.001)) * 0.05 * material.deformationBias, 0, 0.08);
    }
  }

  _maybeTriggerEvents(pressureRateMpa) {
    const material = this.materials[this.materialKey];
    const pressureMpa = this.currentPressurePa / 1_000_000;
    const canFracture = this._materialCanFracture(material);

    if (this.stage === 'Crush' && this.lastEvent !== 'Material crush threshold reached') {
      this.pressureDropPulse = 1;
      this.running = false;
      if (canFracture) {
        this._fractureMaterial();
      } else {
        this._clearFractureFragments();
      }
      this._pushEvent('Material crush threshold reached', 'crush');
      return;
    }
    if (this.valveOpening < 0.08 && pressureRateMpa > 6 && this.activeFault !== 'valve_slam') {
      this.activeFault = 'valve_slam';
      this._pushEvent('Valve slam spike detected', 'valve_slam');
    }
    if (pressureRateMpa > 7 && this.lastEvent !== 'Pressure spike detected') {
      this._pushEvent('Pressure spike detected', 'pressure_spike');
    }
    if (this.valveOpening < 0.14 && pressureMpa < material.elasticMpa * 0.12 && this.activeFault !== 'cavitation') {
      this.activeFault = 'cavitation';
      this._pushEvent('Cavitation warning', 'cavitation');
    }
    if (pressureMpa > material.yieldMpa * 0.8 && this.activeFault !== 'seal_leak' && Math.random() < 0.0025) {
      this.activeFault = 'seal_leak';
      this._pushEvent('Seal leak started', 'seal_leak');
    }
  }

  _materialCanFracture(material) {
    if (!material) return false;
    if (material.noFracture === true) return false;
    return this.materialKey !== 'sponge';
  }

  _tickVisuals(dt) {
    const material = this.materials[this.materialKey];
    if (!material) return;

    const targetScaleY = clamp(1 - this.materialCompression * material.deformationBias, 0.18, 1);
    const lateralStretch = clamp(this.materialCompression * material.deformationBias * 1.65, 0, 1.35);
    const targetScaleXZ = 1 + lateralStretch;

    this.materialMesh.scale.x = lerp(this.materialMesh.scale.x, targetScaleXZ, 1 - Math.exp(-4.6 * dt));
    this.materialMesh.scale.y = lerp(this.materialMesh.scale.y, targetScaleY, 1 - Math.exp(-5 * dt));
    this.materialMesh.scale.z = lerp(this.materialMesh.scale.z, targetScaleXZ, 1 - Math.exp(-4.6 * dt));
    this.materialMesh.position.y = -4.1 + this.materialMesh.scale.y * 1.1;

    // Keep plate in contact with the material top face (with a tiny overlap to avoid seams).
    const materialTopY = this.materialMesh.position.y + this.materialMesh.scale.y * MATERIAL_HALF_HEIGHT;
    const targetPlateY = materialTopY + PRESS_PLATE_HALF_HEIGHT - MATERIAL_PLATE_CONTACT_OVERLAP;
    this.pressPlate.position.y = lerp(this.pressPlate.position.y, targetPlateY, 1 - Math.exp(-4.8 * dt));
    // Keep a tiny overlap so the ram and plate always read as one connected assembly.
    const ramPlateOffset = RAM_HALF_HEIGHT + PRESS_PLATE_HALF_HEIGHT - RAM_PLATE_CONTACT_OVERLAP;
    this.ram.position.y = this.pressPlate.position.y + ramPlateOffset;

    const emissive = clamp(this.currentPressurePa / MAX_PRESSURE_PA, 0, 1) * 0.35;
    const meshMaterial = this.materialMesh.material;
    if (Array.isArray(meshMaterial)) {
      if (meshMaterial[0]) {
        meshMaterial[0].emissive = new THREE.Color(material.color);
        meshMaterial[0].emissiveIntensity = emissive;
      }
      if (meshMaterial[1]) {
        meshMaterial[1].emissiveIntensity = emissive * 0.3;
      }
    } else {
      meshMaterial.emissive = new THREE.Color(material.color);
      meshMaterial.emissiveIntensity = emissive;
    }

    // Gauge, sight glass, pump lamp and work light follow the load relative to the crush point.
    const crushPa = Math.max(material.crushMpa, 0.001) * 1_000_000;
    const loadRatio = clamp(this.currentPressurePa / crushPa, 0, 1);
    if (this._gaugeTexture && Math.abs(loadRatio - this._gaugeLast) > 0.004) {
      this._gaugeLast = loadRatio;
      this._drawGauge(loadRatio);
    }
    if (this._fluidMesh) {
      const level = 0.1 + loadRatio * 2.35;
      this._fluidMesh.scale.y = level;
      this._fluidMesh.position.y = 1.15 + level / 2;
      this._fluidMesh.material.emissiveIntensity = 0.9 + loadRatio * 1.6;
    }
    if (this._lampMaterial) {
      const danger = this.riskScore >= 50;
      const lampColor = this.riskScore >= 75 ? 0xef2d2d : danger ? 0xffb45c : 0x34d399;
      this._lampMaterial.color.setHex(lampColor);
      this._lampMaterial.emissive.setHex(lampColor);
      this._lampMaterial.emissiveIntensity = danger ? 1.6 + Math.sin(this.timeSec * 12) * 0.9 : 1.6;
    }
    if (this._ambientGlow) {
      const isLightTheme = document.documentElement.getAttribute('data-theme') === 'light';
      this._ambientGlow.intensity = (isLightTheme ? 8 : 14) + loadRatio * 30;
      this._ambientGlow.color.setHex(this.stage === 'Crush' ? 0xff5f2d : 0xffa23d);
    }
    if (this._sparks) {
      if (this.stage !== 'Elastic' && this.currentPressurePa > 0 && Math.random() < (this.stage === 'Crush' ? 0.7 : 0.22)) {
        const topY = this.materialMesh.position.y + this.materialMesh.scale.y * MATERIAL_HALF_HEIGHT;
        const half = 1.2 * this.materialMesh.scale.x;
        this._sparks.emit(
          { x: randRange(-half, half), y: topY, z: randRange(-half, half) },
          { count: this.stage === 'Crush' ? 14 : 5, speed: [1.5, 5], spread: 0.75, life: [0.25, 0.7], size: [0.05, 0.12], color: [0xffd08a, 0xff8a3d, 0xffffff], drag: 0.6 }
        );
      }
      this._sparks.tick(dt);
    }

    // Smoke intensity ramps from riskScore 50 (High) to 100 (Critical)
    const smokeIntensity = clamp((this.riskScore - 50) / 50, 0, 1);
    this._tickSmoke(dt, smokeIntensity);
    this._tickCameraShake(dt);
  }

  _updateMaterialAppearance() {
    const material = this.materials[this.materialKey];
    if (!material || !this.materialMesh) return;
    const outerColor = new THREE.Color(material.color).multiplyScalar(0.78);
    const innerColor = outerColor.clone().multiplyScalar(0.32);

    const meshMaterial = this.materialMesh.material;
    const outerMaterial = Array.isArray(meshMaterial) ? meshMaterial[0] : meshMaterial;

    if (Array.isArray(meshMaterial)) {
      if (meshMaterial[0]) meshMaterial[0].color = outerColor;
      if (meshMaterial[0]) meshMaterial[0].emissive = outerColor.clone();
      if (meshMaterial[0]) meshMaterial[0].emissiveIntensity = 0;
      if (meshMaterial[1]) meshMaterial[1].color = innerColor;
      if (meshMaterial[1]) meshMaterial[1].emissive = innerColor.clone();
      if (meshMaterial[1]) meshMaterial[1].emissiveIntensity = 0;
    } else {
      meshMaterial.color = outerColor;
      meshMaterial.emissive = outerColor;
      meshMaterial.emissiveIntensity = 0;
    }

    if (outerMaterial.map) {
      outerMaterial.map.dispose();
      outerMaterial.map = null;
    }

    if (material.isElement && material.atomicNumber && material.atomicMass) {
      outerMaterial.map = createElementEngraveTexture(material);
    } else {
      outerMaterial.map = createMaterialNameEngraveTexture(material);
    }
    outerMaterial.needsUpdate = true;
  }

  _fractureMaterial() {
    if (!this.materialMesh || this.materialFractured) return;

    const pressureRatio = clamp(this.currentPressurePa / MAX_PRESSURE_PA, 0, 1);
    const fragmentCount = Math.round(
      lerp(FRACTURE_BASE_FRAGMENT_COUNT, FRACTURE_MAX_FRAGMENT_COUNT, pressureRatio)
    );
    const fractureOptions = new FractureOptions({
      fractureMethod: 'voronoi',
      fragmentCount,
      voronoiOptions: {
        mode: '3D',
        impactPoint: new THREE.Vector3(0, 0.5, 0),
        impactRadius: 0.7,
      },
      seed: Math.floor((this.timeSec * 1000) + pressureRatio * 1000),
    });

    const sourcePosition = this.materialMesh.position.clone();
    const crackGap = FRACTURE_CRACK_GAP_M * (0.85 + pressureRatio * 0.3);

    this.materialFragments = this.materialMesh.fracture(fractureOptions, (fragment) => {
      const explodeDir = fragment.position.clone().sub(sourcePosition);
      if (explodeDir.lengthSq() < 1e-6) {
        explodeDir.set(randRange(-1, 1), randRange(-1, 1), randRange(-1, 1));
      }
      explodeDir.normalize();
      fragment.position.addScaledVector(explodeDir, crackGap);

      fragment.castShadow = true;
      fragment.receiveShadow = true;
      this.engine.scene.add(fragment);
    });

    this.materialMesh.visible = false;
    this.materialFractured = true;

    if (this._sparks) {
      this._sparks.emit(sourcePosition, {
        count: 140, speed: [2, 9], spread: 0.9, life: [0.4, 1.3], size: [0.06, 0.16],
        color: [0xffd08a, 0xff8a3d, 0xef2d2d, 0xffffff], drag: 0.5, jitter: 0.8,
      });
    }
  }

  _clearFractureFragments() {
    if (!this.engine?.scene || this.materialFragments.length === 0) {
      this.materialFragments = [];
      this.materialFractured = false;
      return;
    }

    this.materialFragments.forEach((fragment) => {
      this.engine.scene.remove(fragment);
      if (fragment.geometry) {
        fragment.geometry.dispose();
      }
    });

    this.materialFragments = [];
    this.materialFractured = false;
  }

  _restoreMaterialBlock() {
    if (!this.materialMesh) return;
    this.materialMesh.visible = true;
    this.materialMesh.position.set(0, -3.1, 0);
    this.materialMesh.scale.set(1, 1, 1);
  }

  _pushEvent(note, type) {
    this.lastEvent = note;
    this.events.push({ t: Number(this.timeSec.toFixed(1)), type, note });
    this.events = this.events.slice(-10);
  }

  _updateAllUI() {
    const area = areaFromDiameter(this.pistonDiameterM);
    const forceN = this.currentPressurePa * area;
    const material = this.materials[this.materialKey];
    const pressureMpa = this.currentPressurePa / 1_000_000;
    const stageDescription = this.stage === 'Crush'
      ? this.materialFractured
        ? 'Structure has failed and fragments have separated from the core block.'
        : 'Structure has failed in heavy compression without brittle cracking.'
      : this.stage === 'Yield'
        ? 'Permanent deformation is underway.'
        : 'Material is still in the elastic response range.';

    this._infoEl.innerHTML = `
      <div class="miniapp-info-grid">
        <div class="miniapp-info-big">
          <span class="miniapp-info-symbol">${material.code}</span>
          <span class="miniapp-info-mass">${this.stage}</span>
        </div>
        <div class="miniapp-info-name">${material.name}</div>
        <div class="miniapp-info-row"><span>Pressure:</span><span>${formatPressure(this.currentPressurePa, this.units)}</span></div>
        <div class="miniapp-info-row"><span>Force:</span><span>${formatForce(forceN, this.units)}</span></div>
        <div class="miniapp-info-row"><span>Piston:</span><span>${formatDiameter(this.pistonDiameterM, this.units)}</span></div>
        <div class="miniapp-info-row"><span>Efficiency:</span><span>${(this.efficiency * 100).toFixed(0)}%</span></div>
        <div class="miniapp-info-row"><span>Risk:</span><span><span class="miniapp-status-chip miniapp-status-chip--${riskClass(this.riskScore)}">${riskLabel(this.riskScore)}</span></span></div>
        <div class="miniapp-info-note">${stageDescription}</div>
        <div class="miniapp-info-note">Source note: ${material.source}</div>
      </div>
    `;

    this._actionsInfo.innerHTML = `
      <div class="miniapp-info-grid">
        <div class="miniapp-info-row"><span>Status:</span><span>${this.running ? 'Running' : 'Idle'}</span></div>
        <div class="miniapp-info-row"><span>Valve:</span><span>${Math.round(this.valveOpening * 100)}%</span></div>
        <div class="miniapp-info-row"><span>Target:</span><span>${formatPressure(this.targetPressurePa, this.units)}</span></div>
        <div class="miniapp-info-note">Latest event: ${this.lastEvent}</div>
        <div class="miniapp-info-note">Material stage at ${pressureMpa.toFixed(2)} MPa: ${this.stage}</div>
      </div>
    `;

    this._graphWindowEl.textContent = `${GRAPH_WINDOW_SEC}s window`;
    this._graphEventEl.textContent = this.lastEvent;
  }

  getState() {
    const area = areaFromDiameter(this.pistonDiameterM);
    const forceN = this.currentPressurePa * area;
    return {
      experiment: {
        material: this.materials[this.materialKey]?.name || 'Unknown',
        stage: this.stage,
        running: this.running,
      },
      primary: {
        material: this.materialKey,
        stage: this.stage,
      },
      metrics: {
        pressurePa: this.currentPressurePa,
        pressureBar: this.currentPressurePa / 100_000,
        pressureMpa: this.currentPressurePa / 1_000_000,
        forceN,
        forcekN: forceN / 1000,
        efficiency: this.efficiency,
        riskScore: this.riskScore,
        riskLabel: riskLabel(this.riskScore),
      },
      controls: {
        targetPressurePa: this.targetPressurePa,
        valveOpening: this.valveOpening,
        pistonDiameterM: this.pistonDiameterM,
        units: this.units,
      },
      status: {
        stable: this.stage !== 'Crush',
        label: this.stage,
        score: this.riskScore,
      },
      availableActions: ['start_press', 'release_pressure', 'emergency_stop', 'reset_experiment'],
      events: this.events,
      history: [],
      graph: {
        windowSec: GRAPH_WINDOW_SEC,
        latestPressurePa: this.currentPressurePa,
      },
    };
  }

  dispose() {
    if (this._themeObserver) {
      this._themeObserver.disconnect();
      this._themeObserver = null;
    }

    this._clearFractureFragments();
    if (this._sparks) this._sparks.dispose();
    if (this._gaugeTexture) this._gaugeTexture.dispose();
    this.engine.dispose();
  }
}