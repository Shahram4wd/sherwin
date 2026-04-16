/**
 * Sherwin Universe — Mini-App Game Engine
 * Shared utilities for all interactive simulations and mini-games.
 *
 * Provides:
 *   - SceneManager: Three.js scene bootstrap (renderer, camera, lights, orbit, resize, loop)
 *   - ParticlePool: reusable instanced-mesh particle system for high perf
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
   */
  constructor(container, opts = {}) {
    this.container = container;
    this.opts = Object.assign(
      { background: '#0a0a12', orbit: true, fov: 50, near: 0.1, far: 2000 },
      opts,
    );

    this._clock = new THREE.Clock();
    this._callbacks = [];
    this._running = false;

    this._initRenderer();
    this._initCamera();
    this._initScene();
    if (this.opts.orbit) this._initOrbit();
    this._initLights();
    this._handleResize();
  }

  /* --- internals -------------------------------------------------- */

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(this.opts.background);
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
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);
    this._onResize = onResize;
  }

  /* --- public API ------------------------------------------------- */

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
      this.renderer.render(this.scene, this.camera);
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
/*  UIPanel — tiny helper to build overlay control panels              */
/* ------------------------------------------------------------------ */

export class UIPanel {
  constructor(container, position = 'top-left') {
    this.el = document.createElement('div');
    this.el.className = `miniapp-panel miniapp-panel--${position}`;
    container.appendChild(this.el);
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
