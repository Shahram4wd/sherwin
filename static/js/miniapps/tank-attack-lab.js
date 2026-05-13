import {
  THREE,
  SceneManager,
  UIPanel,
  clamp,
  randRange,
} from './engine.js';

const STORAGE_KEY = 'sherwin_tank_attack_lab_scores';
const METERS_PER_UNIT = 100;
const GRAVITY = 9.81;

const TANKS = {
  m109: {
    key: 'm109',
    name: 'M109',
    role: 'Self-propelled howitzer',
    maxRangeM: 18500,
    caliberMm: 155,
    muzzleVelocity: 563,
    reloadSec: 8.2,
    health: 320,
    dispersionM: 42,
  },
  isu152: {
    key: 'isu152',
    name: 'ISU-152',
    role: 'Heavy assault gun',
    maxRangeM: 13000,
    caliberMm: 152,
    muzzleVelocity: 655,
    reloadSec: 10.5,
    health: 410,
    dispersionM: 37,
  },
  karl: {
    key: 'karl',
    name: 'Karl Gerat',
    role: 'Super-heavy siege mortar',
    maxRangeM: 11000,
    caliberMm: 600,
    muzzleVelocity: 283,
    reloadSec: 16.5,
    health: 520,
    dispersionM: 65,
  },
  kv2: {
    key: 'kv2',
    name: 'KV-2',
    role: 'Heavy breakthrough tank',
    maxRangeM: 12000,
    caliberMm: 152,
    muzzleVelocity: 436,
    reloadSec: 11.8,
    health: 450,
    dispersionM: 46,
  },
};

const SHELLS = {
  AP: { key: 'AP', label: 'AP', drag: 0.93 },
  HE: { key: 'HE', label: 'HE', drag: 0.88 },
  FRAG: { key: 'FRAG', label: 'Fragmentation', drag: 0.84 },
};

const TARGET_TYPES = {
  armored: {
    key: 'armored',
    label: 'Armored Dome',
    caliberMm: 150,
    hp: 520,
    fireDamage: 24,
    fireReloadSec: 6.8,
    hitRadiusM: 58,
    score: 140,
    meshColor: 0x64748b,
  },
  large: {
    key: 'large',
    label: 'Large Dome',
    caliberMm: 300,
    hp: 860,
    fireDamage: 44,
    fireReloadSec: 10.4,
    hitRadiusM: 85,
    score: 230,
    meshColor: 0x7c2d12,
  },
  cluster: {
    key: 'cluster',
    label: 'Mini Dome Cluster',
    caliberMm: 50,
    hp: 540,
    subHp: 180,
    subCount: 3,
    fireDamage: 8,
    fireReloadSec: 4.6,
    hitRadiusM: 70,
    score: 180,
    meshColor: 0x1d4ed8,
  },
};

function toRadians(deg) {
  return deg * Math.PI / 180;
}

function toDegrees(rad) {
  return rad * 180 / Math.PI;
}

function angularDifferenceDeg(a, b) {
  const raw = Math.abs(((a - b + 540) % 360) - 180);
  return Math.min(raw, 180);
}

function metersToUnits(meters) {
  return meters / METERS_PER_UNIT;
}

function unitsToMeters(units) {
  return units * METERS_PER_UNIT;
}

function formatMeters(meters) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

function pickTargetType() {
  const roll = Math.random();
  if (roll < 0.42) return TARGET_TYPES.armored;
  if (roll < 0.7) return TARGET_TYPES.cluster;
  return TARGET_TYPES.large;
}

function shellMatchMultiplier(shellType, targetType) {
  if (shellType === 'AP') {
    if (targetType === 'armored') return 1.3;
    if (targetType === 'large') return 0.42;
    return 0.28;
  }
  if (shellType === 'HE') {
    if (targetType === 'large') return 1.3;
    if (targetType === 'armored') return 0.45;
    return 0.62;
  }
  if (shellType === 'FRAG') {
    if (targetType === 'cluster') return 1.34;
    if (targetType === 'large') return 0.4;
    return 0.24;
  }
  return 0.4;
}

function buildSelect(label, options, onChange) {
  const field = document.createElement('div');
  field.className = 'miniapp-field';

  const lbl = document.createElement('label');
  lbl.textContent = label;

  const select = document.createElement('select');
  select.className = 'miniapp-select';
  options.forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  });
  select.addEventListener('change', () => onChange(select.value));

  field.appendChild(lbl);
  field.appendChild(select);
  field.select = select;
  return field;
}

function buildNumberInput(label, min, max, step, value, onChange) {
  const field = document.createElement('div');
  field.className = 'miniapp-field';

  const lbl = document.createElement('label');
  lbl.textContent = label;

  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'miniapp-select';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.addEventListener('change', () => {
    const parsed = Number(input.value);
    if (!Number.isFinite(parsed)) return;
    const clamped = clamp(parsed, min, max);
    input.value = String(clamped);
    onChange(clamped);
  });

  field.appendChild(lbl);
  field.appendChild(input);
  field.input = input;
  return field;
}

export class TankAttackLabApp {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(`Container #${containerId} not found`);

    this.state = {
      round: 1,
      score: 0,
      shotsFired: 0,
      hits: 0,
      gameOver: false,
      roundTransition: 0,
      selectedTank: 'm109',
      selectedShell: 'AP',
      headingDeg: 0,
      elevationDeg: 35,
      selectedTargetId: null,
      rangefinderMeters: null,
      tankHealth: TANKS.m109.health,
      reloadRemaining: 0,
      targets: [],
      history: [],
      projectiles: [],
      effects: [],
      availableActions: ['rangefind', 'fire', 'set_elevation'],
      incomingShots: 0,
      domesDestroyed: 0,
      measuredTargets: {},
      lastImpact: null,
    };

    this.nextTargetId = 1;
    this.leaderboard = this._loadLeaderboard();
    this._domRefs = new Map();
    this._boundHandlers = [];
  }

  async init() {
    this.engine = new SceneManager(this.container, {
      background: '#080810',
      orbit: true,
      fov: 52,
      near: 0.1,
      far: 2500,
    });

    this.engine.camera.position.set(0, 28, 54);
    this.engine.controls.target.set(0, 5, 0);
    this.engine.controls.minDistance = 18;
    this.engine.controls.maxDistance = 180;
    this.engine.controls.maxPolarAngle = Math.PI * 0.49;

    this._buildScene();
    this._buildPanels();
    this._setTank(this.state.selectedTank, true);
    this._startRound(1);
    this._syncTurretToHeading();
    this._updateUI();

    this.engine.onTick((dt) => {
      this._tick(dt);
    });
    this.engine.start();
  }

  _buildScene() {
    const scene = this.engine.scene;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x1f2937, 0.75);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff7dc, 0.95);
    key.position.set(26, 34, 16);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x93c5fd, 0.35);
    rim.position.set(-18, 12, -32);
    scene.add(rim);

    const groundGeo = new THREE.CircleGeometry(260, 128);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.95,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    scene.add(ground);

    const ringGeo = new THREE.RingGeometry(9.5, 10, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x334155,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    scene.add(ring);

    this.tankGroup = new THREE.Group();
    scene.add(this.tankGroup);

    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 2.1, 10.2),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.68, metalness: 0.28 }),
    );
    hull.position.y = 1.2;
    this.tankGroup.add(hull);

    this.turretGroup = new THREE.Group();
    this.turretGroup.position.y = 2.5;
    this.tankGroup.add(this.turretGroup);

    const turret = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3, 2.6, 1.3, 22),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6, metalness: 0.25 }),
    );
    turret.rotation.x = Math.PI / 2;
    this.turretGroup.add(turret);

    this.barrelPivot = new THREE.Group();
    this.barrelPivot.position.set(0, 0.15, 1.8);
    this.turretGroup.add(this.barrelPivot);

    this.barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.28, 7.2, 20),
      new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.4, metalness: 0.55 }),
    );
    this.barrel.rotation.x = Math.PI / 2;
    this.barrel.position.z = 3.6;
    this.barrelPivot.add(this.barrel);

    this.targetGroup = new THREE.Group();
    scene.add(this.targetGroup);

    this.projectileGroup = new THREE.Group();
    scene.add(this.projectileGroup);

    this.fxGroup = new THREE.Group();
    scene.add(this.fxGroup);
  }

  _buildPanels() {
    this.topLeft = new UIPanel(this.container, 'top-left', 'Controls');
    this.topRight = new UIPanel(this.container, 'top-right', 'Status');
    this.bottomLeft = new UIPanel(this.container, 'bottom-left', 'Actions');
    this.bottomRight = new UIPanel(this.container, 'bottom-right', 'History');

    this._buildPresetBar();
    this._buildControlsPanel();
    this._buildStatusPanel();
    this._buildActionsPanel();
    this._buildHistoryPanel();
  }

  _buildPresetBar() {
    const bar = document.createElement('div');
    bar.className = 'miniapp-panel';
    bar.style.top = '10px';
    bar.style.left = '50%';
    bar.style.transform = 'translateX(-50%)';
    bar.style.display = 'flex';
    bar.style.gap = '6px';
    bar.style.flexWrap = 'wrap';
    bar.style.justifyContent = 'center';
    bar.style.maxWidth = '95%';
    bar.style.padding = '8px 10px';

    const label = document.createElement('span');
    label.textContent = 'Tank presets:';
    label.style.fontSize = '11px';
    label.style.color = '#94a3b8';
    label.style.padding = '5px 4px 0 0';
    bar.appendChild(label);

    Object.values(TANKS).forEach((tank) => {
      const button = document.createElement('button');
      button.className = 'miniapp-btn';
      button.textContent = tank.name;
      if (tank.key === this.state.selectedTank) {
        button.classList.add('miniapp-btn--neutron');
      }
      const handler = () => {
        this._setTank(tank.key, true);
        this.presetBar.querySelectorAll('button').forEach((b) => b.classList.remove('miniapp-btn--neutron'));
        button.classList.add('miniapp-btn--neutron');
      };
      button.addEventListener('click', handler);
      this._boundHandlers.push({ element: button, event: 'click', handler });
      bar.appendChild(button);
    });

    this.presetBar = bar;
    this.container.appendChild(bar);
  }

  _buildControlsPanel() {
    const panel = this.topLeft.el;
    panel.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'miniapp-subtitle';
    title.textContent = 'Fire Control';
    panel.appendChild(title);

    const tankField = buildSelect(
      'Tank',
      Object.values(TANKS).map((t) => ({ value: t.key, label: t.name })),
      (value) => this._setTank(value, false),
    );
    tankField.select.value = this.state.selectedTank;
    panel.appendChild(tankField);
    this.tankSelect = tankField.select;

    const targetField = buildSelect('Target', [], (value) => {
      this.state.selectedTargetId = value ? Number(value) : null;
      this._updateUI();
    });
    panel.appendChild(targetField);
    this.targetSelect = targetField.select;

    const shellField = buildSelect(
      'Shell Type',
      [
        { value: 'AP', label: 'AP' },
        { value: 'HE', label: 'HE' },
        { value: 'FRAG', label: 'Fragmentation' },
      ],
      (value) => {
        this.state.selectedShell = value;
        this._updateUI();
      },
    );
    shellField.select.value = this.state.selectedShell;
    panel.appendChild(shellField);

    const headingField = buildNumberInput('Heading (deg)', 0, 359, 1, this.state.headingDeg, (value) => {
      this.state.headingDeg = value;
      this._syncTurretToHeading();
      this._updateUI();
    });
    panel.appendChild(headingField);
    this.headingInput = headingField.input;

    const elevationField = buildNumberInput('Elevation (deg)', 5, 75, 0.5, this.state.elevationDeg, (value) => {
      this.state.elevationDeg = value;
      this._syncTurretToHeading();
      this._updateUI();
    });
    panel.appendChild(elevationField);
    this.elevationInput = elevationField.input;

    this.rangefinderReadout = document.createElement('div');
    this.rangefinderReadout.className = 'miniapp-display';
    this.rangefinderReadout.style.marginTop = '8px';
    panel.appendChild(this.rangefinderReadout);

    this.reloadReadout = document.createElement('div');
    this.reloadReadout.className = 'miniapp-display';
    panel.appendChild(this.reloadReadout);

    this.fireButton = document.createElement('button');
    this.fireButton.className = 'miniapp-btn miniapp-btn--proton';
    this.fireButton.textContent = 'Fire';
    const fireHandler = () => this._fire();
    this.fireButton.addEventListener('click', fireHandler);
    this._boundHandlers.push({ element: this.fireButton, event: 'click', handler: fireHandler });

    this.rangefinderButton = document.createElement('button');
    this.rangefinderButton.className = 'miniapp-btn';
    this.rangefinderButton.textContent = 'Rangefinder';
    const rangefinderHandler = () => this._runRangefinder();
    this.rangefinderButton.addEventListener('click', rangefinderHandler);
    this._boundHandlers.push({ element: this.rangefinderButton, event: 'click', handler: rangefinderHandler });

    panel.appendChild(this.rangefinderButton);
    panel.appendChild(this.fireButton);
  }

  _buildStatusPanel() {
    const panel = this.topRight.el;
    panel.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'miniapp-subtitle';
    title.textContent = 'Tank Status';
    panel.appendChild(title);

    this.healthLine = document.createElement('div');
    this.healthLine.className = 'miniapp-display';
    panel.appendChild(this.healthLine);

    const barWrap = document.createElement('div');
    barWrap.style.width = '100%';
    barWrap.style.height = '6px';
    barWrap.style.borderRadius = '4px';
    barWrap.style.background = 'rgba(255,255,255,0.1)';
    barWrap.style.overflow = 'hidden';
    this.healthBar = document.createElement('div');
    this.healthBar.style.height = '100%';
    this.healthBar.style.width = '100%';
    this.healthBar.style.background = '#4ade80';
    this.healthBar.style.transition = 'width 0.2s ease, background 0.2s ease';
    barWrap.appendChild(this.healthBar);
    panel.appendChild(barWrap);

    this.tankSpecBox = document.createElement('div');
    this.tankSpecBox.className = 'miniapp-display';
    this.tankSpecBox.style.marginTop = '8px';
    panel.appendChild(this.tankSpecBox);

    this.targetInfo = document.createElement('div');
    this.targetInfo.className = 'miniapp-display';
    this.targetInfo.style.marginTop = '8px';
    panel.appendChild(this.targetInfo);

    this.roundInfo = document.createElement('div');
    this.roundInfo.className = 'miniapp-display';
    this.roundInfo.style.marginTop = '8px';
    panel.appendChild(this.roundInfo);
  }

  _buildActionsPanel() {
    const panel = this.bottomLeft.el;
    panel.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'miniapp-subtitle';
    title.textContent = 'Actions';
    panel.appendChild(title);

    const elevationBtn = document.createElement('button');
    elevationBtn.className = 'miniapp-btn';
    elevationBtn.textContent = 'Set Elevation from Range';
    const elevHandler = () => this._setElevationFromRangefinder();
    elevationBtn.addEventListener('click', elevHandler);
    this._boundHandlers.push({ element: elevationBtn, event: 'click', handler: elevHandler });
    panel.appendChild(elevationBtn);

    const centerBtn = document.createElement('button');
    centerBtn.className = 'miniapp-btn';
    centerBtn.textContent = 'Center Turret';
    const centerHandler = () => {
      this.state.headingDeg = 0;
      this.headingInput.value = '0';
      this._syncTurretToHeading();
      this._updateUI();
    };
    centerBtn.addEventListener('click', centerHandler);
    this._boundHandlers.push({ element: centerBtn, event: 'click', handler: centerHandler });
    panel.appendChild(centerBtn);

    const restartBtn = document.createElement('button');
    restartBtn.className = 'miniapp-btn miniapp-btn--reset';
    restartBtn.textContent = 'Restart Run';
    const restartHandler = () => this._restartRun();
    restartBtn.addEventListener('click', restartHandler);
    this._boundHandlers.push({ element: restartBtn, event: 'click', handler: restartHandler });
    panel.appendChild(restartBtn);

    this.actionHint = document.createElement('div');
    this.actionHint.className = 'miniapp-display';
    this.actionHint.style.marginTop = '8px';
    panel.appendChild(this.actionHint);
  }

  _buildHistoryPanel() {
    const panel = this.bottomRight.el;
    panel.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'miniapp-subtitle';
    title.textContent = 'History and Leaderboard';
    panel.appendChild(title);

    this.historyList = document.createElement('div');
    this.historyList.style.fontSize = '11px';
    this.historyList.style.color = '#cbd5e1';
    this.historyList.style.minHeight = '88px';
    panel.appendChild(this.historyList);

    const lbTitle = document.createElement('div');
    lbTitle.style.fontSize = '11px';
    lbTitle.style.marginTop = '8px';
    lbTitle.style.color = '#94a3b8';
    lbTitle.textContent = 'Top Scores';
    panel.appendChild(lbTitle);

    this.leaderboardList = document.createElement('div');
    this.leaderboardList.style.fontSize = '11px';
    this.leaderboardList.style.color = '#e2e8f0';
    panel.appendChild(this.leaderboardList);
  }

  _setTank(tankKey, fromPreset) {
    const tank = TANKS[tankKey];
    if (!tank) return;

    const oldMax = TANKS[this.state.selectedTank]?.health || tank.health;
    const ratio = this.state.tankHealth / oldMax;

    this.state.selectedTank = tankKey;
    this.state.tankHealth = this.state.gameOver ? tank.health : Math.max(1, Math.round(tank.health * clamp(ratio, 0, 1)));
    this.state.reloadRemaining = Math.max(this.state.reloadRemaining, 0);
    this.state.rangefinderMeters = null;
    this.state.measuredTargets = {};

    this.tankSelect.value = tankKey;
    this._addHistory(`${tank.name} selected (${tank.caliberMm} mm)`);

    if (!fromPreset) {
      this.presetBar.querySelectorAll('button').forEach((b) => {
        if (b.textContent === tank.name) b.classList.add('miniapp-btn--neutron');
        else b.classList.remove('miniapp-btn--neutron');
      });
    }

    this._updateUI();
  }

  _restartRun() {
    const currentTank = this.state.selectedTank;
    this.state.round = 1;
    this.state.score = 0;
    this.state.shotsFired = 0;
    this.state.hits = 0;
    this.state.gameOver = false;
    this.state.roundTransition = 0;
    this.state.incomingShots = 0;
    this.state.domesDestroyed = 0;
    this.state.history = [];
    this.state.effects = [];
    this.state.projectiles = [];
    this.state.lastImpact = null;
    this._clearTargets();
    this._setTank(currentTank, true);
    this.state.tankHealth = TANKS[currentTank].health;
    this._startRound(1);
    this._addHistory('New run started');
    this._updateUI();
  }

  _startRound(round) {
    this.state.round = round;
    this.state.roundTransition = 0;
    this.state.targets = [];
    this._clearTargets();

    const count = round;
    const tank = TANKS[this.state.selectedTank];

    for (let i = 0; i < count; i++) {
      const targetType = pickTargetType();
      const distanceM = randRange(1000, Math.min(tank.maxRangeM * 0.95, 15000));
      const headingDeg = randRange(0, 360);
      const headingRad = toRadians(headingDeg);
      const distanceU = metersToUnits(distanceM);
      const x = Math.sin(headingRad) * distanceU;
      const z = Math.cos(headingRad) * distanceU;

      const target = {
        id: this.nextTargetId++,
        type: targetType.key,
        label: targetType.label,
        headingDeg,
        distanceM,
        hp: targetType.hp,
        maxHp: targetType.hp,
        hitRadiusM: targetType.hitRadiusM,
        scoreValue: targetType.score,
        alive: true,
        x,
        z,
        fireNodes: [],
        subDomes: [],
      };

      if (targetType.key === 'cluster') {
        for (let s = 0; s < targetType.subCount; s++) {
          target.subDomes.push({
            index: s,
            hp: targetType.subHp,
            maxHp: targetType.subHp,
            alive: true,
          });
          target.fireNodes.push({
            cooldown: randRange(2.0, targetType.fireReloadSec + 0.5),
            reloadSec: targetType.fireReloadSec,
            damage: targetType.fireDamage,
            subIndex: s,
          });
        }
      } else {
        target.fireNodes.push({
          cooldown: randRange(2.2, targetType.fireReloadSec + 0.8),
          reloadSec: targetType.fireReloadSec,
          damage: targetType.fireDamage,
        });
      }

      target.mesh = this._createTargetMesh(target, targetType);
      this.targetGroup.add(target.mesh);
      this.state.targets.push(target);
    }

    this.state.selectedTargetId = this.state.targets.find((t) => t.alive)?.id || null;
    this.state.rangefinderMeters = null;
    this.state.measuredTargets = {};
    this._addHistory(`Round ${round}: ${count} target objectives`);
    this._updateTargetSelect();
  }

  _createTargetMesh(target, def) {
    const group = new THREE.Group();
    group.position.set(target.x, 0, target.z);

    if (target.type === 'cluster') {
      const offsets = [
        new THREE.Vector3(-0.9, 0, 0.35),
        new THREE.Vector3(0.9, 0, 0.35),
        new THREE.Vector3(0, 0, -0.85),
      ];
      offsets.forEach((offset, index) => {
        const dome = this._createSingleDome(def.meshColor, 0.62, 0.24, 0.44);
        dome.position.copy(offset);
        group.add(dome);
        this._domRefs.set(`${target.id}:${index}`, dome);
      });
    } else {
      const size = target.type === 'large' ? 1.4 : 1.0;
      const porthole = target.type === 'large' ? 0.35 : 0.26;
      const barrelLength = target.type === 'large' ? 0.7 : 0.48;
      const dome = this._createSingleDome(def.meshColor, size, porthole, barrelLength);
      group.add(dome);
      this._domRefs.set(`${target.id}:0`, dome);
    }

    return group;
  }

  _createSingleDome(color, scale, portholeRadius, barrelLength) {
    const group = new THREE.Group();

    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(scale, 24, 18, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.22 }),
    );
    shell.position.y = scale * 0.44;
    group.add(shell);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(scale * 0.92, scale * 0.92, scale * 0.32, 24),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85, metalness: 0.12 }),
    );
    base.position.y = scale * 0.16;
    group.add(base);

    const porthole = new THREE.Mesh(
      new THREE.CylinderGeometry(portholeRadius, portholeRadius, 0.16, 16),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.35, metalness: 0.75 }),
    );
    porthole.rotation.x = Math.PI / 2;
    porthole.position.set(0, scale * 0.38, scale * 0.9);
    group.add(porthole);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(portholeRadius * 0.42, portholeRadius * 0.5, barrelLength, 12),
      new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.45, metalness: 0.62 }),
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, scale * 0.38, scale * 0.9 + barrelLength * 0.5);
    group.add(barrel);

    return group;
  }

  _tick(dt) {
    if (!this.state.gameOver) {
      this.state.reloadRemaining = Math.max(0, this.state.reloadRemaining - dt);
      this._tickProjectiles(dt);
      this._tickEffects(dt);
      this._tickDomeFire(dt);
      this._tickRoundProgress(dt);
    } else {
      this._tickEffects(dt);
    }

    this._updateUI();
  }

  _tickProjectiles(dt) {
    const gravityUnits = GRAVITY / METERS_PER_UNIT;

    for (const projectile of this.state.projectiles) {
      projectile.t += dt;
      const t = projectile.t;

      const x = projectile.start.x + projectile.v0.x * t;
      const y = projectile.start.y + projectile.v0.y * t - 0.5 * gravityUnits * t * t;
      const z = projectile.start.z + projectile.v0.z * t;
      projectile.mesh.position.set(x, Math.max(y, 0), z);

      if (projectile.trail) {
        projectile.trail.geometry.setFromPoints([
          projectile.prevPos.clone(),
          projectile.mesh.position.clone(),
        ]);
        projectile.prevPos.copy(projectile.mesh.position);
      }

      if (projectile.t >= projectile.maxT || y <= 0) {
        this._resolveImpact(projectile);
        this.projectileGroup.remove(projectile.mesh);
        if (projectile.trail) this.projectileGroup.remove(projectile.trail);
        projectile.mesh.geometry.dispose();
        projectile.mesh.material.dispose();
        if (projectile.trail) {
          projectile.trail.geometry.dispose();
          projectile.trail.material.dispose();
        }
        projectile.dead = true;
      }
    }

    this.state.projectiles = this.state.projectiles.filter((p) => !p.dead);
  }

  _tickEffects(dt) {
    for (const fx of this.state.effects) {
      fx.time += dt;
      const t = fx.time / fx.life;
      const scale = 1 + t * 3;
      fx.mesh.scale.set(scale, scale, scale);
      fx.mesh.material.opacity = Math.max(0, 0.7 * (1 - t));
      if (fx.time >= fx.life) {
        this.fxGroup.remove(fx.mesh);
        fx.mesh.geometry.dispose();
        fx.mesh.material.dispose();
        fx.dead = true;
      }
    }
    this.state.effects = this.state.effects.filter((fx) => !fx.dead);
  }

  _tickDomeFire(dt) {
    for (const target of this.state.targets) {
      if (!target.alive) continue;

      for (const node of target.fireNodes) {
        if (target.type === 'cluster' && node.subIndex !== undefined) {
          const sub = target.subDomes[node.subIndex];
          if (!sub?.alive) continue;
        }

        node.cooldown -= dt;
        if (node.cooldown > 0) continue;

        node.cooldown = node.reloadSec + randRange(0.0, 1.8);
        this._applyIncomingFire(target, node.damage);
      }
    }
  }

  _tickRoundProgress(dt) {
    const alive = this.state.targets.filter((t) => t.alive).length;
    if (alive > 0 || this.state.gameOver) return;

    if (this.state.roundTransition <= 0) {
      this.state.roundTransition = 2.2;
      const bonus = 90 + this.state.round * 12;
      this.state.score += bonus;
      this._addHistory(`Round ${this.state.round} cleared (+${bonus})`);
    }

    this.state.roundTransition -= dt;
    if (this.state.roundTransition <= 0) {
      this._startRound(this.state.round + 1);
    }
  }

  _applyIncomingFire(target, damage) {
    if (this.state.gameOver) return;

    this.state.incomingShots += 1;
    const wobble = Math.max(0.82, 1 - this.state.round * 0.005);
    const adjusted = Math.round(damage * randRange(wobble, 1.14));
    this.state.tankHealth = Math.max(0, this.state.tankHealth - adjusted);

    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 14, 12),
      new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.68 }),
    );
    flash.position.set(randRange(-1.4, 1.4), randRange(2.2, 4.2), randRange(-1.4, 1.4));
    this.fxGroup.add(flash);
    this.state.effects.push({ mesh: flash, life: 0.4, time: 0, dead: false });

    this._addHistory(`${target.label} hit tank for ${adjusted} damage`);

    if (this.state.tankHealth <= 0) {
      this._triggerGameOver();
    }
  }

  _triggerGameOver() {
    if (this.state.gameOver) return;

    this.state.gameOver = true;
    this.state.availableActions = ['restart'];

    const boom = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 24, 18),
      new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.82 }),
    );
    boom.position.set(0, 2.2, 0);
    this.fxGroup.add(boom);
    this.state.effects.push({ mesh: boom, life: 0.9, time: 0, dead: false });

    this._addHistory('Tank destroyed. Run ended.');
    this._saveHighScore();
  }

  _runRangefinder() {
    const target = this._getSelectedTarget();
    if (!target || !target.alive) {
      this._addHistory('Rangefinder failed: select a living target');
      return;
    }

    const noise = randRange(-0.012, 0.012);
    const measured = Math.max(1000, target.distanceM * (1 + noise));
    this.state.rangefinderMeters = measured;
    this.state.measuredTargets[target.id] = measured;

    this._addHistory(`${target.label} ranged at ${formatMeters(measured)}`);
    this._updateUI();
  }

  _setElevationFromRangefinder() {
    const tank = TANKS[this.state.selectedTank];
    const shell = SHELLS[this.state.selectedShell];
    const measured = this.state.rangefinderMeters;

    if (!Number.isFinite(measured)) {
      this._addHistory('No rangefinder data available');
      return;
    }

    const v = tank.muzzleVelocity;
    const normalized = clamp((measured * GRAVITY) / (v * v * shell.drag), -0.99, 0.99);
    const angle = 0.5 * Math.asin(normalized);
    const elevation = clamp(toDegrees(angle), 5, 75);
    this.state.elevationDeg = Number(elevation.toFixed(1));
    this.elevationInput.value = String(this.state.elevationDeg);
    this._syncTurretToHeading();
    this._addHistory(`Elevation set to ${this.state.elevationDeg} deg from range`);
    this._updateUI();
  }

  _fire() {
    if (this.state.gameOver) return;

    if (this.state.reloadRemaining > 0) {
      this._addHistory(`Reloading (${this.state.reloadRemaining.toFixed(1)}s)`);
      return;
    }

    const tank = TANKS[this.state.selectedTank];
    const shell = SHELLS[this.state.selectedShell];
    const headingDeg = this.state.headingDeg;
    const elevationDeg = this.state.elevationDeg;
    const headingRad = toRadians(headingDeg);
    const elevationRad = toRadians(elevationDeg);

    const v = tank.muzzleVelocity;
    const drag = shell.drag;
    const rangeM = clamp(((v * v) * Math.sin(2 * elevationRad) / GRAVITY) * drag, 0, tank.maxRangeM);
    const flightTime = Math.max(0.75, (2 * v * Math.sin(elevationRad)) / GRAVITY);

    const start = this._getBarrelMuzzlePosition();
    const v0Units = v / METERS_PER_UNIT;
    const v0 = new THREE.Vector3(
      Math.sin(headingRad) * Math.cos(elevationRad) * v0Units,
      Math.sin(elevationRad) * v0Units,
      Math.cos(headingRad) * Math.cos(elevationRad) * v0Units,
    );

    const projectile = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.72 }),
    );
    projectile.position.copy(start);
    this.projectileGroup.add(projectile);

    const trail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([start.clone(), start.clone()]),
      new THREE.LineBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.52 }),
    );
    this.projectileGroup.add(trail);

    const impact = this._evaluateImpact(rangeM, headingDeg, tank);

    this.state.projectiles.push({
      mesh: projectile,
      trail,
      prevPos: start.clone(),
      start,
      v0,
      t: 0,
      maxT: flightTime,
      rangeM,
      headingDeg,
      shellType: this.state.selectedShell,
      impact,
      dead: false,
    });

    this.state.shotsFired += 1;
    this.state.reloadRemaining = tank.reloadSec;
    this._addHistory(
      `Fired ${shell.label}: heading ${headingDeg.toFixed(0)} deg, elevation ${elevationDeg.toFixed(1)} deg`,
    );
  }

  _evaluateImpact(rangeM, headingDeg, tank) {
    const impactX = Math.sin(toRadians(headingDeg)) * metersToUnits(rangeM);
    const impactZ = Math.cos(toRadians(headingDeg)) * metersToUnits(rangeM);

    let nearest = null;
    let nearestGroundDistM = Number.POSITIVE_INFINITY;

    for (const target of this.state.targets) {
      if (!target.alive) continue;
      const dx = impactX - target.x;
      const dz = impactZ - target.z;
      const distM = unitsToMeters(Math.sqrt(dx * dx + dz * dz));
      if (distM < nearestGroundDistM) {
        nearestGroundDistM = distM;
        nearest = target;
      }
    }

    if (!nearest) {
      return { hit: false, targetId: null, missDistanceM: 9999 };
    }

    const headingErr = angularDifferenceDeg(headingDeg, nearest.headingDeg);
    const crossTrack = nearest.distanceM * Math.sin(toRadians(headingErr));
    const rangeErr = rangeM - nearest.distanceM;
    const deterministicMiss = Math.sqrt(crossTrack * crossTrack + rangeErr * rangeErr);

    const dispersion = randRange(0, tank.dispersionM);
    const missDistance = deterministicMiss + dispersion;
    const hitWindow = nearest.hitRadiusM + tank.caliberMm * 0.05;

    return {
      hit: missDistance <= hitWindow,
      targetId: nearest.id,
      missDistanceM: missDistance,
      deterministicMissM: deterministicMiss,
      impactPoint: { x: impactX, z: impactZ },
    };
  }

  _resolveImpact(projectile) {
    const fx = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.72 }),
    );
    const point = projectile.impact.impactPoint || { x: projectile.mesh.position.x, z: projectile.mesh.position.z };
    fx.position.set(point.x, 0.5, point.z);
    this.fxGroup.add(fx);
    this.state.effects.push({ mesh: fx, life: 0.46, time: 0, dead: false });

    this.state.lastImpact = {
      shellType: projectile.shellType,
      headingDeg: projectile.headingDeg,
      rangeM: projectile.rangeM,
      hit: projectile.impact.hit,
      missDistanceM: projectile.impact.missDistanceM,
    };

    if (!projectile.impact.hit || !projectile.impact.targetId) {
      this._addHistory(`Missed (${projectile.impact.missDistanceM.toFixed(0)} m off)`);
      return;
    }

    const target = this.state.targets.find((t) => t.id === projectile.impact.targetId && t.alive);
    if (!target) {
      this._addHistory('Impact on destroyed target position');
      return;
    }

    this.state.hits += 1;

    const tank = TANKS[this.state.selectedTank];
    const matchup = shellMatchMultiplier(projectile.shellType, target.type);
    const randomScale = randRange(0.88, 1.12);
    const baseDamage = tank.caliberMm * 2.6;
    const damage = Math.max(20, Math.round(baseDamage * matchup * randomScale));

    if (target.type === 'cluster') {
      this._damageClusterTarget(target, damage, projectile.shellType);
      return;
    }

    target.hp = Math.max(0, target.hp - damage);
    this._addHistory(`${projectile.shellType} hit ${target.label} for ${damage}`);

    if (target.hp <= 0) {
      this._destroyTarget(target);
    }
  }

  _damageClusterTarget(target, damage, shellType) {
    const aliveSub = target.subDomes.find((sub) => sub.alive);
    if (!aliveSub) {
      target.alive = false;
      return;
    }

    aliveSub.hp = Math.max(0, aliveSub.hp - damage);
    this._addHistory(`${shellType} hit cluster dome for ${damage}`);

    if (aliveSub.hp <= 0) {
      aliveSub.alive = false;
      const mesh = this._domRefs.get(`${target.id}:${aliveSub.index}`);
      if (mesh) mesh.visible = false;
      this._addHistory(`Cluster sub-dome ${aliveSub.index + 1} destroyed`);
    }

    const sum = target.subDomes.reduce((acc, sub) => acc + Math.max(0, sub.hp), 0);
    target.hp = sum;
    if (target.subDomes.every((sub) => !sub.alive)) {
      this._destroyTarget(target);
    }
  }

  _destroyTarget(target) {
    target.alive = false;
    this.state.domesDestroyed += 1;
    this.state.score += target.scoreValue;

    if (target.mesh) {
      target.mesh.visible = false;
    }

    const pop = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 14, 12),
      new THREE.MeshBasicMaterial({ color: 0xfb7185, transparent: true, opacity: 0.76 }),
    );
    pop.position.set(target.x, 0.8, target.z);
    this.fxGroup.add(pop);
    this.state.effects.push({ mesh: pop, life: 0.55, time: 0, dead: false });

    this._addHistory(`${target.label} destroyed (+${target.scoreValue})`);

    if (this.state.selectedTargetId === target.id) {
      const next = this.state.targets.find((t) => t.alive);
      this.state.selectedTargetId = next ? next.id : null;
      this.state.rangefinderMeters = null;
    }

    this._updateTargetSelect();
  }

  _getSelectedTarget() {
    return this.state.targets.find((t) => t.id === this.state.selectedTargetId) || null;
  }

  _updateTargetSelect() {
    const aliveTargets = this.state.targets.filter((t) => t.alive);

    this.targetSelect.innerHTML = '';
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = aliveTargets.length ? 'Select target' : 'No targets alive';
    this.targetSelect.appendChild(blank);

    aliveTargets.forEach((target, idx) => {
      const option = document.createElement('option');
      option.value = String(target.id);
      option.textContent = `${idx + 1}. ${target.label}`;
      this.targetSelect.appendChild(option);
    });

    if (!this.state.selectedTargetId && aliveTargets.length) {
      this.state.selectedTargetId = aliveTargets[0].id;
    }

    this.targetSelect.value = this.state.selectedTargetId ? String(this.state.selectedTargetId) : '';
  }

  _getBarrelMuzzlePosition() {
    const local = new THREE.Vector3(0, 0, 7.2);
    this.barrelPivot.updateMatrixWorld();
    return this.barrelPivot.localToWorld(local.clone());
  }

  _syncTurretToHeading() {
    const headingRad = toRadians(this.state.headingDeg);
    this.turretGroup.rotation.y = headingRad;

    const elevation = toRadians(this.state.elevationDeg);
    this.barrelPivot.rotation.x = -elevation;
  }

  _addHistory(message) {
    this.state.history.push(message);
    if (this.state.history.length > 14) this.state.history.shift();
  }

  _updateUI() {
    const tank = TANKS[this.state.selectedTank];
    const selectedTarget = this._getSelectedTarget();

    const maxHealth = tank.health;
    const healthPct = clamp(this.state.tankHealth / maxHealth, 0, 1);
    this.healthLine.textContent = `Health: ${Math.round(this.state.tankHealth)} / ${maxHealth}`;
    this.healthBar.style.width = `${(healthPct * 100).toFixed(1)}%`;
    this.healthBar.style.background = healthPct > 0.6 ? '#4ade80' : healthPct > 0.3 ? '#facc15' : '#f87171';

    this.tankSpecBox.innerHTML = [
      `${tank.name} (${tank.role})`,
      `Range: ${formatMeters(tank.maxRangeM)}`,
      `Gun: ${tank.caliberMm} mm`,
      `Muzzle velocity: ${Math.round(tank.muzzleVelocity)} m/s`,
      `Reload: ${tank.reloadSec.toFixed(1)} s`,
    ].join('<br>');

    if (selectedTarget && selectedTarget.alive) {
      const measured = this.state.measuredTargets[selectedTarget.id];
      const targetHp = selectedTarget.type === 'cluster'
        ? `${selectedTarget.subDomes.filter((s) => s.alive).length}/3 domes active`
        : `${Math.max(0, Math.round(selectedTarget.hp))} HP`;

      this.targetInfo.innerHTML = [
        `Target: ${selectedTarget.label}`,
        `Distance: ${formatMeters(selectedTarget.distanceM)}`,
        `Heading: ${selectedTarget.headingDeg.toFixed(1)} deg`,
        `Condition: ${targetHp}`,
        measured ? `Rangefinder: ${formatMeters(measured)}` : 'Rangefinder: not measured',
      ].join('<br>');
    } else {
      this.targetInfo.textContent = 'Target: none';
    }

    const accuracy = this.state.shotsFired > 0 ? this.state.hits / this.state.shotsFired : 0;
    this.roundInfo.innerHTML = [
      `Round: ${this.state.round}`,
      `Score: ${this.state.score}`,
      `Destroyed domes: ${this.state.domesDestroyed}`,
      `Accuracy: ${(accuracy * 100).toFixed(0)}%`,
    ].join('<br>');

    this.rangefinderReadout.textContent = this.state.rangefinderMeters
      ? `Last range: ${formatMeters(this.state.rangefinderMeters)}`
      : 'Last range: none';

    this.reloadReadout.textContent = this.state.reloadRemaining > 0
      ? `Reload: ${this.state.reloadRemaining.toFixed(1)} s`
      : 'Reload: ready';

    this.fireButton.disabled = this.state.gameOver;
    this.rangefinderButton.disabled = this.state.gameOver;

    if (this.state.gameOver) {
      this.actionHint.textContent = 'Tank destroyed. Restart run to continue.';
    } else if (this.state.roundTransition > 0) {
      this.actionHint.textContent = `Next round in ${Math.ceil(this.state.roundTransition)}...`;
    } else {
      this.actionHint.textContent = 'Hint: rangefinder is optional. You can fire by eyeballing heading/elevation.';
    }

    const historyItems = [...this.state.history].slice(-8).reverse();
    this.historyList.innerHTML = historyItems.length
      ? historyItems.map((item) => `- ${item}`).join('<br>')
      : 'No events yet.';

    this.leaderboardList.innerHTML = this.leaderboard.length
      ? this.leaderboard
        .map((entry, index) => `${index + 1}. ${entry.score} pts | Round ${entry.round} | ${entry.tank}`)
        .join('<br>')
      : 'No saved runs yet.';
  }

  _loadLeaderboard() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((entry) => Number.isFinite(entry.score))
        .slice(0, 8);
    } catch {
      return [];
    }
  }

  _saveHighScore() {
    const tank = TANKS[this.state.selectedTank];
    const entry = {
      score: this.state.score,
      round: this.state.round,
      tank: tank.name,
      at: new Date().toISOString().slice(0, 10),
    };

    this.leaderboard = [...this.leaderboard, entry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.leaderboard));
    } catch {
      // Ignore storage failures.
    }
  }

  _clearTargets() {
    while (this.targetGroup.children.length) {
      const child = this.targetGroup.children.pop();
      this.targetGroup.remove(child);
      child.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
          if (Array.isArray(node.material)) node.material.forEach((mat) => mat.dispose());
          else node.material.dispose();
        }
      });
    }
    this._domRefs.clear();
  }

  getState() {
    const tank = TANKS[this.state.selectedTank];
    const selectedTarget = this._getSelectedTarget();
    const accuracy = this.state.shotsFired > 0 ? this.state.hits / this.state.shotsFired : 0;

    return {
      primary: {
        round: this.state.round,
        selectedTank: {
          key: tank.key,
          name: tank.name,
          role: tank.role,
          caliberMm: tank.caliberMm,
          maxRangeM: tank.maxRangeM,
          muzzleVelocity: tank.muzzleVelocity,
          reloadSec: tank.reloadSec,
          dispersionM: tank.dispersionM,
        },
        selectedShell: this.state.selectedShell,
        controls: {
          headingDeg: this.state.headingDeg,
          elevationDeg: this.state.elevationDeg,
          rangefinderMeters: this.state.rangefinderMeters,
        },
        selectedTarget: selectedTarget
          ? {
            id: selectedTarget.id,
            type: selectedTarget.type,
            label: selectedTarget.label,
            headingDeg: Number(selectedTarget.headingDeg.toFixed(2)),
            distanceM: Number(selectedTarget.distanceM.toFixed(1)),
            hp: Math.max(0, Math.round(selectedTarget.hp)),
            alive: selectedTarget.alive,
          }
          : null,
      },
      metrics: {
        score: this.state.score,
        tankHealth: Math.round(this.state.tankHealth),
        shotsFired: this.state.shotsFired,
        hits: this.state.hits,
        accuracy: Number(accuracy.toFixed(2)),
        incomingShots: this.state.incomingShots,
        domesDestroyed: this.state.domesDestroyed,
      },
      status: {
        stable: !this.state.gameOver,
        label: this.state.gameOver
          ? 'Destroyed'
          : this.state.roundTransition > 0
            ? 'Round transition'
            : 'Combat active',
        score: Math.round(accuracy * 100),
      },
      availableActions: this.state.gameOver
        ? ['restart']
        : ['rangefind', 'fire', 'set_elevation', 'restart'],
      history: [...this.state.history].slice(-8),
    };
  }

  dispose() {
    this._boundHandlers.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this._boundHandlers = [];

    this._clearTargets();

    for (const projectile of this.state.projectiles) {
      this.projectileGroup.remove(projectile.mesh);
      if (projectile.trail) this.projectileGroup.remove(projectile.trail);
      projectile.mesh.geometry.dispose();
      projectile.mesh.material.dispose();
      if (projectile.trail) {
        projectile.trail.geometry.dispose();
        projectile.trail.material.dispose();
      }
    }
    this.state.projectiles = [];

    for (const fx of this.state.effects) {
      this.fxGroup.remove(fx.mesh);
      fx.mesh.geometry.dispose();
      fx.mesh.material.dispose();
    }
    this.state.effects = [];

    if (this.presetBar?.parentNode) this.presetBar.parentNode.removeChild(this.presetBar);

    this.engine?.dispose();
  }
}
