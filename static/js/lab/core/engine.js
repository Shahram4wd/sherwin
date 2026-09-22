/**
 * Sherwin Universe — Mini-App Game Engine
 * Shared utilities for all interactive simulations and mini-games.
 *
 * Provides:
 *   - SceneManager: Three.js scene bootstrap (renderer, camera, lights, orbit, resize, loop)
 *       opt-in: ACES tone mapping, soft shadows, room environment reflections, bloom
 *   - ParticlePool: reusable instanced-mesh particle system for high perf
 *   - BurstSystem: GPU point sprites for sparks, embers, debris and dust
 *   - makeGlowTexture: soft radial sprite texture for flashes and fireballs
 *   - UIPanel: lightweight overlay panel builder
 *   - formatHalfLife / lerp / clamp / etc. pure helpers
 *
 * Every mini-app imports what it needs — no globals polluted.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Re-export THREE so other modules can use it
export { THREE };

/* ------------------------------------------------------------------ */
/*  SceneManager                                                      */
/* ------------------------------------------------------------------ */

export class SceneManager {
  /**
   * @param {HTMLElement} container  DOM element to mount the canvas in
   * @param {Object} opts
   * @param {string} opts.background  hex colour, default '#0a0a12'
   * @param {boolean} opts.orbit      enable OrbitControls, default true
   * @param {number} opts.fov         camera FOV, default 50
   * @param {number} opts.near        camera near plane, default 0.1
   * @param {number} opts.far         camera far plane, default 2000
   * @param {boolean} opts.shadows    enable soft shadow maps, default false
   * @param {'none'|'aces'} opts.toneMapping  default 'none' (legacy look)
   * @param {number} opts.exposure    tone mapping exposure, default 1
   * @param {boolean} opts.defaultLights  add the stock ambient/key/point lights, default true
   */
  constructor(container, opts = {}) {
    this.container = container;
    this.opts = Object.assign(
      {
        background: '#0a0a12', orbit: true, fov: 50, near: 0.1, far: 2000,
        shadows: false, toneMapping: 'none', exposure: 1, defaultLights: true,
      },
      opts,
    );

    this._clock = new THREE.Clock();
    this._callbacks = [];
    this._running = false;
    this.composer = null;
    this._pmrem = null;
    this._envTexture = null;

    this._initRenderer();
    this._initCamera();
    this._initScene();
    if (this.opts.orbit) this._initOrbit();
    if (this.opts.defaultLights) this._initLights();
    this._handleResize();
  }

  /* --- internals -------------------------------------------------- */

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(this.opts.background);
    if (this.opts.shadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    if (this.opts.toneMapping === 'aces') {
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = this.opts.exposure;
    }
    this.container.appendChild(this.renderer.domElement);
  }

  _initCamera() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(this.opts.fov, aspect, this.opts.near, this.opts.far);
    this.camera.position.set(0, 0, 30);
  }

  _initScene() {
    this.scene = new THREE.Scene();
  }

  _initOrbit() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 200;
  }

  _initLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(10, 15, 10);
    this.scene.add(dir);
    const point = new THREE.PointLight(0xff4d4d, 0.4, 100);
    point.position.set(-5, 5, 5);
    this.scene.add(point);
  }

  _handleResize() {
    const onResize = () => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      if (!w || !h) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      if (this.composer) this.composer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);
    this._onResize = onResize;
  }

  /* --- public API ------------------------------------------------- */

  /**
   * Give PBR materials something to reflect: a neutral studio room baked to a PMREM.
   * Metal and glass look like metal and glass afterwards.
   */
  async setEnvironment(intensity = 1) {
    const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
    this._pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this._envTexture = this._pmrem.fromScene(room, 0.04).texture;
    this.scene.environment = this._envTexture;
    if ('environmentIntensity' in this.scene) this.scene.environmentIntensity = intensity;
    return this._envTexture;
  }

  /**
   * Post-processing bloom for emissive glows (tracers, flashes, fluid).
   * Renders through an EffectComposer; the loop picks it up automatically.
   */
  async enableBloom({ strength = 0.45, radius = 0.5, threshold = 0.85 } = {}) {
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
      import('three/addons/postprocessing/EffectComposer.js'),
      import('three/addons/postprocessing/RenderPass.js'),
      import('three/addons/postprocessing/UnrealBloomPass.js'),
      import('three/addons/postprocessing/OutputPass.js'),
    ]);
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    const composer = new EffectComposer(this.renderer);
    composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), strength, radius, threshold);
    composer.addPass(this.bloomPass);
    composer.addPass(new OutputPass());
    composer.setSize(w, h);
    this.composer = composer;
    return composer;
  }

  /** Register a per-frame callback: fn(deltaTime, elapsedTime) */
  onTick(fn) {
    this._callbacks.push(fn);
    return this;
  }

  /** Start the render loop */
  start() {
    if (this._running) return;
    this._running = true;
    const tick = () => {
      if (!this._running) return;
      requestAnimationFrame(tick);
      const dt = this._clock.getDelta();
      const t = this._clock.getElapsedTime();
      for (const cb of this._callbacks) cb(dt, t);
      if (this.controls) this.controls.update();
      if (this.composer) this.composer.render(dt);
      else this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  /** Stop the render loop */
  stop() {
    this._running = false;
  }

  /** Clean up everything */
  dispose() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
    if (this.composer && this.composer.dispose) this.composer.dispose();
    if (this._envTexture) this._envTexture.dispose();
    if (this._pmrem) this._pmrem.dispose();
    this.renderer.dispose();
    if (this.controls) this.controls.dispose();
    this.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}

/* ------------------------------------------------------------------ */
/*  ParticlePool  (InstancedMesh wrapper for lots of spheres)         */
/* ------------------------------------------------------------------ */

export class ParticlePool {
  /**
   * @param {THREE.Scene} scene
   * @param {number} maxCount      max simultaneous particles
   * @param {number} radius        sphere radius
   * @param {number} color         hex colour
   * @param {Object} opts
   * @param {boolean} opts.emissive  add emissive glow
   */
  constructor(scene, maxCount, radius, color, opts = {}) {
    const geo = new THREE.SphereGeometry(radius, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.2,
    });
    if (opts.emissive) {
      mat.emissive = new THREE.Color(color);
      mat.emissiveIntensity = 0.3;
    }

    this.mesh = new THREE.InstancedMesh(geo, mat, maxCount);
    this.mesh.count = 0;
    this._dummy = new THREE.Object3D();
    this._positions = [];
    this._velocities = [];
    this.maxCount = maxCount;
    scene.add(this.mesh);
  }

  /** Add a particle at (x,y,z) with optional velocity */
  add(x, y, z, vx = 0, vy = 0, vz = 0) {
    if (this.mesh.count >= this.maxCount) return -1;
    const idx = this.mesh.count++;
    this._positions[idx] = new THREE.Vector3(x, y, z);
    this._velocities[idx] = new THREE.Vector3(vx, vy, vz);
    this._updateMatrix(idx);
    return idx;
  }

  /** Remove particle at index (swap with last) */
  remove(idx) {
    const last = this.mesh.count - 1;
    if (idx < last) {
      this._positions[idx].copy(this._positions[last]);
      this._velocities[idx].copy(this._velocities[last]);
      this._updateMatrix(idx);
    }
    this.mesh.count--;
  }

  /** Clear all */
  clear() {
    this.mesh.count = 0;
    this._positions.length = 0;
    this._velocities.length = 0;
  }

  /** Move all particles by their velocity * dt */
  tick(dt) {
    for (let i = 0; i < this.mesh.count; i++) {
      this._positions[i].addScaledVector(this._velocities[i], dt);
      this._updateMatrix(i);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  getPosition(idx) {
    return this._positions[idx];
  }

  setPosition(idx, x, y, z) {
    this._positions[idx].set(x, y, z);
    this._updateMatrix(idx);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  _updateMatrix(idx) {
    this._dummy.position.copy(this._positions[idx]);
    this._dummy.updateMatrix();
    this.mesh.setMatrixAt(idx, this._dummy.matrix);
  }
}

/* ------------------------------------------------------------------ */
/*  Glow sprite texture + BurstSystem (GPU point sprites)              */
/* ------------------------------------------------------------------ */

/** Soft radial sprite: white core fading to transparent. Tint with material.color. */
export function makeGlowTexture(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Sparks, embers, debris, dust. One draw call, per-particle size/colour/alpha,
 * simple gravity + drag integration on the CPU.
 */
export class BurstSystem {
  /**
   * @param {THREE.Scene} scene
   * @param {Object} opts
   * @param {number} opts.max        pool size (default 800)
   * @param {number} opts.gravity    world units/s^2 applied on Y (default -9.8)
   * @param {boolean} opts.additive  additive blending (glowing) vs normal (dust/debris)
   * @param {number} opts.sizeScale  pixels per world unit at distance 1 (default 320)
   */
  constructor(scene, { max = 800, gravity = -9.8, additive = true, sizeScale = 320 } = {}) {
    this.max = max;
    this.count = 0;
    this.gravity = gravity;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.baseSize = new Float32Array(max);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    geo.setDrawRange(0, 0);

    const mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: sizeScale }, uMap: { value: makeGlowTexture(64) } },
      vertexShader: `
        attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
        varying vec3 vColor; varying float vAlpha;
        uniform float uScale;
        void main() {
          vColor = aColor; vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(aSize * uScale / max(-mv.z, 0.001), 1.0, 96.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D uMap; varying vec3 vColor; varying float vAlpha;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          gl_FragColor = vec4(vColor, t.a * vAlpha);
          if (gl_FragColor.a < 0.01) discard;
        }`,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this._tmp = new THREE.Color();
  }

  /**
   * @param {THREE.Vector3|{x,y,z}} origin
   * @param {Object} o
   * @param {number} o.count
   * @param {[number,number]} o.speed   min/max initial speed
   * @param {THREE.Vector3} [o.dir]     bias direction (default up)
   * @param {number} [o.spread]         0 = tight cone along dir, 1 = full sphere
   * @param {[number,number]} o.life    seconds
   * @param {[number,number]} o.size    world units
   * @param {number|number[]} o.color   hex or list of hex to pick from
   * @param {number} [o.drag]           per-second velocity retention (0.9 = loses 10%/s)
   * @param {number} [o.jitter]         random position offset radius
   */
  emit(origin, o) {
    const dir = o.dir ? o.dir.clone().normalize() : new THREE.Vector3(0, 1, 0);
    const spread = o.spread ?? 0.6;
    const colors = Array.isArray(o.color) ? o.color : [o.color ?? 0xffffff];
    for (let n = 0; n < o.count; n++) {
      if (this.count >= this.max) break;
      const i = this.count++;
      const jitter = o.jitter ?? 0;
      this.pos[i * 3] = origin.x + (Math.random() - 0.5) * 2 * jitter;
      this.pos[i * 3 + 1] = origin.y + (Math.random() - 0.5) * 2 * jitter;
      this.pos[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 2 * jitter;
      // random direction blended toward dir by (1 - spread)
      const rx = Math.random() * 2 - 1, ry = Math.random() * 2 - 1, rz = Math.random() * 2 - 1;
      const rl = Math.hypot(rx, ry, rz) || 1;
      const vx = dir.x * (1 - spread) + (rx / rl) * spread;
      const vy = dir.y * (1 - spread) + (ry / rl) * spread;
      const vz = dir.z * (1 - spread) + (rz / rl) * spread;
      const vl = Math.hypot(vx, vy, vz) || 1;
      const speed = o.speed[0] + Math.random() * (o.speed[1] - o.speed[0]);
      this.vel[i * 3] = (vx / vl) * speed;
      this.vel[i * 3 + 1] = (vy / vl) * speed;
      this.vel[i * 3 + 2] = (vz / vl) * speed;
      this._tmp.setHex(colors[Math.floor(Math.random() * colors.length)]);
      this.col[i * 3] = this._tmp.r; this.col[i * 3 + 1] = this._tmp.g; this.col[i * 3 + 2] = this._tmp.b;
      this.maxLife[i] = o.life[0] + Math.random() * (o.life[1] - o.life[0]);
      this.life[i] = this.maxLife[i];
      this.baseSize[i] = o.size[0] + Math.random() * (o.size[1] - o.size[0]);
      this.size[i] = this.baseSize[i];
      this.alpha[i] = 1;
      this.drag[i] = o.drag ?? 1;
    }
    this._dirty();
  }

  tick(dt) {
    if (!this.count) return;
    const g = this.gravity * dt;
    for (let i = 0; i < this.count; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this._swapRemove(i);
        i--;
        continue;
      }
      const keep = Math.pow(this.drag[i], dt);
      this.vel[i * 3] *= keep;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * keep + g;
      this.vel[i * 3 + 2] *= keep;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const t = this.life[i] / this.maxLife[i];
      this.alpha[i] = Math.min(1, t * 1.6);
      this.size[i] = this.baseSize[i] * (0.6 + 0.4 * t);
    }
    this._dirty();
  }

  clear() {
    this.count = 0;
    this._dirty();
  }

  _swapRemove(i) {
    const last = --this.count;
    if (i === last) return;
    for (let k = 0; k < 3; k++) {
      this.pos[i * 3 + k] = this.pos[last * 3 + k];
      this.vel[i * 3 + k] = this.vel[last * 3 + k];
      this.col[i * 3 + k] = this.col[last * 3 + k];
    }
    this.size[i] = this.size[last]; this.alpha[i] = this.alpha[last];
    this.life[i] = this.life[last]; this.maxLife[i] = this.maxLife[last];
    this.drag[i] = this.drag[last]; this.baseSize[i] = this.baseSize[last];
  }

  _dirty() {
    const geo = this.points.geometry;
    geo.setDrawRange(0, this.count);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aColor.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;
  }

  dispose() {
    this.points.parent?.remove(this.points);
    this.points.geometry.dispose();
    this.points.material.uniforms.uMap.value.dispose();
    this.points.material.dispose();
  }
}

/* ------------------------------------------------------------------ */
/*  UIPanel — tiny helper to build overlay control panels              */
/* ------------------------------------------------------------------ */

export class UIPanel {
  constructor(container, position = 'top-left', mobileLabel = '') {
    this.el = document.createElement('div');
    this.el.className = `miniapp-panel miniapp-panel--${position}`;
    this.el.dataset.panelPosition = position;
    container.appendChild(this.el);
    this._attachMobileToggle(container, position, mobileLabel);
  }

  _attachMobileToggle(container, position, mobileLabel) {
    const labelMap = {
      'top-left': 'Controls',
      'top-right': 'Status',
      'bottom-left': 'Actions',
      'bottom-right': 'History',
    };
    const iconMap = {
      'top-left': this._buildTabIcon('controls'),
      'top-right': this._buildTabIcon('status'),
      'bottom-left': this._buildTabIcon('actions'),
      'bottom-right': this._buildTabIcon('history'),
    };
    const label = mobileLabel || labelMap[position] || 'Panel';
    this.el.dataset.mobileLabel = label;

    let dock = container.querySelector('.miniapp-mobile-dock');
    if (!dock) {
      dock = document.createElement('div');
      dock.className = 'miniapp-mobile-dock';
      container.appendChild(dock);
      this._ensureMobileHint(container, dock);
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'miniapp-mobile-tab';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = `
      <span class="miniapp-mobile-tab-icon" aria-hidden="true">${iconMap[position] || iconMap['top-left']}</span>
      <span class="miniapp-sr-only">${label}</span>
    `;
    btn.addEventListener('click', () => {
      const shouldActivate = !this.el.classList.contains('is-active');
      container.querySelectorAll('.miniapp-panel.is-active').forEach((panel) => {
        panel.classList.remove('is-active');
      });
      dock.querySelectorAll('.miniapp-mobile-tab.is-active').forEach((tab) => {
        tab.classList.remove('is-active');
        tab.setAttribute('aria-expanded', 'false');
      });

      if (shouldActivate) {
        this.el.classList.add('is-active');
        btn.classList.add('is-active');
        btn.setAttribute('aria-expanded', 'true');
      }
    });

    dock.appendChild(btn);
    this._mobileToggle = btn;
  }

  _buildTabIcon(kind) {
    const icons = {
      controls: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="11" cy="18" r="2"/></svg>',
      status: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19V9"/><path d="M12 19V5"/><path d="M19 19v-7"/></svg>',
      actions: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
      history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6h12"/><path d="M6 12h12"/><path d="M6 18h8"/></svg>',
    };
    return icons[kind] || icons.controls;
  }

  _ensureMobileHint(container, dock) {
    const hint = document.createElement('div');
    hint.className = 'miniapp-mobile-hint';
    hint.textContent = 'Tap a tab to open controls without covering the experiment.';
    container.appendChild(hint);

    const hideHint = () => {
      hint.classList.remove('is-visible');
      try {
        window.sessionStorage.setItem('miniapp-mobile-hint-dismissed', '1');
      } catch {
        // Ignore session storage failures.
      }
    };

    dock.addEventListener('click', hideHint, { once: true });

    const showHint = () => {
      const isMobile = window.matchMedia('(max-width: 640px), (max-width: 960px) and (max-height: 540px) and (orientation: landscape)').matches;
      if (!isMobile) return;

      let dismissed = false;
      try {
        dismissed = window.sessionStorage.getItem('miniapp-mobile-hint-dismissed') === '1';
      } catch {
        dismissed = false;
      }
      if (dismissed) return;

      hint.classList.add('is-visible');
      window.setTimeout(() => {
        hint.classList.remove('is-visible');
      }, 4800);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showHint, { once: true });
    } else {
      showHint();
    }
  }

  addHTML(html) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    this.el.appendChild(wrapper);
    return wrapper;
  }

  addButton(label, onClick, className = '') {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = `miniapp-btn ${className}`.trim();
    btn.addEventListener('click', onClick);
    this.el.appendChild(btn);
    return btn;
  }

  addSlider(label, min, max, value, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'miniapp-slider-group';
    const lbl = document.createElement('label');
    lbl.textContent = `${label}: `;
    const valSpan = document.createElement('span');
    valSpan.textContent = value;
    lbl.appendChild(valSpan);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.value = value;
    input.className = 'miniapp-slider';
    input.addEventListener('input', () => {
      valSpan.textContent = input.value;
      onChange(Number(input.value));
    });
    wrapper.appendChild(lbl);
    wrapper.appendChild(input);
    this.el.appendChild(wrapper);
    /** Programmatically set value AND update the visible label */
    input.setValue = (v) => {
      v = Math.max(Number(input.min), Math.min(Number(input.max), v));
      input.value = v;
      valSpan.textContent = v;
    };
    return input;
  }

  addDisplay(id, html) {
    const el = document.createElement('div');
    el.id = id;
    el.className = 'miniapp-display';
    el.innerHTML = html;
    this.el.appendChild(el);
    return el;
  }
}

/* ------------------------------------------------------------------ */
/*  Pure helpers                                                       */
/* ------------------------------------------------------------------ */

export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function randRange(lo, hi) { return lo + Math.random() * (hi - lo); }
export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Convert seconds to a human-readable half-life string */
export function formatHalfLife(seconds) {
  if (seconds < 0) return 'Stable';
  if (seconds < 1) return `${(seconds * 1000).toFixed(1)} ms`;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} hr`;
  if (seconds < 31557600) return `${(seconds / 86400).toFixed(1)} days`;
  const years = seconds / 31557600;
  if (years < 1e6) return `${years.toFixed(1)} yr`;
  return `${years.toExponential(2)} yr`;
}

/** Colour for stability: green = stable, yellow = long-lived, red = unstable */
export function stabilityColor(halfLifeSeconds) {
  if (halfLifeSeconds < 0) return '#22c55e';      // green – stable
  if (halfLifeSeconds > 3.15e12) return '#84cc16'; // lime – very long-lived
  if (halfLifeSeconds > 3.15e7) return '#eab308';  // yellow – long-lived
  if (halfLifeSeconds > 86400) return '#f97316';   // orange
  return '#ef4444';                                 // red – short-lived
}

/** Random point on sphere surface of given radius */
export function randomOnSphere(radius) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
  );
}
