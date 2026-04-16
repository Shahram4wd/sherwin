/**
 * Nuclear Decay Simulation — Sherwin Universe Lab
 *
 * 3D interactive nucleus builder with:
 *   - Proton / neutron construction via control panel
 *   - Real-time stability evaluation
 *   - Decay chain simulation (alpha, beta±, EC, gamma)
 *   - 3D instanced-mesh nucleus with spring physics
 *   - Decay chain history timeline
 *   - Preset famous isotopes quick-load
 *
 * Uses the shared engine.js SceneManager + ParticlePool.
 * Data comes from /static/data/isotopes.json.
 */

import {
  THREE,
  SceneManager,
  ParticlePool,
  UIPanel,
  formatHalfLife,
  stabilityColor,
  randomOnSphere,
  clamp,
  lerp,
  randRange,
} from './engine.js';

/* ================================================================== */
/*  Constants                                                         */
/* ================================================================== */

const PROTON_COLOR  = 0xe74c3c;   // red
const NEUTRON_COLOR = 0x3498db;   // blue
const PROTON_RADIUS  = 0.6;
const NEUTRON_RADIUS = 0.6;
const MAX_NUCLEONS   = 300;
const SPRING_K       = 4.0;      // spring stiffness toward target
const DAMPING        = 0.92;     // velocity damping
const REPULSION      = 0.3;     // inter-nucleon push to prevent overlap
const MAGIC_NUMBERS  = [2, 8, 20, 28, 50, 82, 126];

/**
 * Approximate maximum neutron count for a given Z.
 * Based on the neutron drip line / heaviest known isotopes.
 */
function maxNeutronsForZ(z) {
  if (z <= 0) return 0;
  if (z === 1) return 4;    // up to H-5
  if (z === 2) return 6;    // up to He-8
  if (z <= 8) return z + 6;
  if (z <= 20) return Math.round(z * 1.6 + 4);
  if (z <= 50) return Math.round(z * 1.6 + 8);
  if (z <= 82) return Math.round(z * 1.55 + 12);
  return Math.round(z * 1.6 + 10);  // superheavy
}

/**
 * Approximate minimum neutron count for a given Z.
 * Based on the proton drip line / lightest known isotopes.
 */
function minNeutronsForZ(z) {
  if (z <= 1) return 0;     // bare proton is fine
  if (z === 2) return 1;    // He-3
  if (z <= 8) return z - 1;
  if (z <= 20) return z;
  if (z <= 50) return Math.round(z * 1.1);
  if (z <= 82) return Math.round(z * 1.2);
  return Math.round(z * 1.35);  // superheavy
}

/* ================================================================== */
/*  Physics / data helpers                                            */
/* ================================================================== */

let isotopeDB = null;
let elementNames = {};
let elementSymbols = {};

async function loadIsotopeData() {
  const resp = await fetch('/static/data/isotopes.json');
  const data = await resp.json();
  isotopeDB = data.isotopes;
  elementNames = data.elements;
  elementSymbols = data.elementSymbols;
  return data;
}

function lookupIsotope(z, n) {
  const key = `${z}_${n}`;
  return isotopeDB ? isotopeDB[key] : null;
}

function getElementName(z) {
  return elementNames[String(z)] || `Element ${z}`;
}

function getElementSymbol(z) {
  return elementSymbols[String(z)] || '?';
}

/** Heuristic stability when isotope not in dataset */
function evaluateStability(z, n) {
  const a = z + n;
  if (z === 0 || n === 0 && z > 1) return { stable: false, halfLife: 0.001, decayModes: ['beta_minus'], heuristic: true };

  // Check dataset first
  const record = lookupIsotope(z, n);
  if (record) {
    return {
      stable: record.stable,
      halfLife: record.halfLife,
      decayModes: record.decayModes,
      heuristic: false,
      note: record.note,
    };
  }

  // Heuristic model
  const ratio = z > 0 ? n / z : 0;
  const isMagicZ = MAGIC_NUMBERS.includes(z);
  const isMagicN = MAGIC_NUMBERS.includes(n);
  const isDoubleMagic = isMagicZ && isMagicN;

  let score = 100; // start at "stable"

  // N/Z ratio check
  if (z <= 20) {
    // Light nuclei: ratio should be ~1
    const idealRatio = 1.0;
    score -= Math.abs(ratio - idealRatio) * 80;
  } else {
    // Heavy nuclei: ratio grows ~1.5
    const idealRatio = 1.0 + 0.015 * z;
    score -= Math.abs(ratio - idealRatio) * 40;
  }

  // Even-even bonus
  if (z % 2 === 0 && n % 2 === 0) score += 10;
  // Odd-odd penalty
  if (z % 2 === 1 && n % 2 === 1) score -= 15;

  // Magic number bonus
  if (isMagicZ) score += 15;
  if (isMagicN) score += 15;
  if (isDoubleMagic) score += 20;

  // Too heavy
  if (z > 82) score -= (z - 82) * 3;
  if (z > 118) score = -50;

  // Determine decay modes
  const decayModes = [];
  if (ratio > 1.5 && z > 5) decayModes.push('beta_minus');
  if (ratio < 0.9 && z > 5) decayModes.push('beta_plus');
  if (ratio < 1.0 && z > 20) decayModes.push('electron_capture');
  if (z > 60 && a > 150) decayModes.push('alpha');

  // Spontaneous fission: very heavy nuclei (Z >= 90, A >= 230)
  if (z >= 90 && a >= 230) decayModes.push('spontaneous_fission');

  // Proton emission: very proton-rich light/medium nuclei
  if (ratio < 0.7 && z > 3 && z <= 80) decayModes.push('proton_emission');

  // Neutron emission: extremely neutron-rich nuclei
  if (ratio > 2.0 && z > 2) decayModes.push('neutron_emission');

  // Double beta-minus: even-even nuclei where single beta is energetically forbidden
  if (z % 2 === 0 && n % 2 === 0 && ratio > 1.3 && z > 20 && !decayModes.includes('beta_minus')) {
    decayModes.push('double_beta_minus');
  }

  // Cluster decay: very heavy nuclei (Z >= 87), emits C-14 or similar
  if (z >= 87 && a >= 220 && z <= 96) decayModes.push('cluster_decay');

  if (decayModes.length > 0) decayModes.push('gamma');
  if (score > 50 && decayModes.length === 0 && z <= 82) {
    return { stable: true, halfLife: -1, decayModes: [], heuristic: true };
  }

  if (decayModes.length === 0) decayModes.push('alpha');

  // Map score to half-life
  let halfLife;
  if (score > 80) halfLife = 1e15;
  else if (score > 50) halfLife = 1e10;
  else if (score > 20) halfLife = 1e5;
  else if (score > 0) halfLife = 100;
  else halfLife = 0.01;

  return { stable: false, halfLife, decayModes, heuristic: true };
}

/** Apply a decay and return {z, n, emitted} */
function applyDecay(z, n, mode) {
  switch (mode) {
    case 'alpha':
      return { z: z - 2, n: n - 2, emitted: 'α (He-4 nucleus)' };
    case 'beta_minus':
      return { z: z + 1, n: n - 1, emitted: 'β⁻ (electron + antineutrino)' };
    case 'beta_plus':
      return { z: z - 1, n: n + 1, emitted: 'β⁺ (positron + neutrino)' };
    case 'electron_capture':
      return { z: z - 1, n: n + 1, emitted: 'EC (neutrino)' };
    case 'gamma':
      return { z, n, emitted: 'γ (photon)' };
    case 'spontaneous_fission': {
      // Split roughly in half, with some randomness
      const z1 = Math.round(z * (0.38 + Math.random() * 0.14));
      const n1 = Math.round(n * (0.38 + Math.random() * 0.14));
      const z2 = z - z1;
      const n2 = n - n1;
      const freeN = Math.floor(Math.random() * 3) + 1; // 1-3 free neutrons
      return {
        z: z1, n: Math.max(0, n1 - freeN),
        emitted: `Fission → ${getElementSymbol(z1)}-${z1 + n1 - freeN} + ${getElementSymbol(z2)}-${z2 + n2} + ${freeN}n`,
        fissionProduct: { z: z2, n: n2 },
      };
    }
    case 'proton_emission':
      return { z: z - 1, n, emitted: 'p (proton)' };
    case 'neutron_emission':
      return { z, n: n - 1, emitted: 'n (neutron)' };
    case 'double_beta_minus':
      return { z: z + 2, n: n - 2, emitted: '2β⁻ (2 electrons + 2 antineutrinos)' };
    case 'cluster_decay': {
      // Emits C-14 (most common cluster emission)
      return { z: z - 6, n: n - 8, emitted: '¹⁴C (carbon-14 cluster)' };
    }
    default:
      return { z, n, emitted: '?' };
  }
}

/* ================================================================== */
/*  Nucleus 3D visualisation                                          */
/* ================================================================== */

class Nucleus3D {
  constructor(scene) {
    this.scene = scene;
    this.protons = new ParticlePool(scene, MAX_NUCLEONS, PROTON_RADIUS, PROTON_COLOR, { emissive: true });
    this.neutrons = new ParticlePool(scene, MAX_NUCLEONS, NEUTRON_RADIUS, NEUTRON_COLOR, { emissive: true });
    this._targets = []; // target positions for spring physics
    this._velocities = [];
    this._types = []; // 'p' or 'n'
    this.z = 0;
    this.n = 0;
  }

  /** Rebuild the nucleus for given z, n */
  build(z, n) {
    this.protons.clear();
    this.neutrons.clear();
    this._targets = [];
    this._velocities = [];
    this._types = [];
    this.z = z;
    this.n = n;

    const total = z + n;
    if (total === 0) return;

    // Arrange particles in a roughly spherical shell packing
    const nucleonRadius = PROTON_RADIUS * 1.1;
    const coreRadius = nucleonRadius * Math.pow(total, 1 / 3) * 1.2;

    // Generate positions using Fibonacci sphere
    const positions = this._fibonacciSphere(total, coreRadius);

    // Build a type array and shuffle it so protons/neutrons are randomly interleaved
    const types = Array.from({ length: total }, (_, i) => (i < z ? 'p' : 'n'));
    // Fisher-Yates shuffle
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }

    for (let i = 0; i < total; i++) {
      const pos = positions[i];
      const startPos = randomOnSphere(coreRadius * 2); // start scattered
      const isProton = types[i] === 'p';

      if (isProton) {
        this.protons.add(startPos.x, startPos.y, startPos.z);
      } else {
        this.neutrons.add(startPos.x, startPos.y, startPos.z);
      }

      this._targets.push(pos.clone());
      this._velocities.push(new THREE.Vector3());
      this._types.push(types[i]);
    }
  }

  /** Fibonacci sphere packing for even distribution */
  _fibonacciSphere(count, radius) {
    const points = [];
    const golden = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < count; i++) {
      const theta = 2 * Math.PI * i / golden;
      const phi = Math.acos(1 - 2 * (i + 0.5) / count);
      // Vary radius slightly for layered look
      const r = radius * (0.3 + 0.7 * Math.pow((i + 1) / count, 0.33));
      points.push(new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ));
    }
    return points;
  }

  /** Spring physics tick: particles animate toward target positions */
  tick(dt) {
    const total = this.z + this.n;
    let pIdx = 0;
    let nIdx = 0;

    for (let i = 0; i < total; i++) {
      const pool = this._types[i] === 'p' ? this.protons : this.neutrons;
      const idx = this._types[i] === 'p' ? pIdx++ : nIdx++;
      const pos = pool.getPosition(idx);
      if (!pos) continue;
      const target = this._targets[i];
      const vel = this._velocities[i];

      // Spring force toward target
      vel.x += (target.x - pos.x) * SPRING_K * dt;
      vel.y += (target.y - pos.y) * SPRING_K * dt;
      vel.z += (target.z - pos.z) * SPRING_K * dt;

      // Damping
      vel.multiplyScalar(DAMPING);

      // Move
      pos.addScaledVector(vel, dt);
      pool.setPosition(idx, pos.x, pos.y, pos.z);
    }

    this.protons.mesh.instanceMatrix.needsUpdate = true;
    this.neutrons.mesh.instanceMatrix.needsUpdate = true;
  }

  /** Gentle continuous rotation */
  rotate(dt) {
    const group = this.scene;
    // We rotate the particle meshes themselves
    this.protons.mesh.rotation.y += dt * 0.15;
    this.neutrons.mesh.rotation.y += dt * 0.15;
  }
}

/* ================================================================== */
/*  Decay effect particles                                            */
/* ================================================================== */

class DecayEffects {
  constructor(scene) {
    this.scene = scene;
    this._particles = [];
  }

  /** Burst of particles flying outward */
  emit(type, origin = new THREE.Vector3()) {
    const colorMap = {
      alpha: 0xffd700,
      beta_minus: 0x00ffcc,
      beta_plus: 0xff66ff,
      electron_capture: 0x66ccff,
      gamma: 0xffff00,
      spontaneous_fission: 0xff4400,
      proton_emission: 0xe74c3c,
      neutron_emission: 0x3498db,
      double_beta_minus: 0x00ff88,
      cluster_decay: 0xff8800,
    };
    const color = colorMap[type] || 0xffffff;
    const count = type === 'alpha' ? 4 : type === 'spontaneous_fission' ? 20 : type === 'cluster_decay' ? 14 : 8;
    const geo = new THREE.SphereGeometry(0.2, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.position.copy(origin);
      const dir = randomOnSphere(1);
      this.scene.add(mesh);
      this._particles.push({
        mesh,
        velocity: dir.multiplyScalar(randRange(8, 20)),
        life: 1.0,
        decay: randRange(0.8, 1.5),
      });
    }
  }

  tick(dt) {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.life -= dt * p.decay;
      p.mesh.material.opacity = Math.max(0, p.life);
      p.mesh.scale.setScalar(0.5 + (1 - p.life) * 2);
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this._particles.splice(i, 1);
      }
    }
  }
}

/* ================================================================== */
/*  Main App class                                                    */
/* ================================================================== */

export class NuclearDecayApp {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(`Container #${containerId} not found`);

    this.z = 6;  // Start with Carbon-12
    this.n = 6;
    this.decayHistory = [];
    this.autoDecay = false;
    this._autoDecayTimer = null;
  }

  async init() {
    await loadIsotopeData();

    // Three.js scene
    this.engine = new SceneManager(this.container, {
      background: '#080810',
      orbit: true,
    });

    this.nucleus = new Nucleus3D(this.engine.scene);
    this.effects = new DecayEffects(this.engine.scene);

    // Build UI
    this._buildControls();
    this._buildInfoPanel();
    this._buildDecayPanel();
    this._buildHistoryPanel();
    this._buildPresetsPanel();

    // Initial build
    this.nucleus.build(this.z, this.n);
    this._updateAllUI();

    // Render loop
    this.engine.onTick((dt) => {
      this.nucleus.tick(dt);
      this.nucleus.rotate(dt);
      this.effects.tick(dt);
    });
    this.engine.start();
  }

  /* ---- UI builders ----------------------------------------------- */

  _buildControls() {
    const panel = new UIPanel(this.container, 'top-left');
    panel.addHTML('<div class="miniapp-title">⚛ Nucleus Builder</div>');

    this._zDisplay = panel.addDisplay('z-val', '');
    this._zSlider = panel.addSlider('Protons (Z)', 1, 118, this.z, (v) => {
      this.z = clamp(v, 1, 118);
      this._clampNeutrons();
      this._rebuildAndUpdate();
    });

    this._nDisplay = panel.addDisplay('n-val', '');
    this._nSlider = panel.addSlider('Neutrons (N)', minNeutronsForZ(this.z), maxNeutronsForZ(this.z), this.n, (v) => {
      this.n = v;
      this._rebuildAndUpdate();
    });

    panel.addButton('+ Proton', () => this._addProton(), 'miniapp-btn--proton');
    panel.addButton('+ Neutron', () => this._addNeutron(), 'miniapp-btn--neutron');
    panel.addButton('Reset', () => this._reset(), 'miniapp-btn--reset');
  }

  _buildInfoPanel() {
    const panel = new UIPanel(this.container, 'top-right');
    this._infoEl = panel.addDisplay('nucleus-info', '');
  }

  _buildDecayPanel() {
    const panel = new UIPanel(this.container, 'bottom-left');
    panel.addHTML('<div class="miniapp-subtitle">Decay Controls</div>');
    this._decayBtnsEl = panel.addDisplay('decay-buttons', '');

    const autoDiv = document.createElement('div');
    autoDiv.className = 'miniapp-auto-decay';
    autoDiv.innerHTML = `
      <label class="miniapp-checkbox">
        <input type="checkbox" id="auto-decay-toggle">
        <span>Auto-Decay Chain</span>
      </label>
    `;
    panel.el.appendChild(autoDiv);
    autoDiv.querySelector('#auto-decay-toggle').addEventListener('change', (e) => {
      this.autoDecay = e.target.checked;
      if (this.autoDecay) this._runAutoDecay();
    });
  }

  _buildHistoryPanel() {
    const panel = new UIPanel(this.container, 'bottom-right');
    panel.addHTML('<div class="miniapp-subtitle">Decay Chain</div>');
    this._historyEl = panel.addDisplay('decay-history', '<span class="text-gray-500 text-xs">No decays yet</span>');
  }

  _buildPresetsPanel() {
    // Floating preset bar at top center
    const bar = document.createElement('div');
    bar.className = 'miniapp-presets';
    bar.innerHTML = '<span class="miniapp-presets-label">Presets:</span>';
    const presets = [
      { label: 'C-12', z: 6, n: 6 },
      { label: 'C-14', z: 6, n: 8 },
      { label: 'Fe-56', z: 26, n: 30 },
      { label: 'Co-60', z: 27, n: 33 },
      { label: 'I-131', z: 53, n: 78 },
      { label: 'U-235', z: 92, n: 143 },
      { label: 'U-238', z: 92, n: 146 },
      { label: 'Pu-239', z: 94, n: 145 },
      { label: 'Cf-251', z: 98, n: 153 },
      { label: 'Fl-289', z: 114, n: 175 },
      { label: 'Og-294', z: 118, n: 176 },
    ];
    for (const p of presets) {
      const btn = document.createElement('button');
      btn.textContent = p.label;
      btn.className = 'miniapp-preset-btn';
      btn.addEventListener('click', () => this._loadPreset(p.z, p.n));
      bar.appendChild(btn);
    }
    this.container.appendChild(bar);
  }

  /* ---- Actions --------------------------------------------------- */

  _addProton() {
    if (this.z >= 118) return;
    this.z++;
    this._zSlider.setValue(this.z);
    this._clampNeutrons();
    this._rebuildAndUpdate();
  }

  _addNeutron() {
    const maxN = maxNeutronsForZ(this.z);
    if (this.n >= maxN) return;
    this.n++;
    this._nSlider.setValue(this.n);
    this._rebuildAndUpdate();
  }

  /** Update neutron slider min/max based on current Z, clamp N if needed */
  _clampNeutrons() {
    const minN = minNeutronsForZ(this.z);
    const maxN = maxNeutronsForZ(this.z);
    this._nSlider.min = minN;
    this._nSlider.max = maxN;
    if (this.n < minN) {
      this.n = minN;
      this._nSlider.setValue(this.n);
    } else if (this.n > maxN) {
      this.n = maxN;
      this._nSlider.setValue(this.n);
    }
  }

  _reset() {
    this.z = 6;
    this.n = 6;
    this._zSlider.setValue(this.z);
    this._clampNeutrons();
    this._nSlider.setValue(this.n);
    this.decayHistory = [];
    this.autoDecay = false;
    const cb = document.getElementById('auto-decay-toggle');
    if (cb) cb.checked = false;
    this._rebuildAndUpdate();
  }

  _loadPreset(z, n) {
    this.z = z;
    this.n = n;
    this._zSlider.setValue(z);
    this._nSlider.max = maxNeutronsForZ(z);
    this._nSlider.setValue(n);
    this.decayHistory = [];
    this._rebuildAndUpdate();
  }

  _triggerDecay(mode) {
    const result = applyDecay(this.z, this.n, mode);
    if (result.z < 1 || result.n < 0) return;

    const oldSymbol = getElementSymbol(this.z);
    const oldA = this.z + this.n;

    this.decayHistory.push({
      from: `${oldSymbol}-${oldA}`,
      to: `${getElementSymbol(result.z)}-${result.z + result.n}`,
      mode,
      emitted: result.emitted,
    });

    // Visual effect
    this.effects.emit(mode);

    this.z = result.z;
    this.n = result.n;
    this._zSlider.setValue(this.z);
    this._clampNeutrons();
    this._nSlider.setValue(this.n);
    this._rebuildAndUpdate();
  }

  _runAutoDecay() {
    if (!this.autoDecay) return;
    const info = evaluateStability(this.z, this.n);
    if (info.stable || info.decayModes.length === 0) {
      this.autoDecay = false;
      const cb = document.getElementById('auto-decay-toggle');
      if (cb) cb.checked = false;
      return;
    }
    const mode = info.decayModes[0];
    setTimeout(() => {
      if (!this.autoDecay) return;
      this._triggerDecay(mode);
      this._runAutoDecay();
    }, 1200);
  }

  _rebuildAndUpdate() {
    this.nucleus.build(this.z, this.n);
    this._updateAllUI();
  }

  /* ---- UI updates ------------------------------------------------ */

  _updateAllUI() {
    const info = evaluateStability(this.z, this.n);
    const a = this.z + this.n;
    const name = getElementName(this.z);
    const symbol = getElementSymbol(this.z);
    const sColor = stabilityColor(info.halfLife);

    // Info panel
    this._infoEl.innerHTML = `
      <div class="miniapp-info-grid">
        <div class="miniapp-info-big">
          <span class="miniapp-info-symbol">${symbol}</span>
          <span class="miniapp-info-mass">${a}</span>
        </div>
        <div class="miniapp-info-name">${name}</div>
        <div class="miniapp-info-row"><span>Z (Protons):</span><span class="text-red-400">${this.z}</span></div>
        <div class="miniapp-info-row"><span>N (Neutrons):</span><span class="text-blue-400">${this.n}</span></div>
        <div class="miniapp-info-row"><span>A (Mass):</span><span>${a}</span></div>
        <div class="miniapp-info-row"><span>N/Z Ratio:</span><span>${this.z > 0 ? (this.n / this.z).toFixed(3) : '—'}</span></div>
        <div class="miniapp-info-row">
          <span>Stability:</span>
          <span style="color:${sColor};font-weight:600">${info.stable ? '● Stable' : '◌ Unstable'}</span>
        </div>
        <div class="miniapp-info-row"><span>Half-life:</span><span>${formatHalfLife(info.halfLife)}</span></div>
        ${info.note ? `<div class="miniapp-info-note">${info.note}</div>` : ''}
        ${info.heuristic ? '<div class="miniapp-info-note miniapp-info-heuristic">Estimated (heuristic model)</div>' : ''}
        ${this._magicBadges()}
      </div>
    `;

    // Z / N displays
    this._zDisplay.innerHTML = `<span class="text-red-400">Z = ${this.z}</span>`;
    this._nDisplay.innerHTML = `<span class="text-blue-400">N = ${this.n}</span>`;

    // Decay buttons
    if (info.stable || info.decayModes.length === 0) {
      this._decayBtnsEl.innerHTML = '<span class="text-green-400 text-sm">✓ Nucleus is stable — no decay available</span>';
    } else {
      const labels = {
        alpha: 'α Alpha',
        beta_minus: 'β⁻ Beta-minus',
        beta_plus: 'β⁺ Beta-plus',
        electron_capture: 'EC Capture',
        gamma: 'γ Gamma',
        spontaneous_fission: '💥 Fission',
        proton_emission: 'p Proton',
        neutron_emission: 'n Neutron',
        double_beta_minus: '2β⁻ Double Beta',
        cluster_decay: '☢ Cluster',
      };
      this._decayBtnsEl.innerHTML = info.decayModes
        .map((m) => `<button class="miniapp-btn miniapp-btn--decay miniapp-btn--${m}" data-mode="${m}">${labels[m] || m}</button>`)
        .join('');
      this._decayBtnsEl.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => this._triggerDecay(btn.dataset.mode));
      });
    }

    // History
    if (this.decayHistory.length > 0) {
      this._historyEl.innerHTML = this.decayHistory
        .map((h, i) => `<div class="miniapp-history-step"><span class="miniapp-history-idx">${i + 1}.</span>${h.from} → ${h.to} <span class="miniapp-history-mode">${h.mode}</span></div>`)
        .join('');
      this._historyEl.scrollTop = this._historyEl.scrollHeight;
    } else {
      this._historyEl.innerHTML = '<span class="text-gray-500 text-xs">No decays yet</span>';
    }

    // Dispatch custom event for AI assistant context
    this.container.dispatchEvent(new CustomEvent('nucleus-state-changed', {
      bubbles: true,
      detail: { z: this.z, n: this.n, a, symbol, name, stability: info, history: this.decayHistory },
    }));
  }

  _magicBadges() {
    const badges = [];
    if (MAGIC_NUMBERS.includes(this.z)) badges.push(`<span class="miniapp-badge miniapp-badge--magic">Magic Z=${this.z}</span>`);
    if (MAGIC_NUMBERS.includes(this.n)) badges.push(`<span class="miniapp-badge miniapp-badge--magic">Magic N=${this.n}</span>`);
    if (MAGIC_NUMBERS.includes(this.z) && MAGIC_NUMBERS.includes(this.n)) {
      badges.push(`<span class="miniapp-badge miniapp-badge--double">Double Magic!</span>`);
    }
    return badges.length ? `<div class="miniapp-badges">${badges.join('')}</div>` : '';
  }

  /** Public method: get current state for AI assistant context */
  getState() {
    const info = evaluateStability(this.z, this.n);
    const a = this.z + this.n;
    const record = lookupIsotope(this.z, this.n);
    const magicZ = MAGIC_NUMBERS.includes(this.z);
    const magicN = MAGIC_NUMBERS.includes(this.n);
    return {
      z: this.z,
      n: this.n,
      a,
      symbol: getElementSymbol(this.z),
      name: getElementName(this.z),
      nzRatio: this.z > 0 ? (this.n / this.z).toFixed(3) : null,
      magicZ,
      magicN,
      doubleMagic: magicZ && magicN,
      evenEven: this.z % 2 === 0 && this.n % 2 === 0,
      note: record ? record.note : null,
      stability: info,
      history: this.decayHistory,
    };
  }

  dispose() {
    this.engine.dispose();
  }
}
