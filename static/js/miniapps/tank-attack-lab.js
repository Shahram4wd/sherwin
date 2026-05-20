import {
  THREE,
  SceneManager,
  UIPanel,
  clamp,
  randRange,
} from './engine.js';

const STORAGE_KEY = 'sherwin_tank_attack_lab_scores';
const METERS_PER_UNIT = 100;
const GRAVITY = 9.80665;
const ENEMY_TANK_HIT_RADIUS_M = 95;
const MIN_ELEVATION_DEG = 0;
const CLOSE_RANGE_ZERO_ELEV_M = 1100;
const CLUSTER_SHARED_FIRE_COOLDOWN_SEC = 1.25;
const DEFAULT_VISOR_FOV = 32;
const MIN_VISOR_FOV = 14;
const MAX_VISOR_FOV = 58;

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
    traverseDegPerSec: 24,
    elevateDegPerSec: 9,
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
    traverseDegPerSec: 15,
    elevateDegPerSec: 6,
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
    traverseDegPerSec: 5.5,
    elevateDegPerSec: 2.4,
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
    traverseDegPerSec: 9,
    elevateDegPerSec: 3.8,
  },
};

const BARREL_VISUALS = {
  m109: { length: 2.55, breechRadius: 0.038, muzzleRadius: 0.024, segments: 16 },
  isu152: { length: 2.25, breechRadius: 0.046, muzzleRadius: 0.03, segments: 16 },
  karl: { length: 1.72, breechRadius: 0.085, muzzleRadius: 0.062, segments: 18 },
  kv2: { length: 1.95, breechRadius: 0.052, muzzleRadius: 0.034, segments: 16 },
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
    muzzleVelocity: 320,
    dispersionM: 120,
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
    muzzleVelocity: 260,
    dispersionM: 155,
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
    fireReloadSec: 5.8,
    muzzleVelocity: 300,
    dispersionM: 175,
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

function shortestSignedAngleDeg(fromDeg, toDeg) {
  return ((toDeg - fromDeg + 540) % 360) - 180;
}

function normalizeHeadingDeg(deg) {
  return ((deg % 360) + 360) % 360;
}

function compassLabel(deg) {
  const normalized = normalizeHeadingDeg(deg);
  const cardinals = [
    { deg: 0, label: 'N' },
    { deg: 45, label: 'NE' },
    { deg: 90, label: 'E' },
    { deg: 135, label: 'SE' },
    { deg: 180, label: 'S' },
    { deg: 225, label: 'SW' },
    { deg: 270, label: 'W' },
    { deg: 315, label: 'NW' },
  ];
  const match = cardinals.find((item) => Math.abs(shortestSignedAngleDeg(normalized, item.deg)) < 2.5);
  return match ? match.label : String(Math.round(normalized)).padStart(3, '0');
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
      elevationDeg: 0,
      turretHeadingDeg: 0,
      turretElevationDeg: 0,
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
    this.statusExpanded = false;
    this._cameraShake = { time: 0, duration: 0.28, strength: 0 };
    this._targetHitBoxes = [];
    this._domRefs = new Map();
    this._boundHandlers = [];
  }

  async init() {
    this.engine = new SceneManager(this.container, {
      background: '#080810',
      orbit: true,
      fov: DEFAULT_VISOR_FOV,
      near: 0.05,
      far: 2500,
    });

    // 2D target indicator overlay
    this.container.style.position = 'relative';
    this.targetOverlay = document.createElement('div');
    this.targetOverlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:12;';
    this.container.appendChild(this.targetOverlay);

    this._buildScene();
    this._initPeriscopeCamera();
    this._buildPanels();
    this._setTank(this.state.selectedTank, true);
    this._startRound(1);
    this._syncTurretToHeading();
    this._syncPeriscopeCameraPose();
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

    const ringGeo = new THREE.RingGeometry(3.2, 3.5, 64);
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

    this.sceneryGroup = new THREE.Group();
    scene.add(this.sceneryGroup);

    this.treeMaterials = {
      trunk: new THREE.MeshStandardMaterial({ color: 0xc97842, roughness: 0.82, metalness: 0.02 }),
      trunkDark: new THREE.MeshStandardMaterial({ color: 0x9f5f32, roughness: 0.9, metalness: 0.02 }),
      leaf: new THREE.MeshStandardMaterial({ color: 0x22e864, roughness: 0.72, metalness: 0.03 }),
      leafDark: new THREE.MeshStandardMaterial({ color: 0x16c957, roughness: 0.78, metalness: 0.03 }),
    };

    this.turretGroup = new THREE.Group();
    this.turretGroup.position.y = 0.87;
    this.tankGroup.add(this.turretGroup);

    this.barrelPivot = new THREE.Group();
    this.barrelPivot.position.set(0, 0.05, 0.62);
    this.turretGroup.add(this.barrelPivot);

    // Camera mount follows the barrel pivot so the visor behaves like a gun-mounted optic.
    this.turretCameraMount = new THREE.Group();
    this.turretCameraMount.position.set(0, 0.05, 0.62);
    this.barrelPivot.add(this.turretCameraMount);

    this._barrelVisualLength = BARREL_VISUALS.m109.length;
    this.barrel = new THREE.Mesh(
      this._createBarrelGeometry(BARREL_VISUALS.m109),
      new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.4, metalness: 0.55 }),
    );
    this.barrel.rotation.x = Math.PI / 2;
    this.barrel.position.z = this._barrelVisualLength * 0.5;
    this.barrelPivot.add(this.barrel);

    this.targetGroup = new THREE.Group();
    scene.add(this.targetGroup);

    this.projectileGroup = new THREE.Group();
    scene.add(this.projectileGroup);

    this.fxGroup = new THREE.Group();
    scene.add(this.fxGroup);
  }

  _createBarrelGeometry(profile) {
    return new THREE.CylinderGeometry(
      profile.muzzleRadius,
      profile.breechRadius,
      profile.length,
      profile.segments,
    );
  }

  _applyTankBarrelProfile(tankKey) {
    if (!this.barrel) return;

    const profile = BARREL_VISUALS[tankKey] || BARREL_VISUALS.m109;
    this._barrelVisualLength = profile.length;
    this.barrel.geometry.dispose();
    this.barrel.geometry = this._createBarrelGeometry(profile);
    this.barrel.position.z = profile.length * 0.5;
  }

  _setVisorFov(fov) {
    const cam = this.engine?.camera;
    if (!cam) return;

    cam.fov = clamp(fov, MIN_VISOR_FOV, MAX_VISOR_FOV);
    cam.updateProjectionMatrix();
  }

  _getTouchDistance(touches) {
    if (touches.length < 2) return 0;

    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  _initPeriscopeCamera() {
    // Fully remove OrbitControls: SceneManager still calls controls.update() each frame,
    // which otherwise overrides this miniapp's manual camera pose.
    if (this.engine.controls) {
      this.engine.controls.dispose();
      this.engine.controls = null;
    }

    // Drive camera in world space from the barrel pivot so pitch follows elevation.
    const cam = this.engine.camera;
    this.engine.scene.add(cam);
    // Gun-mounted zoom optic: camera is parallel to the barrel, with a thin right-edge barrel reference.
    this._periscopeCameraOffset = new THREE.Vector3(0.26, 0, -0.55);
    this._syncPeriscopeCameraPose();

    // Dedicated HUD layer so crosshair/indicators are not cleared by target overlay refresh.
    this.hudOverlay = document.createElement('div');
    this.hudOverlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
    this.container.appendChild(this.hudOverlay);

    // Crosshair
    const crosshair = document.createElement('div');
    crosshair.style.cssText = 'position:absolute;top:50%;left:50%;width:28px;height:28px;transform:translate(-50%,-50%);pointer-events:none;';
    crosshair.innerHTML = [
      '<div style="position:absolute;top:50%;left:0;width:100%;height:1px;background:rgba(251,191,36,0.82);transform:translateY(-50%)"></div>',
      '<div style="position:absolute;left:50%;top:0;height:100%;width:1px;background:rgba(251,191,36,0.82);transform:translateX(-50%)"></div>',
      '<div style="position:absolute;top:50%;left:50%;width:5px;height:5px;border-radius:50%;border:2px solid rgba(251,191,36,0.95);transform:translate(-50%,-50%)"></div>',
      '<div style="position:absolute;top:50%;left:50%;width:20px;height:20px;border-radius:50%;border:1px solid rgba(251,191,36,0.5);transform:translate(-50%,-50%)"></div>',
    ].join('');
    this.hudOverlay.appendChild(crosshair);

    this.headingHud = document.createElement('div');
    this.headingHud.style.cssText = [
      'position:absolute',
      'left:50%',
      'top:62px',
      'transform:translateX(-50%)',
      'color:#111827',
      'background:#fbbf24',
      'border:1px solid rgba(255,255,255,0.55)',
      'border-radius:4px',
      'padding:4px 10px',
      'font:700 15px/1.2 monospace',
      'box-shadow:0 0 10px rgba(0,0,0,0.35)',
      'letter-spacing:0',
      'z-index:5',
    ].join(';');
    this.hudOverlay.appendChild(this.headingHud);

    this.elevationHud = document.createElement('div');
    this.elevationHud.style.cssText = [
      'position:absolute',
      'right:14px',
      'top:50%',
      'transform:translateY(-50%)',
      'color:#fbbf24',
      'background:rgba(0,0,0,0.42)',
      'border:1px solid rgba(251,191,36,0.45)',
      'border-radius:4px',
      'padding:5px 7px',
      'font:700 14px/1.5 monospace',
      'text-shadow:0 0 6px rgba(0,0,0,0.6)',
      'text-align:right',
      'white-space:pre-line',
    ].join(';');
    this.hudOverlay.appendChild(this.elevationHud);

    // Drag state
    this._drag = { active: false, lastX: 0, lastY: 0 };
    this._pinch = { active: false, startDistance: 0, startFov: DEFAULT_VISOR_FOV };
    const HEADING_SENS = 0.11;
    const ELEVATION_SENS = 0.08;
    const canvas = this.engine.renderer.domElement;
    canvas.style.cursor = 'crosshair';
    canvas.style.touchAction = 'none';

    const startDrag = (x, y) => {
      this._drag.active = true;
      this._drag.lastX = x;
      this._drag.lastY = y;
      canvas.style.cursor = 'grabbing';
    };

    const moveDrag = (x, y) => {
      if (!this._drag.active) return;
      const dx = x - this._drag.lastX;
      const dy = y - this._drag.lastY;
      this._drag.lastX = x;
      this._drag.lastY = y;

      this.state.headingDeg = ((this.state.headingDeg + dx * HEADING_SENS) % 360 + 360) % 360;
      this.state.headingDeg = Number(this.state.headingDeg.toFixed(1));
      this.state.elevationDeg = Number(clamp(
        this.state.elevationDeg - dy * ELEVATION_SENS,
        MIN_ELEVATION_DEG,
        75,
      ).toFixed(1));

      if (this.headingInput) this.headingInput.value = String(this.state.headingDeg);
      if (this.elevationInput) this.elevationInput.value = String(this.state.elevationDeg);
      this.state.turretHeadingDeg = this.state.headingDeg;
      this.state.turretElevationDeg = this.state.elevationDeg;
      this._syncTurretToHeading();
      this._syncPeriscopeCameraPose();
    };

    const endDrag = () => {
      this._drag.active = false;
      this.state.headingDeg = this.state.turretHeadingDeg;
      this.state.elevationDeg = this.state.turretElevationDeg;
      canvas.style.cursor = 'crosshair';
    };

    const startPinch = (touches) => {
      const distance = this._getTouchDistance(touches);
      if (distance <= 0) return;
      endDrag();
      this._pinch.active = true;
      this._pinch.startDistance = distance;
      this._pinch.startFov = this.engine.camera.fov;
    };

    const movePinch = (touches) => {
      if (!this._pinch.active) return;
      const distance = this._getTouchDistance(touches);
      if (distance <= 0) return;
      const ratio = distance / this._pinch.startDistance;
      this._setVisorFov(this._pinch.startFov / ratio);
    };

    const endPinch = () => {
      this._pinch.active = false;
      this._pinch.startDistance = 0;
    };

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      if (this._selectTargetAtClientPoint(e.clientX, e.clientY)) return;
      startDrag(e.clientX, e.clientY);
    };
    const onMouseMove = (e) => moveDrag(e.clientX, e.clientY);
    const onMouseUp   = () => endDrag();
    const onWheel = (e) => {
      e.preventDefault();
      this._setVisorFov(this.engine.camera.fov + e.deltaY * 0.025);
    };
    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        startPinch(e.touches);
      } else if (e.touches.length === 1 && !this._pinch.active) {
        if (this._selectTargetAtClientPoint(e.touches[0].clientX, e.touches[0].clientY)) return;
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchMove = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        movePinch(e.touches);
      } else if (e.touches.length === 1) {
        e.preventDefault();
        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = (e) => {
      if (e.touches.length === 1) {
        endPinch();
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
      } else {
        endPinch();
        endDrag();
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('touchcancel', onTouchEnd);

    this._boundHandlers.push(
      { element: canvas, event: 'mousedown', handler: onMouseDown },
      { element: window, event: 'mousemove', handler: onMouseMove },
      { element: window, event: 'mouseup', handler: onMouseUp },
      { element: canvas, event: 'wheel', handler: onWheel },
      { element: canvas, event: 'touchstart', handler: onTouchStart },
      { element: canvas, event: 'touchmove', handler: onTouchMove },
      { element: canvas, event: 'touchend', handler: onTouchEnd },
      { element: canvas, event: 'touchcancel', handler: onTouchEnd },
    );
  }

  _buildPanels() {
    this.topLeft = new UIPanel(this.container, 'top-left', 'Controls');
    this.topRight = new UIPanel(this.container, 'top-right', 'Status');
    this.bottomLeft = new UIPanel(this.container, 'bottom-left', 'Actions');
    this.bottomRight = new UIPanel(this.container, 'bottom-right', 'Leaderboard');

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

    const fsBtn = document.createElement('button');
    fsBtn.className = 'miniapp-btn';
    fsBtn.textContent = '\u26f6 Fullscreen';
    const fsHandler = () => {
      if (!document.fullscreenElement) {
        this.container.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.();
      }
    };
    fsBtn.addEventListener('click', fsHandler);
    this._boundHandlers.push({ element: fsBtn, event: 'click', handler: fsHandler });
    const fsChangeHandler = () => {
      fsBtn.textContent = document.fullscreenElement ? '\u2715 Exit Full' : '\u26f6 Fullscreen';
      setTimeout(() => this.engine._onResize?.(), 50);
    };
    document.addEventListener('fullscreenchange', fsChangeHandler);
    this._boundHandlers.push({ element: document, event: 'fullscreenchange', handler: fsChangeHandler });
    bar.appendChild(fsBtn);

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

    this.targetSelect = null;

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

    this.headingInput = null;
    this.elevationInput = null;

    this.rangefinderReadout = document.createElement('div');
    this.rangefinderReadout.className = 'miniapp-display';
    this.rangefinderReadout.style.marginTop = '8px';
    panel.appendChild(this.rangefinderReadout);

    this.reloadReadout = document.createElement('div');
    this.reloadReadout.className = 'miniapp-display';
    panel.appendChild(this.reloadReadout);

    this.rangeEstReadout = document.createElement('div');
    this.rangeEstReadout.className = 'miniapp-display';
    panel.appendChild(this.rangeEstReadout);

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

    this.statusToggle = document.createElement('button');
    this.statusToggle.type = 'button';
    this.statusToggle.className = 'miniapp-subtitle';
    this.statusToggle.style.cssText = [
      'display:flex',
      'align-items:center',
      'gap:6px',
      'width:100%',
      'padding:0',
      'border:0',
      'background:transparent',
      'cursor:pointer',
      'text-align:left',
    ].join(';');
    const statusHandler = () => {
      this.statusExpanded = !this.statusExpanded;
      this._updateUI();
    };
    this.statusToggle.addEventListener('click', statusHandler);
    this._boundHandlers.push({ element: this.statusToggle, event: 'click', handler: statusHandler });
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

    this.statusToggle.style.marginTop = '8px';
    panel.appendChild(this.statusToggle);

    this.statusDetails = document.createElement('div');
    panel.appendChild(this.statusDetails);

    this.tankSpecBox = document.createElement('div');
    this.tankSpecBox.className = 'miniapp-display';
    this.tankSpecBox.style.marginTop = '8px';
    this.statusDetails.appendChild(this.tankSpecBox);

    this.targetInfo = document.createElement('div');
    this.targetInfo.className = 'miniapp-display';
    this.targetInfo.style.marginTop = '8px';
    this.statusDetails.appendChild(this.targetInfo);

    this.roundInfo = document.createElement('div');
    this.roundInfo.className = 'miniapp-display';
    this.roundInfo.style.marginTop = '8px';
    this.statusDetails.appendChild(this.roundInfo);
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
      if (this.headingInput) this.headingInput.value = '0';
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
    panel.style.display = 'none';

    this.leaderboardTitle = document.createElement('div');
    this.leaderboardTitle.className = 'miniapp-subtitle';
    this.leaderboardTitle.textContent = 'Leaderboard';
    panel.appendChild(this.leaderboardTitle);

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
    this.state.turretHeadingDeg = this.state.headingDeg;
    this.state.turretElevationDeg = this.state.elevationDeg;
    this.state.tankHealth = this.state.gameOver ? tank.health : Math.max(1, Math.round(tank.health * clamp(ratio, 0, 1)));
    this.state.reloadRemaining = Math.max(this.state.reloadRemaining, 0);
    this.state.rangefinderMeters = null;
    this.state.measuredTargets = {};

    this.tankSelect.value = tankKey;
    this._applyTankBarrelProfile(tankKey);
    this._addHistory(`${tank.name} selected (${tank.caliberMm} mm)`);

    if (!fromPreset) {
      this.presetBar.querySelectorAll('button').forEach((b) => {
        if (b.textContent === tank.name) b.classList.add('miniapp-btn--neutron');
        else b.classList.remove('miniapp-btn--neutron');
      });
    }

    this._enforceTargetEnvelopeForCurrentTank();

    this._updateUI();
  }

  _getTankTargetDistanceMaxM(tank) {
    return Math.min(this._getEffectiveCombatRangeM(tank) * 0.95, 15000);
  }

  _getShellBallisticMaxRangeM(tank, shell) {
    return Math.max(0, ((tank.muzzleVelocity ** 2) / GRAVITY) * shell.drag);
  }

  _getBestShellBallisticMaxRangeM(tank) {
    let best = 0;
    for (const shell of Object.values(SHELLS)) {
      best = Math.max(best, this._getShellBallisticMaxRangeM(tank, shell));
    }
    return best;
  }

  _getEffectiveCombatRangeM(tank) {
    return Math.min(tank.maxRangeM, this._getBestShellBallisticMaxRangeM(tank));
  }

  _enforceTargetEnvelopeForCurrentTank() {
    const tank = TANKS[this.state.selectedTank];
    if (!tank || !this.state.targets.length) return;

    const minDistanceM = 1000;
    const maxDistanceM = this._getTankTargetDistanceMaxM(tank);

    for (const target of this.state.targets) {
      const dx = target.x;
      const dz = target.z;
      const headingRad = Math.atan2(dx, dz);
      const headingDeg = ((toDegrees(headingRad) % 360) + 360) % 360;
      const currentDistanceM = unitsToMeters(Math.hypot(dx, dz));
      const clampedDistanceM = clamp(currentDistanceM, minDistanceM, maxDistanceM);
      const distanceU = metersToUnits(clampedDistanceM);

      target.headingDeg = headingDeg;
      target.distanceM = clampedDistanceM;
      target.x = Math.sin(headingRad) * distanceU;
      target.z = Math.cos(headingRad) * distanceU;
      if (target.mesh) {
        target.mesh.position.set(target.x, 0, target.z);
      }
    }

    this.state.rangefinderMeters = null;
    this.state.measuredTargets = {};
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
    this.state.headingDeg = 0;
    this.state.elevationDeg = 0;
    this.state.turretHeadingDeg = 0;
    this.state.turretElevationDeg = 0;
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
      const distanceM = randRange(1000, this._getTankTargetDistanceMaxM(tank));
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
        sharedFireCooldown: 0,
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

    this.state.selectedTargetId = null;
    this.state.rangefinderMeters = null;
    this.state.measuredTargets = {};
    this._addHistory(`Round ${round}: ${count} target objectives`);
    this._updateTargetSelect();
    this._populateTreesForTargets();
  }

  _createTargetMesh(target, def) {
    const group = new THREE.Group();
    group.position.set(target.x, 0, target.z);

    if (target.type === 'cluster') {
      const offsets = [
        new THREE.Vector3(-0.32, 0, 0.12),
        new THREE.Vector3(0.32, 0, 0.12),
        new THREE.Vector3(0, 0, -0.3),
      ];
      offsets.forEach((offset, index) => {
        const dome = this._createSingleDome(def.meshColor, 0.22, 0.08, 0.16);
        dome.position.copy(offset);
        group.add(dome);
        this._domRefs.set(`${target.id}:${index}`, dome);
      });
    } else {
      const size = target.type === 'large' ? 0.5 : 0.35;
      const porthole = target.type === 'large' ? 0.12 : 0.09;
      const barrelLength = target.type === 'large' ? 0.25 : 0.17;
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

  _createLowPolyTree(style = 'round') {
    const group = new THREE.Group();
    const height = randRange(1.6, 2.8);
    const trunkHeight = height * randRange(0.45, 0.58);
    const trunkRadius = randRange(0.06, 0.12);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(trunkRadius * 0.72, trunkRadius, trunkHeight, 6),
      Math.random() > 0.28 ? this.treeMaterials.trunk : this.treeMaterials.trunkDark,
    );
    trunk.position.y = trunkHeight * 0.5;
    group.add(trunk);

    if (style === 'pine') {
      const tiers = [0.72, 0.55, 0.4];
      tiers.forEach((radius, index) => {
        const crown = new THREE.Mesh(
          new THREE.ConeGeometry(radius, height * 0.42, 5),
          index === 1 ? this.treeMaterials.leafDark : this.treeMaterials.leaf,
        );
        crown.position.y = trunkHeight + index * height * 0.26;
        group.add(crown);
      });
    } else if (style === 'dead') {
      for (let i = 0; i < 3; i++) {
        const branch = new THREE.Mesh(
          new THREE.CylinderGeometry(trunkRadius * 0.3, trunkRadius * 0.42, height * randRange(0.28, 0.42), 5),
          this.treeMaterials.trunk,
        );
        branch.position.set(randRange(-0.12, 0.12), trunkHeight * randRange(0.55, 0.9), 0);
        branch.rotation.z = randRange(-0.75, 0.75);
        branch.rotation.y = randRange(0, Math.PI * 2);
        group.add(branch);
      }
    } else {
      const crownCount = Math.random() > 0.35 ? 3 : 2;
      for (let i = 0; i < crownCount; i++) {
        const crown = new THREE.Mesh(
          new THREE.IcosahedronGeometry(randRange(0.42, 0.72), 1),
          i % 2 ? this.treeMaterials.leafDark : this.treeMaterials.leaf,
        );
        crown.position.set(
          randRange(-0.28, 0.28),
          trunkHeight + randRange(0.35, 0.82),
          randRange(-0.22, 0.22),
        );
        crown.scale.y = randRange(0.82, 1.12);
        group.add(crown);
      }
    }

    group.rotation.y = randRange(0, Math.PI * 2);
    group.scale.setScalar(randRange(0.85, 1.35));
    return group;
  }

  _populateTreesForTargets() {
    this._clearTrees();
    if (!this.sceneryGroup) return;

    const styles = ['round', 'round', 'round', 'pine', 'dead'];

    const addTree = (position, style) => {
      if (!this._isTreePositionClear(position)) return false;

      const tree = this._createLowPolyTree(style);
      tree.position.set(position.x, 0, position.z);
      this.sceneryGroup.add(tree);
      return true;
    };

    const rings = [16, 28, 44, 68, 96];
    rings.forEach((radius, ringIndex) => {
      const count = ringIndex < 2 ? 14 : 18;
      const angleStep = (Math.PI * 2) / count;
      const offset = randRange(0, angleStep);

      for (let i = 0; i < count; i++) {
        if (Math.random() < 0.18) continue;

        const angle = offset + i * angleStep + randRange(-angleStep * 0.22, angleStep * 0.22);
        const distance = radius + randRange(-radius * 0.16, radius * 0.16);
        const position = new THREE.Vector3(
          Math.sin(angle) * distance,
          0,
          Math.cos(angle) * distance,
        );
        addTree(position, styles[Math.floor(Math.random() * styles.length)]);
      }
    });

    for (const target of this.state.targets) {
      const forward = new THREE.Vector3(target.x, 0, target.z);
      if (forward.lengthSq() < 1e-6) continue;
      forward.normalize();
      const side = new THREE.Vector3(forward.z, 0, -forward.x);

      const targetDistance = Math.hypot(target.x, target.z);
      const treeCount = target.type === 'cluster' ? 8 : 6;
      for (let i = 0; i < treeCount; i++) {
        const sideSign = i % 2 === 0 ? 1 : -1;
        const along = randRange(-5.5, 4.8);
        const lateral = sideSign * randRange(2.2, 6.6);
        const distanceFromTank = clamp(targetDistance + along, 7, 235);
        const pos = forward.clone().multiplyScalar(distanceFromTank).add(side.clone().multiplyScalar(lateral));

        addTree(pos, styles[Math.floor(Math.random() * styles.length)]);
      }
    }
  }

  _isTreePositionClear(position) {
    if (Math.hypot(position.x, position.z) < 8) return false;

    for (const target of this.state.targets) {
      const targetVector = new THREE.Vector3(target.x, 0, target.z);
      const targetDistance = targetVector.length();
      if (targetDistance < 1e-6) continue;

      const targetDir = targetVector.clone().normalize();
      const projected = position.dot(targetDir);
      const lateral = position.clone().sub(targetDir.multiplyScalar(projected)).length();
      const targetGap = Math.hypot(position.x - target.x, position.z - target.z);

      if (targetGap < 2.8) return false;
      if (projected > 7 && projected < targetDistance + 2.5 && lateral < 1.8) return false;
    }

    return true;
  }

  _tick(dt) {
    if (!this.state.gameOver) {
      this.state.reloadRemaining = Math.max(0, this.state.reloadRemaining - dt);
      this._tickTurretMotion(dt);
      this._tickProjectiles(dt);
      this._tickEffects(dt);
      this._tickDomeFire(dt);
      this._tickRoundProgress(dt);
    } else {
      this._tickEffects(dt);
    }

    this._tickCameraShake(dt);
    this._syncPeriscopeCameraPose();
    this._updateUI();
    this._updateTargetOverlays();
  }

  _triggerCameraShake(strength = 0.035, duration = 0.28) {
    this._cameraShake.time = duration;
    this._cameraShake.duration = duration;
    this._cameraShake.strength = strength;
  }

  _tickCameraShake(dt) {
    if (!this._cameraShake || this._cameraShake.time <= 0) return;
    this._cameraShake.time = Math.max(0, this._cameraShake.time - dt);
  }

  _tickProjectiles(dt) {
    const gravityUnits = GRAVITY / METERS_PER_UNIT;

    for (const projectile of this.state.projectiles) {
      const step = dt * (projectile.timeScale ?? 1);
      projectile.t += step;
      const t = projectile.t;

      let y = 0;
      if (projectile.owner === 'enemy') {
        const p = clamp(projectile.maxT > 0 ? t / projectile.maxT : 1, 0, 1);
        projectile.mesh.position.lerpVectors(projectile.start, projectile.end, p);
        const arc = projectile.arcHeightU ?? 0;
        projectile.mesh.position.y += Math.sin(Math.PI * p) * arc;
        y = projectile.mesh.position.y;
      } else {
        const x = projectile.start.x + projectile.v0.x * t;
        y = projectile.start.y + projectile.v0.y * t - 0.5 * gravityUnits * t * t;
        const z = projectile.start.z + projectile.v0.z * t;
        projectile.mesh.position.set(x, Math.max(y, 0), z);
      }

      // Orient slug along current velocity direction
      const velDir = projectile.owner === 'enemy'
        ? projectile.end.clone().sub(projectile.start).normalize()
        : new THREE.Vector3(
          projectile.v0.x,
          projectile.v0.y - gravityUnits * t,
          projectile.v0.z,
        ).normalize();
      if (velDir.lengthSq() > 0.0001) {
        projectile.mesh.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          velDir,
        );
      }

      if (projectile.trail) {
        projectile.trail.geometry.setFromPoints([
          projectile.prevPos.clone(),
          projectile.mesh.position.clone(),
        ]);
        projectile.prevPos.copy(projectile.mesh.position);
      }

      if (projectile.t >= projectile.maxT || (projectile.owner !== 'enemy' && y <= 0)) {
        if (projectile.owner === 'enemy') {
          this._resolveIncomingImpact(projectile);
        } else {
          this._resolveImpact(projectile);
        }
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
      const scaleRate = fx.scaleRate ?? 3;
      const baseOpacity = fx.baseOpacity ?? 0.7;
      const scale = 1 + t * scaleRate;
      fx.mesh.scale.set(scale, scale, scale);
      fx.mesh.material.opacity = Math.max(0, baseOpacity * (1 - t));
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

      if (target.type === 'cluster') {
        target.sharedFireCooldown = Math.max(0, (target.sharedFireCooldown || 0) - dt);
      }

      for (const node of target.fireNodes) {
        if (target.type === 'cluster' && node.subIndex !== undefined) {
          const sub = target.subDomes[node.subIndex];
          if (!sub?.alive) continue;
        }

        node.cooldown -= dt;
        if (node.cooldown > 0) continue;

        if (target.type === 'cluster' && (target.sharedFireCooldown || 0) > 0) {
          continue;
        }

        node.cooldown = node.reloadSec + randRange(0.0, 1.8);
        if (target.type === 'cluster') {
          target.sharedFireCooldown = CLUSTER_SHARED_FIRE_COOLDOWN_SEC + randRange(0.0, 0.45);
        }
        this._fireDomeShell(target, node);
      }
    }
  }

  _getDomeMuzzlePosition(target, node) {
    if (target.type === 'cluster' && node.subIndex !== undefined) {
      const subMesh = this._domRefs.get(`${target.id}:${node.subIndex}`);
      if (subMesh) {
        const pos = new THREE.Vector3();
        subMesh.updateMatrixWorld(true);
        subMesh.getWorldPosition(pos);
        return pos.add(new THREE.Vector3(0, 0.12, 0.16));
      }
    }

    if (target.mesh) {
      const pos = new THREE.Vector3();
      target.mesh.updateMatrixWorld(true);
      target.mesh.getWorldPosition(pos);
      return pos.add(new THREE.Vector3(0, 0.18, 0.2));
    }

    return new THREE.Vector3(target.x, 0.22, target.z);
  }

  _fireDomeShell(target, node) {
    if (this.state.gameOver) return;

    const targetDef = TARGET_TYPES[target.type] || TARGET_TYPES.armored;
    const muzzleVelocity = targetDef.muzzleVelocity;
    const dispersionM = targetDef.dispersionM;
    const impactJitterMeters = randRange(0, dispersionM);
    const jitterAngle = randRange(0, Math.PI * 2);
    const jitterUnits = metersToUnits(impactJitterMeters);

    const tankAimPoint = new THREE.Vector3(
      Math.cos(jitterAngle) * jitterUnits,
      0.52,
      Math.sin(jitterAngle) * jitterUnits,
    );

    const start = this._getDomeMuzzlePosition(target, node);
    const travelDist = start.distanceTo(tankAimPoint);
    const speedUnits = muzzleVelocity / METERS_PER_UNIT;
    const maxT = Math.max(0.35, travelDist / Math.max(speedUnits, 0.01));

    const shellGeo = new THREE.CylinderGeometry(0.045, 0.065, 0.48, 10);
    shellGeo.rotateX(Math.PI / 2);
    const shell = new THREE.Mesh(
      shellGeo,
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.6 }),
    );
    shell.position.copy(start);
    this.projectileGroup.add(shell);

    const trail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([start.clone(), start.clone()]),
      new THREE.LineBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.42 }),
    );
    this.projectileGroup.add(trail);

    this.state.projectiles.push({
      owner: 'enemy',
      sourceLabel: target.label,
      sourceTarget: target,
      sourceDamage: node.damage,
      mesh: shell,
      trail,
      prevPos: start.clone(),
      start,
      end: tankAimPoint,
      arcHeightU: Math.min(1.2, Math.max(0.2, travelDist * 0.03)),
      t: 0,
      maxT,
      dead: false,
    });
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
    this._triggerCameraShake(clamp(adjusted / 900, 0.025, 0.07), 0.32);

    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.28 }),
    );
    flash.position.set(randRange(-0.75, 0.75), randRange(0.95, 1.55), randRange(-0.75, 0.75));
    this.fxGroup.add(flash);
    this.state.effects.push({
      mesh: flash,
      life: 0.24,
      time: 0,
      scaleRate: 1.15,
      baseOpacity: 0.28,
      dead: false,
    });

    this._addHistory(`\u2190 ${target.label} hit tank for ${adjusted} dmg`);

    if (this.state.tankHealth <= 0) {
      this._triggerGameOver();
    }
  }

  _resolveIncomingImpact(projectile) {
    const hitFx = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xfb7185, transparent: true, opacity: 0.48 }),
    );
    hitFx.position.copy(projectile.end);
    this.fxGroup.add(hitFx);
    this.state.effects.push({
      mesh: hitFx,
      life: 0.22,
      time: 0,
      scaleRate: 1.4,
      baseOpacity: 0.48,
      dead: false,
    });

    const missDistM = unitsToMeters(Math.hypot(projectile.end.x, projectile.end.z));
    if (missDistM <= ENEMY_TANK_HIT_RADIUS_M) {
      this._applyIncomingFire(projectile.sourceTarget, projectile.sourceDamage);
      return;
    }

    this._addHistory(`\u2190 ${projectile.sourceLabel} missed (${Math.round(missDistM)} m off)`);
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

    // Return the same reading on repeated presses for the same target
    if (this.state.measuredTargets[target.id] !== undefined) {
      this.state.rangefinderMeters = this.state.measuredTargets[target.id];
      this._addHistory(`${target.label} range (cached): ${formatMeters(this.state.rangefinderMeters)}`);
      this._updateUI();
      return;
    }

    const noise = randRange(-0.004, 0.004);
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
    const elevation = measured <= CLOSE_RANGE_ZERO_ELEV_M
      ? MIN_ELEVATION_DEG
      : clamp(toDegrees(angle), MIN_ELEVATION_DEG, 75);
    this.state.elevationDeg = Number(elevation.toFixed(1));
    if (this.elevationInput) this.elevationInput.value = String(this.state.elevationDeg);
    this._addHistory(`Elevation command set: ${this.state.elevationDeg} deg`);
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
    const headingDeg = this.state.turretHeadingDeg;
    const elevationDeg = this.state.turretElevationDeg;
    const headingRad = toRadians(headingDeg);
    const elevationRad = toRadians(elevationDeg);

    const v = tank.muzzleVelocity;
    const drag = shell.drag;
    const rangeM = clamp(((v * v) * Math.sin(2 * elevationRad) / GRAVITY) * drag, 0, tank.maxRangeM);
    const flightTime = Math.max(0.75, (2 * v * Math.sin(elevationRad)) / GRAVITY);

    const start = this._getBarrelMuzzlePosition();
    const v0Units = v / METERS_PER_UNIT;

    // Evaluate impact first so we can aim the bullet at the actual scatter point
    const impact = this._evaluateImpact(rangeM, headingDeg, tank);

    // Aim horizontal velocity directly at the scatter landing point
    const landX = impact.impactPoint ? impact.impactPoint.x : Math.sin(headingRad) * metersToUnits(rangeM);
    const landZ = impact.impactPoint ? impact.impactPoint.z : Math.cos(headingRad) * metersToUnits(rangeM);
    const landDist = Math.sqrt(landX * landX + landZ * landZ);
    const horizSpeed = landDist / flightTime;
    const horizHeadingX = landDist > 0.001 ? landX / landDist : Math.sin(headingRad);
    const horizHeadingZ = landDist > 0.001 ? landZ / landDist : Math.cos(headingRad);
    const v0 = new THREE.Vector3(
      horizHeadingX * horizSpeed,
      Math.sin(elevationRad) * v0Units,
      horizHeadingZ * horizSpeed,
    );

    // Elongated slug geometry — long axis along local Z, will be rotated to velocity direction each tick
    const slugGeo = new THREE.CylinderGeometry(0.055, 0.08, 0.58, 10);
    slugGeo.rotateX(Math.PI / 2);
    const projectile = new THREE.Mesh(
      slugGeo,
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.22, metalness: 0.78 }),
    );
    projectile.position.copy(start);
    this.projectileGroup.add(projectile);

    const trail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([start.clone(), start.clone()]),
      new THREE.LineBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.52 }),
    );
    this.projectileGroup.add(trail);

    this.state.projectiles.push({
      owner: 'player',
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
    // Nominal impact point from heading + range
    const nomX = Math.sin(toRadians(headingDeg)) * metersToUnits(rangeM);
    const nomZ = Math.cos(toRadians(headingDeg)) * metersToUnits(rangeM);

    // Apply 2D circular dispersion scatter so it can land short, long, left or right
    const dispAngle = Math.random() * Math.PI * 2;
    const dispRadius = randRange(0, tank.dispersionM);
    const scatterX = nomX + Math.cos(dispAngle) * metersToUnits(dispRadius);
    const scatterZ = nomZ + Math.sin(dispAngle) * metersToUnits(dispRadius);

    // Find nearest alive target to the actual scatter point
    let nearest = null;
    let nearestDistM = Number.POSITIVE_INFINITY;

    for (const target of this.state.targets) {
      if (!target.alive) continue;
      const dx = scatterX - target.x;
      const dz = scatterZ - target.z;
      const distM = unitsToMeters(Math.sqrt(dx * dx + dz * dz));
      if (distM < nearestDistM) {
        nearestDistM = distM;
        nearest = target;
      }
    }

    if (!nearest) {
      return { hit: false, targetId: null, missDistanceM: 9999 };
    }

    const hitWindow = nearest.hitRadiusM + tank.caliberMm * 0.05;

    return {
      hit: nearestDistM <= hitWindow,
      targetId: nearest.id,
      missDistanceM: nearestDistM,
      impactPoint: { x: scatterX, z: scatterZ },
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
      this._addHistory(`\u2715 Missed (${projectile.impact.missDistanceM.toFixed(0)} m off)`);
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
    this._addHistory(`\u2192 ${projectile.shellType} hit ${target.label} for ${damage}`);

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
    this._addHistory(`\u2192 ${shellType} hit cluster for ${damage}`);

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
      this.state.selectedTargetId = null;
      this.state.rangefinderMeters = null;
    }

    this._updateTargetSelect();
  }

  _getSelectedTarget() {
    return this.state.targets.find((t) => t.id === this.state.selectedTargetId) || null;
  }

  _selectTarget(targetId) {
    const target = this.state.targets.find((item) => item.id === targetId && item.alive);
    if (!target) return false;

    this.state.selectedTargetId = target.id;
    this.state.rangefinderMeters = null;
    this._updateUI();
    this._updateTargetOverlays();
    return true;
  }

  _selectTargetAtClientPoint(clientX, clientY) {
    const canvas = this.engine?.renderer?.domElement;
    if (!canvas || !this._targetHitBoxes?.length) return false;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const hit = this._targetHitBoxes.find((box) => (
      x >= box.left
      && x <= box.right
      && y >= box.top
      && y <= box.bottom
    ));
    return hit ? this._selectTarget(hit.targetId) : false;
  }

  _updateTargetSelect() {
    const aliveTargets = this.state.targets.filter((t) => t.alive);

    if (!this.targetSelect) {
      return;
    }

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
    const local = new THREE.Vector3(0, 0, this._barrelVisualLength || BARREL_VISUALS.m109.length);
    this.barrelPivot.updateMatrixWorld();
    return this.barrelPivot.localToWorld(local.clone());
  }

  _syncTurretToHeading() {
    const headingRad = toRadians(this.state.turretHeadingDeg);
    this.turretGroup.rotation.y = headingRad;

    const elevation = toRadians(this.state.turretElevationDeg);
    this.barrelPivot.rotation.x = -elevation;
  }

  _syncPeriscopeCameraPose() {
    const cam = this.engine?.camera;
    if (!cam || !this.turretCameraMount || !this.barrelPivot) return;

    this.turretCameraMount.updateMatrixWorld(true);

    const mountWorld = new THREE.Vector3();
    this.turretCameraMount.getWorldPosition(mountWorld);

    const barrelWorldQ = new THREE.Quaternion();
    this.barrelPivot.getWorldQuaternion(barrelWorldQ);

    const barrelForward = new THREE.Vector3(0, 0, 1).applyQuaternion(barrelWorldQ).normalize();
    const barrelUp = new THREE.Vector3(0, 1, 0).applyQuaternion(barrelWorldQ).normalize();
    const barrelRight = new THREE.Vector3(1, 0, 0).applyQuaternion(barrelWorldQ).normalize();
    const worldOffset = this._periscopeCameraOffset.clone().applyQuaternion(barrelWorldQ);

    cam.position.copy(mountWorld).add(worldOffset);
    if (this._cameraShake?.time > 0) {
      const progress = this._cameraShake.time / this._cameraShake.duration;
      const strength = this._cameraShake.strength * progress;
      cam.position
        .add(barrelRight.clone().multiplyScalar(randRange(-strength, strength)))
        .add(barrelUp.clone().multiplyScalar(randRange(-strength, strength)));
    }
    cam.up.copy(barrelUp);
    cam.lookAt(cam.position.clone().add(barrelForward));
    cam.updateMatrixWorld();
  }

  _tickTurretMotion(dt) {
    const tank = TANKS[this.state.selectedTank];
    if (!tank) return;

    this.state.turretHeadingDeg = this.state.headingDeg;
    this.state.turretElevationDeg = this.state.elevationDeg;
    this._syncTurretToHeading();
    return;

    const maxTraverseStep = tank.traverseDegPerSec * dt;
    const maxElevStep = tank.elevateDegPerSec * dt;

    const headingDelta = shortestSignedAngleDeg(this.state.turretHeadingDeg, this.state.headingDeg);
    const headingStep = clamp(headingDelta, -maxTraverseStep, maxTraverseStep);
    this.state.turretHeadingDeg = (this.state.turretHeadingDeg + headingStep + 360) % 360;

    const elevDelta = this.state.elevationDeg - this.state.turretElevationDeg;
    const elevStep = clamp(elevDelta, -maxElevStep, maxElevStep);
    this.state.turretElevationDeg = clamp(this.state.turretElevationDeg + elevStep, MIN_ELEVATION_DEG, 75);

    // Snap tiny residual error to avoid infinite asymptotic settling.
    if (Math.abs(shortestSignedAngleDeg(this.state.turretHeadingDeg, this.state.headingDeg)) < 0.05) {
      this.state.turretHeadingDeg = this.state.headingDeg;
    }
    if (Math.abs(this.state.elevationDeg - this.state.turretElevationDeg) < 0.05) {
      this.state.turretElevationDeg = this.state.elevationDeg;
    }

    this._syncTurretToHeading();
  }

  _addHistory(message) {
    this.state.history.push(message);
    if (this.state.history.length > 14) this.state.history.shift();
  }

  _updateTargetOverlays() {
    if (!this.targetOverlay) return;
    this.targetOverlay.innerHTML = '';
    this._targetHitBoxes = [];

    const canvas = this.engine.renderer.domElement;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    const camera = this.engine.camera;

    for (const target of this.state.targets) {
      if (!target.alive) continue;

      const worldPos = new THREE.Vector3(target.x, 0.5, target.z);
      const ndc = worldPos.clone().project(camera);
      if (ndc.z > 1) continue;

      const sx = (ndc.x * 0.5 + 0.5) * W;
      const sy = (-ndc.y * 0.5 + 0.5) * H;

      const domeR = target.type === 'large' ? 0.5 : target.type === 'cluster' ? 0.55 : 0.35;
      const edgeNDC = new THREE.Vector3(target.x + domeR, 0.5, target.z).project(camera);
      const edgeSX = (edgeNDC.x * 0.5 + 0.5) * W;
      const half = Math.max(24, Math.min(78, Math.abs(edgeSX - sx) * 3.5));

      const isSelected = target.id === this.state.selectedTargetId;
      const borderColor = isSelected ? '#ef4444' : 'rgba(74,222,128,0.65)';
      const textColor = isSelected ? '#fecaca' : '#86efac';

      const measured = this.state.measuredTargets[target.id];
      const hpText = target.type === 'cluster'
        ? `${target.subDomes.filter((s) => s.alive).length}/${target.subDomes.length} sub`
        : `${Math.max(0, Math.round(target.hp))} HP`;

      const lines = [
        `<b>${target.label}</b>`,
        `${formatMeters(target.distanceM)} \u00b7 ${target.headingDeg.toFixed(0)}\u00b0`,
        hpText,
        measured ? 'Ranged \u2713' : '',
      ].filter(Boolean).join('<br>');

      const wrapper = document.createElement('div');
      const hitPad = 8;
      this._targetHitBoxes.push({
        targetId: target.id,
        left: sx - half - hitPad,
        right: sx + half + hitPad,
        top: sy - half - hitPad,
        bottom: sy + half + hitPad,
      });
      wrapper.style.cssText = [
        'position:absolute',
        `left:${(sx - half).toFixed(1)}px`,
        `top:${(sy - half).toFixed(1)}px`,
        `width:${(half * 2).toFixed(1)}px`,
        `height:${(half * 2).toFixed(1)}px`,
        `border:${isSelected ? 2 : 1}px solid ${borderColor}`,
        `background:${isSelected ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.04)'}`,
        'pointer-events:auto',
        'cursor:pointer',
        'box-sizing:border-box',
        'z-index:13',
      ].join(';');
      wrapper.setAttribute('role', 'button');
      wrapper.setAttribute('tabindex', '0');
      wrapper.setAttribute('aria-label', `Select ${target.label}`);

      const selectTarget = (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        this._selectTarget(target.id);
      };
      wrapper.addEventListener('pointerdown', selectTarget);
      wrapper.addEventListener('click', selectTarget);
      wrapper.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') selectTarget(event);
      });

      const lbl = document.createElement('div');
      lbl.style.cssText = [
        'position:absolute',
        'bottom:calc(100% + 4px)',
        'left:50%',
        'transform:translateX(-50%)',
        'background:rgba(0,0,0,0.78)',
        `color:${textColor}`,
        'font-size:10px',
        'font-family:monospace',
        'white-space:nowrap',
        'padding:2px 5px',
        'border-radius:3px',
        'line-height:1.5',
        'text-align:center',
        `border:1px solid ${borderColor}`,
        'pointer-events:none',
      ].join(';');
      lbl.innerHTML = lines;

      wrapper.appendChild(lbl);
      this.targetOverlay.appendChild(wrapper);
    }
  }

  _updateUI() {
    const tank = TANKS[this.state.selectedTank];
    const selectedTarget = this._getSelectedTarget();
    const currentShell = SHELLS[this.state.selectedShell];
    const elevRad = toRadians(this.state.turretElevationDeg);
    const estCurrentElevationRange = Math.max(0, ((tank.muzzleVelocity ** 2) * Math.sin(2 * elevRad) / GRAVITY) * currentShell.drag);
    const shellMaxAt45 = this._getShellBallisticMaxRangeM(tank, currentShell);
    const bestShellBallisticMax = this._getBestShellBallisticMaxRangeM(tank);
    const effectiveCombatRange = this._getEffectiveCombatRangeM(tank);

    const maxHealth = tank.health;
    const healthPct = clamp(this.state.tankHealth / maxHealth, 0, 1);
    if (this.statusToggle) {
      this.statusToggle.textContent = `${this.statusExpanded ? '▾' : '▸'} Tank Status`;
    }
    if (this.statusDetails) {
      this.statusDetails.style.display = this.statusExpanded ? 'block' : 'none';
    }
    this.healthLine.textContent = `Health: ${Math.round(this.state.tankHealth)} / ${maxHealth}`;
    this.healthBar.style.width = `${(healthPct * 100).toFixed(1)}%`;
    this.healthBar.style.background = healthPct > 0.6 ? '#4ade80' : healthPct > 0.3 ? '#facc15' : '#f87171';

    this.tankSpecBox.innerHTML = [
      `${tank.name} (${tank.role})`,
      `Spec max range: ${formatMeters(tank.maxRangeM)}`,
      `Ballistic max @45° (best shell): ${formatMeters(bestShellBallisticMax)}`,
      `Effective combat range: ${formatMeters(effectiveCombatRange)}`,
      `Gun: ${tank.caliberMm} mm`,
      `Muzzle velocity: ${Math.round(tank.muzzleVelocity)} m/s`,
      `Reload: ${tank.reloadSec.toFixed(1)} s`,
      `Traverse: ${tank.traverseDegPerSec.toFixed(1)} deg/s`,
      `Elevation slew: ${tank.elevateDegPerSec.toFixed(1)} deg/s`,
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

    const headingErr = Math.abs(shortestSignedAngleDeg(this.state.turretHeadingDeg, this.state.headingDeg));
    const elevationErr = Math.abs(this.state.elevationDeg - this.state.turretElevationDeg);
    const alignState = headingErr < 0.15 && elevationErr < 0.15 ? 'Aligned' : 'Slewing';
    this.reloadReadout.textContent = `Turret: ${alignState}`;

    if (this.headingHud) {
      this.headingHud.textContent = `HDG ${this.state.turretHeadingDeg.toFixed(1)}°`;
    }
    if (this.elevationHud) {
      this.elevationHud.textContent = [
        `EL ${this.state.turretElevationDeg.toFixed(1)}°`,
        `CMD ${this.state.elevationDeg.toFixed(1)}°`,
      ].join('\n');
    }

    if (this.rangeEstReadout) {
      this.rangeEstReadout.textContent = [
        `Est. range @ current EL: ${formatMeters(estCurrentElevationRange)}`,
        `${currentShell.label} max @45°: ${formatMeters(shellMaxAt45)}`,
        `Spec max: ${formatMeters(tank.maxRangeM)}`,
      ].join(' | ');
    }

    this.fireButton.textContent = this.state.reloadRemaining > 0
      ? `Reload ${this.state.reloadRemaining.toFixed(1)} s`
      : 'Fire';

    this.fireButton.disabled = this.state.gameOver;
    this.rangefinderButton.disabled = this.state.gameOver;

    if (this.state.gameOver) {
      this.actionHint.textContent = 'Tank destroyed. Restart run to continue.';
    } else if (this.state.roundTransition > 0) {
      this.actionHint.textContent = `Next round in ${Math.ceil(this.state.roundTransition)}...`;
    } else {
      this.actionHint.textContent = 'Hint: rangefinder is optional. You can fire by eyeballing heading/elevation.';
    }

    const showLeaderboard = this.state.gameOver;
    if (this.bottomRight?.el) {
      this.bottomRight.el.style.display = showLeaderboard ? 'block' : 'none';
    }
    if (this.leaderboardTitle) {
      this.leaderboardTitle.style.display = showLeaderboard ? 'block' : 'none';
    }
    this.leaderboardList.style.display = showLeaderboard ? 'block' : 'none';
    this.leaderboardList.innerHTML = showLeaderboard
      ? (this.leaderboard.length
        ? this.leaderboard
          .map((entry, index) => `${index + 1}. ${entry.score} pts | Round ${entry.round} | ${entry.tank}`)
          .join('<br>')
        : 'No saved runs yet.')
      : '';
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

  _clearTrees() {
    if (!this.sceneryGroup) return;

    while (this.sceneryGroup.children.length) {
      const child = this.sceneryGroup.children.pop();
      this.sceneryGroup.remove(child);
      child.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
      });
    }
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
  this._clearTrees();

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
    if (this.targetOverlay?.parentNode) this.targetOverlay.parentNode.removeChild(this.targetOverlay);
    if (this.hudOverlay?.parentNode) this.hudOverlay.parentNode.removeChild(this.hudOverlay);

    if (this.treeMaterials) {
      Object.values(this.treeMaterials).forEach((mat) => mat.dispose());
    }

    this.engine?.dispose();
  }
}
