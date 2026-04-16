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
const NEUTRON_COLOR = 0x9ca3af;   // neutral gray
const PROTON_RADIUS  = 0.6;
const NEUTRON_RADIUS = 0.6;
const MAX_NUCLEONS   = 300;
const SPRING_K       = 4.0;      // spring stiffness toward target
const DAMPING        = 0.92;     // velocity damping
const REPULSION      = 0.3;     // inter-nucleon push to prevent overlap
const MAGIC_NUMBERS  = [2, 8, 20, 28, 50, 82, 126];

function nucleusRadiusFromCounts(z, n) {
  const total = Math.max(1, z + n);
  const nucleonRadius = PROTON_RADIUS * 1.1;
  return nucleonRadius * Math.pow(total, 1 / 3) * 1.2;
}

function randomEmissionOrigin(radius) {
  const dir = randomOnSphere(1).normalize();
  const shellFactor = randRange(0.6, 1.02); // within/surface of nucleus
  return dir.multiplyScalar(radius * shellFactor);
}

function emissionDirectionFrom(origin, spread = 0.22) {
  const out = origin.clone().normalize();
  out.add(randomOnSphere(spread)).normalize();
  return out;
}

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

  // Double beta-plus: proton-rich even-even nuclei where single beta-plus is disfavored
  if (z % 2 === 0 && n % 2 === 0 && ratio < 0.8 && z > 16 && !decayModes.includes('beta_plus')) {
    decayModes.push('double_beta_plus');
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
    case 'double_beta_plus':
      return { z: z - 2, n: n + 2, emitted: '2β⁺ (2 positrons + 2 neutrinos)' };
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
    this._recoilOffset = new THREE.Vector3();
    this._recoilVelocity = new THREE.Vector3();
    this._shakeTime = 0;
    this._shakeIntensity = 0;
  }

  /** Rebuild the nucleus for given z, n */
  build(z, n, opts = {}) {
    const { scatter = true } = opts;
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
      const startPos = scatter ? randomOnSphere(coreRadius * 2) : pos.clone();
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

    this._recoilOffset.addScaledVector(this._recoilVelocity, dt);
    this._recoilVelocity.multiplyScalar(Math.exp(-6 * dt));
    this._recoilOffset.multiplyScalar(Math.exp(-4 * dt));

    let sx = 0;
    let sy = 0;
    let sz = 0;
    if (this._shakeTime > 0) {
      this._shakeTime -= dt;
      const amp = this._shakeIntensity * Math.max(0, this._shakeTime);
      sx = randRange(-amp, amp);
      sy = randRange(-amp, amp);
      sz = randRange(-amp, amp);
    }

    const px = this._recoilOffset.x + sx;
    const py = this._recoilOffset.y + sy;
    const pz = this._recoilOffset.z + sz;
    this.protons.mesh.position.set(px, py, pz);
    this.neutrons.mesh.position.set(px, py, pz);
  }

  /** Gentle continuous rotation */
  rotate(dt) {
    const group = this.scene;
    // We rotate the particle meshes themselves
    this.protons.mesh.rotation.y += dt * 0.15;
    this.neutrons.mesh.rotation.y += dt * 0.15;
  }

  applyRecoil(emissionDir, strength = 0.9) {
    const recoil = emissionDir.clone().normalize().multiplyScalar(-strength);
    this._recoilVelocity.add(recoil);
  }

  shake(intensity = 0.35, duration = 0.4) {
    this._shakeIntensity = intensity;
    this._shakeTime = Math.max(this._shakeTime, duration);
  }
}

/* ================================================================== */
/*  Decay effect particles                                            */
/* ================================================================== */

class DecayEffects {
  constructor(scene) {
    this.scene = scene;
    this._particles = [];
    this._projectiles = [];
    this._flashes = [];
    this._trailMotes = [];
  }

  _spawnFlash(origin, color, radius = 2.2, life = 0.22) {
    const geo = new THREE.SphereGeometry(radius, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(origin);
    this.scene.add(mesh);
    this._flashes.push({ mesh, life, maxLife: life });
  }

  _spawnTrailMote(position, color, radius = 0.08, life = 0.28) {
    const geo = new THREE.SphereGeometry(radius, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    this.scene.add(mesh);
    this._trailMotes.push({ mesh, life, maxLife: life });
  }

  _spawnBurst(type, origin) {
    const colorMap = {
      alpha: 0xffd700,
      beta_minus: 0x66ccff,
      beta_plus: 0xff5f7a,
      electron_capture: 0x66ccff,
      gamma: 0xffff00,
      spontaneous_fission: 0xff4400,
      proton_emission: 0xe74c3c,
      neutron_emission: 0x9ca3af,
      double_beta_minus: 0x00ff88,
      double_beta_plus: 0xff66aa,
      cluster_decay: 0xff8800,
    };
    const color = colorMap[type] || 0xffffff;
    const count = type === 'alpha' ? 5 : type === 'spontaneous_fission' ? 16 : type === 'cluster_decay' ? 10 : 7;
    const geo = new THREE.SphereGeometry(0.12, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.position.copy(origin);
      const dir = randomOnSphere(1);
      this.scene.add(mesh);
      this._particles.push({
        mesh,
        velocity: dir.multiplyScalar(randRange(6, 16)),
        life: 0.6,
        decay: randRange(0.8, 1.5),
      });
    }
  }

  _createClusterMesh(type) {
    const group = new THREE.Group();
    if (type === 'alpha') {
      const protonMat = new THREE.MeshStandardMaterial({ color: PROTON_COLOR, emissive: PROTON_COLOR, emissiveIntensity: 0.2 });
      const neutronMat = new THREE.MeshStandardMaterial({ color: NEUTRON_COLOR, emissive: NEUTRON_COLOR, emissiveIntensity: 0.12 });
      const geo = new THREE.SphereGeometry(0.23, 14, 14);
      const offsets = [
        new THREE.Vector3(0.18, 0.08, 0.0),
        new THREE.Vector3(-0.18, -0.08, 0.0),
        new THREE.Vector3(0.08, -0.18, 0.12),
        new THREE.Vector3(-0.08, 0.18, -0.12),
      ];
      offsets.forEach((off, i) => {
        const part = new THREE.Mesh(geo, i < 2 ? protonMat : neutronMat);
        part.position.copy(off);
        group.add(part);
      });
      return group;
    }

    const clusterGeo = new THREE.SphereGeometry(0.62, 16, 16);
    const clusterMat = new THREE.MeshStandardMaterial({ color: 0xffa34d, emissive: 0xff6a00, emissiveIntensity: 0.2 });
    const mesh = new THREE.Mesh(clusterGeo, clusterMat);
    group.add(mesh);
    return group;
  }

  _fibonacciSphere(count, radius) {
    const points = [];
    const golden = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < count; i++) {
      const theta = 2 * Math.PI * i / golden;
      const phi = Math.acos(1 - 2 * (i + 0.5) / count);
      const r = radius * (0.35 + 0.65 * Math.pow((i + 1) / count, 0.33));
      points.push(new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ));
    }
    return points;
  }

  _createNucleusFragment(z, n, opts = {}) {
    const { scale = 0.58 } = opts;
    const group = new THREE.Group();
    const total = Math.max(1, z + n);
    const nucleonRadius = 0.16 * scale;
    const coreRadius = nucleonRadius * Math.pow(total, 1 / 3) * 2.4;

    const protonGeo = new THREE.SphereGeometry(nucleonRadius, 12, 12);
    const neutronGeo = new THREE.SphereGeometry(nucleonRadius, 12, 12);
    const protonMat = new THREE.MeshStandardMaterial({ color: PROTON_COLOR, emissive: PROTON_COLOR, emissiveIntensity: 0.2, roughness: 0.35 });
    const neutronMat = new THREE.MeshStandardMaterial({ color: NEUTRON_COLOR, emissive: NEUTRON_COLOR, emissiveIntensity: 0.12, roughness: 0.4 });

    const protonMesh = new THREE.InstancedMesh(protonGeo, protonMat, Math.max(1, z));
    const neutronMesh = new THREE.InstancedMesh(neutronGeo, neutronMat, Math.max(1, n));
    protonMesh.count = z;
    neutronMesh.count = n;

    const positions = this._fibonacciSphere(total, coreRadius);
    const types = Array.from({ length: total }, (_, i) => (i < z ? 'p' : 'n'));
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }

    const dummy = new THREE.Object3D();
    let pIdx = 0;
    let nIdx = 0;
    for (let i = 0; i < total; i++) {
      dummy.position.copy(positions[i]);
      dummy.updateMatrix();
      if (types[i] === 'p') protonMesh.setMatrixAt(pIdx++, dummy.matrix);
      else neutronMesh.setMatrixAt(nIdx++, dummy.matrix);
    }
    protonMesh.instanceMatrix.needsUpdate = true;
    neutronMesh.instanceMatrix.needsUpdate = true;

    group.add(protonMesh);
    group.add(neutronMesh);
    return group;
  }

  _spawnProjectile(opts) {
    const {
      mesh,
      origin,
      velocity,
      drag = 0.06,
      life = 1.2,
      trailColor = 0xffffff,
      trailSize = 0.08,
      trailRate = 0.03,
      spin = null,
      fadeOpacity = true,
    } = opts;
    mesh.position.copy(origin);
    this.scene.add(mesh);
    this._projectiles.push({
      mesh,
      velocity,
      drag,
      life,
      maxLife: life,
      trailColor,
      trailSize,
      trailRate,
      trailClock: 0,
      spin,
      fadeOpacity,
    });
  }

  _emitElectron(origin, direction, isPositron = false, speed = randRange(22, 32)) {
    const color = isPositron ? 0xff5f7a : 0x66ccff;
    const geo = new THREE.SphereGeometry(0.16, 10, 10);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    this._spawnProjectile({
      mesh,
      origin,
      velocity: direction.clone().multiplyScalar(speed),
      drag: 0.01,
      life: 1.35,
      trailColor: color,
      trailSize: 0.07,
      trailRate: 0.018,
    });
  }

  _emitNeutrino(origin, direction) {
    const geo = new THREE.SphereGeometry(0.08, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xe0f7ff,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    this._spawnProjectile({
      mesh,
      origin,
      velocity: direction.clone().multiplyScalar(randRange(30, 38)),
      drag: 0,
      life: 0.55,
      trailColor: 0xe0f7ff,
      trailSize: 0.03,
      trailRate: 0.025,
    });
  }

  _emitGammaPair(origin, axisDir) {
    const axis = axisDir.clone().normalize();
    const makeGamma = (dir) => {
      const geo = new THREE.SphereGeometry(0.1, 8, 8);
      const mat = new THREE.MeshBasicMaterial({ color: 0xfff07a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
      const mesh = new THREE.Mesh(geo, mat);
      this._spawnProjectile({
        mesh,
        origin,
        velocity: dir.multiplyScalar(randRange(30, 40)),
        drag: 0,
        life: 0.45,
        trailColor: 0xfff07a,
        trailSize: 0.035,
        trailRate: 0.014,
      });
    };
    makeGamma(axis.clone());
    makeGamma(axis.clone().multiplyScalar(-1));
  }

  _emitFissionFragments(context) {
    const { origin, result } = context;
    const secondary = result.fissionProduct;
    if (!secondary) return null;

    const a1 = result.z + result.n;
    const a2 = secondary.z + secondary.n;
    const total = Math.max(1, a1 + a2);
    const splitDir = randomOnSphere(1).normalize();

    // The parent nucleus remains as daughter A in place; only daughter B is emitted.
    const fragB = this._createNucleusFragment(secondary.z, secondary.n, { scale: 0.64 });
    fragB.position.copy(origin);
    this.scene.add(fragB);

    const speedB = randRange(6, 8) * (a1 / total);

    this._projectiles.push({
      mesh: fragB,
      velocity: splitDir.clone().multiplyScalar(speedB),
      drag: 0.03,
      life: 5,
      trailColor: 0xffdd91,
      trailSize: 0.07,
      trailRate: 0.08,
      trailClock: 0,
      spin: new THREE.Vector3(randRange(0.8, 1.6), randRange(0.8, 1.6), randRange(0.8, 1.6)),
      isFragment: true,
      fadeOpacity: false,
    });

    const freeNeutrons = Math.min(3, Math.max(2, result.fissionProduct.n > 2 ? 3 : 2));
    for (let i = 0; i < freeNeutrons; i++) {
      const nOrigin = origin.clone().add(randomOnSphere(0.8));
      const nDir = randomOnSphere(1).normalize();
      const geo = new THREE.SphereGeometry(0.16, 10, 10);
      const mat = new THREE.MeshBasicMaterial({ color: NEUTRON_COLOR, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(geo, mat);
      this._spawnProjectile({
        mesh,
        origin: nOrigin,
        velocity: nDir.multiplyScalar(randRange(14, 20)),
        drag: 0.03,
        life: 5,
        trailColor: 0xb9c0cc,
        trailSize: 0.06,
        trailRate: 0.02,
      });
    }

    return { trackFragment: fragB, direction: splitDir };
  }

  /** Mode-specific physically-inspired emissions */
  emit(type, context = {}) {
    const origin = context.origin || new THREE.Vector3();
    const recoilDirection = context.recoilDirection || emissionDirectionFrom(origin);

    this._spawnFlash(origin, type === 'spontaneous_fission' ? 0xff9d43 : 0xffdd88, type === 'spontaneous_fission' ? 3.4 : 2.0, 0.18);
    this._spawnBurst(type, origin);

    if (type === 'alpha') {
      const alphaMesh = this._createClusterMesh('alpha');
      this._spawnProjectile({
        mesh: alphaMesh,
        origin,
        velocity: recoilDirection.clone().multiplyScalar(randRange(8, 11)),
        drag: 0.22,
        life: 1.35,
        trailColor: 0xffd470,
        trailSize: 0.09,
        trailRate: 0.03,
        spin: new THREE.Vector3(0.8, 0.9, 0.7),
      });
      return { recoilDirection, recoilStrength: 1.2 };
    }

    if (type === 'beta_minus') {
      this._emitElectron(origin, recoilDirection, false);
      this._emitNeutrino(origin, emissionDirectionFrom(origin, 0.34));
      return { recoilDirection, recoilStrength: 0.55 };
    }

    if (type === 'beta_plus') {
      this._emitElectron(origin, recoilDirection, true);
      this._emitNeutrino(origin, emissionDirectionFrom(origin, 0.34));

      if (Math.random() < 0.38) {
        const annihilationPoint = origin.clone().add(recoilDirection.clone().multiplyScalar(randRange(7, 11)));
        setTimeout(() => {
          this._spawnFlash(annihilationPoint, 0xffb3c1, 1.6, 0.14);
          this._emitGammaPair(annihilationPoint, randomOnSphere(1));
        }, randRange(180, 340));
      }
      return { recoilDirection, recoilStrength: 0.55 };
    }

    if (type === 'double_beta_minus' || type === 'double_beta_plus') {
      const positron = type === 'double_beta_plus';
      const o1 = origin.clone().add(randomOnSphere(0.28));
      const o2 = origin.clone().add(randomOnSphere(0.28));
      const d1 = emissionDirectionFrom(o1, 0.2);
      const d2 = emissionDirectionFrom(o2, 0.2);
      this._emitElectron(o1, d1, positron, randRange(21, 30));
      this._emitElectron(o2, d2, positron, randRange(21, 30));
      this._emitNeutrino(o1, emissionDirectionFrom(o1, 0.32));
      this._emitNeutrino(o2, emissionDirectionFrom(o2, 0.32));
      return { recoilDirection, recoilStrength: 0.75 };
    }

    if (type === 'cluster_decay') {
      const emittedZ = Math.max(1, (context.z ?? 0) - (context.result?.z ?? 0));
      const emittedN = Math.max(0, (context.n ?? 0) - (context.result?.n ?? 0));
      const clusterMesh = this._createNucleusFragment(emittedZ, emittedN, { scale: 0.7 });
      this._spawnProjectile({
        mesh: clusterMesh,
        origin,
        velocity: recoilDirection.clone().multiplyScalar(randRange(7, 9.5)),
        drag: 0.04,
        life: 5,
        trailColor: 0xff9f4d,
        trailSize: 0.07,
        trailRate: 0.08,
        spin: new THREE.Vector3(0.5, 0.8, 0.6),
        fadeOpacity: false,
      });
      return { recoilDirection, recoilStrength: 1.05 };
    }

    if (type === 'spontaneous_fission') {
      const fissionMeta = this._emitFissionFragments({ ...context, origin });
      return {
        recoilDirection,
        recoilStrength: 1.3,
        cameraTrack: fissionMeta ? fissionMeta.trackFragment : null,
      };
    }

    if (type === 'proton_emission' || type === 'neutron_emission') {
      const isProton = type === 'proton_emission';
      const geo = new THREE.SphereGeometry(0.2, 12, 12);
      const color = isProton ? PROTON_COLOR : NEUTRON_COLOR;
      const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 });
      const mesh = new THREE.Mesh(geo, mat);
      this._spawnProjectile({
        mesh,
        origin,
        velocity: recoilDirection.clone().multiplyScalar(randRange(11, 16)),
        drag: 0.09,
        life: 1.15,
        trailColor: color,
        trailSize: 0.07,
        trailRate: 0.022,
      });
      return { recoilDirection, recoilStrength: 0.7 };
    }

    if (type === 'gamma' || type === 'electron_capture') {
      this._emitGammaPair(origin, recoilDirection);
      return { recoilDirection, recoilStrength: 0.3 };
    }

    return { recoilDirection, recoilStrength: 0.5 };
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

    for (let i = this._projectiles.length - 1; i >= 0; i--) {
      const p = this._projectiles[i];
      p.velocity.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      p.mesh.position.addScaledVector(p.velocity, dt);
      if (p.spin) {
        p.mesh.rotation.x += p.spin.x * dt;
        p.mesh.rotation.y += p.spin.y * dt;
        p.mesh.rotation.z += p.spin.z * dt;
      }

      p.trailClock += dt;
      if (p.trailClock >= p.trailRate) {
        p.trailClock = 0;
        this._spawnTrailMote(p.mesh.position, p.trailColor, p.trailSize, p.isFragment ? 0.4 : 0.24);
      }

      p.life -= dt;
      if (p.fadeOpacity && p.mesh.material && p.mesh.material.opacity !== undefined) {
        p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);
      }
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        });
        this._projectiles.splice(i, 1);
      }
    }

    for (let i = this._flashes.length - 1; i >= 0; i--) {
      const f = this._flashes[i];
      f.life -= dt;
      const t = Math.max(0, f.life / f.maxLife);
      f.mesh.material.opacity = 0.55 * t;
      f.mesh.scale.setScalar(1 + (1 - t) * 0.8);
      if (f.life <= 0) {
        this.scene.remove(f.mesh);
        f.mesh.geometry.dispose();
        f.mesh.material.dispose();
        this._flashes.splice(i, 1);
      }
    }

    for (let i = this._trailMotes.length - 1; i >= 0; i--) {
      const t = this._trailMotes[i];
      t.life -= dt;
      t.mesh.material.opacity = Math.max(0, 0.8 * (t.life / t.maxLife));
      t.mesh.scale.setScalar(0.85 + (1 - (t.life / t.maxLife)) * 1.5);
      if (t.life <= 0) {
        this.scene.remove(t.mesh);
        t.mesh.geometry.dispose();
        t.mesh.material.dispose();
        this._trailMotes.splice(i, 1);
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
    this._cameraTween = null;
    this._cameraTrack = null;
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
      this._tickCamera(dt);
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
      this._rebuildAndUpdate(false);
    });

    this._nDisplay = panel.addDisplay('n-val', '');
    this._nSlider = panel.addSlider('Neutrons (N)', minNeutronsForZ(this.z), maxNeutronsForZ(this.z), this.n, (v) => {
      this.n = v;
      this._rebuildAndUpdate(false);
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
    this._rebuildAndUpdate(false);
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

    const nucleusRadius = nucleusRadiusFromCounts(this.z, this.n);
    const origin = randomEmissionOrigin(nucleusRadius);
    const recoilDirection = emissionDirectionFrom(origin, 0.18);

    if (mode === 'spontaneous_fission') {
      this.nucleus.shake(0.55, 0.42);
      const fx = this.effects.emit(mode, {
        origin,
        recoilDirection,
        nucleusRadius,
        z: this.z,
        n: this.n,
        result,
      });
      if (fx?.recoilDirection) this.nucleus.applyRecoil(fx.recoilDirection, fx.recoilStrength || 1.1);
      if (fx?.cameraTrack) this._trackCameraTarget(fx.cameraTrack, 1.6, 24);

      setTimeout(() => {
        this.z = result.z;
        this.n = result.n;
        this._zSlider.setValue(this.z);
        this._clampNeutrons();
        this._nSlider.setValue(this.n);
        this._rebuildAndUpdate(false);
      }, 420);
      return;
    }

    const fx = this.effects.emit(mode, {
      origin,
      recoilDirection,
      nucleusRadius,
      z: this.z,
      n: this.n,
      result,
    });
    if (fx?.recoilDirection) this.nucleus.applyRecoil(fx.recoilDirection, fx.recoilStrength || 0.7);

    this.z = result.z;
    this.n = result.n;
    this._zSlider.setValue(this.z);
    this._clampNeutrons();
    this._nSlider.setValue(this.n);
    this._rebuildAndUpdate(false);
  }

  _focusCamera(target, distance = 28, duration = 1.0) {
    const camera = this.engine.camera;
    const controls = this.engine.controls;
    const currentTarget = controls ? controls.target.clone() : new THREE.Vector3();
    const viewDir = camera.position.clone().sub(currentTarget).normalize();
    const destination = target.clone().addScaledVector(viewDir, distance);

    this._cameraTween = {
      t: 0,
      duration,
      fromPos: camera.position.clone(),
      toPos: destination,
      fromTarget: currentTarget,
      toTarget: target.clone(),
    };
  }

  _trackCameraTarget(object3D, duration = 1.4, distance = 24) {
    this._cameraTrack = { object3D, duration, distance, elapsed: 0 };
  }

  _tickCamera(dt) {
    const camera = this.engine.camera;
    const controls = this.engine.controls;

    if (this._cameraTrack) {
      this._cameraTrack.elapsed += dt;
      const target = this._cameraTrack.object3D.position.clone();
      const currentTarget = controls ? controls.target : new THREE.Vector3();
      const viewDir = camera.position.clone().sub(currentTarget).normalize();
      const desiredPos = target.clone().addScaledVector(viewDir, this._cameraTrack.distance);

      camera.position.lerp(desiredPos, 1 - Math.exp(-4 * dt));
      if (controls) controls.target.lerp(target, 1 - Math.exp(-5 * dt));

      if (this._cameraTrack.elapsed >= this._cameraTrack.duration) {
        this._cameraTrack = null;
      }
    }

    if (!this._cameraTween) return;

    this._cameraTween.t += dt / this._cameraTween.duration;
    const k = clamp(this._cameraTween.t, 0, 1);
    const eased = 1 - Math.pow(1 - k, 3);
    camera.position.lerpVectors(this._cameraTween.fromPos, this._cameraTween.toPos, eased);
    if (controls) controls.target.lerpVectors(this._cameraTween.fromTarget, this._cameraTween.toTarget, eased);

    if (k >= 1) this._cameraTween = null;
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

  _rebuildAndUpdate(scatter = true) {
    this.nucleus.build(this.z, this.n, { scatter });
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
        double_beta_plus: '2β⁺ Double Beta+',
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
