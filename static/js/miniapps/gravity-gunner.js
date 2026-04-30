/* ================================================================
   Gravity Gunner — Sherwin Lab Mini-App
   Top-down space artillery game with gravity-field projectile curves.
   ================================================================ */

// ---- Constants --------------------------------------------------

const BASE_ANGLE = 0; // radians — rightward
const MAX_ANGLE_RAD = Math.PI * 55 / 180;
const MIN_VELOCITY = 220;
const MAX_VELOCITY = 900;
const MAX_DRAG = 260;
const ANGLE_SENSITIVITY = 0.004;
const MIN_GRAV_DIST = 50;
const MIN_GRAV_DIST_SQ = MIN_GRAV_DIST * MIN_GRAV_DIST;
const MAX_GRAV_ACCEL = 1200;
const MAX_PROJECTILES = 40;
const PROJECTILE_LIFETIME = 6;
const ENEMY_HIT_DAMAGE = 20;
const PLAYER_SHIELD_MAX = 100;
const STAR_COUNT = 140;
const TRAIL_LENGTH = 22;

const PRESETS = {
  'Easy Gravity': {
    gravityCount: 1,
    gravityStrength: 5_000_000,
    enemyFireInterval: 3.5,
    maxVelocity: 900,
  },
  'Heavy Gravity': {
    gravityCount: 3,
    gravityStrength: 12_000_000,
    enemyFireInterval: 2.8,
    maxVelocity: 900,
  },
  'Chaos Field': {
    gravityCount: 5,
    gravityStrength: 22_000_000,
    enemyFireInterval: 2.0,
    maxVelocity: 900,
  },
};

// ---- Helpers ----------------------------------------------------

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function circlesOverlap(x1, y1, r1, x2, y2, r2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const sum = r1 + r2;
  return dx * dx + dy * dy < sum * sum;
}

// ---- Main Class -------------------------------------------------

export class GravityGunnerApp {
  constructor(containerId) {
    this._containerId = containerId;
    this._container = null;
    this._canvas = null;
    this._ctx = null;
    this._rafId = null;
    this._lastTime = 0;

    // Bound handlers for cleanup
    this._boundPointerDown = null;
    this._boundPointerMove = null;
    this._boundPointerUp = null;
    this._boundResize = null;

    // Drag state
    this._drag = { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 };

    // ID counters
    this._nextEnemyId = 1;
    this._nextProjectileId = 1;
    this._nextGravityId = 1;

    // Preset / wave tracking
    this._activePresetName = 'Easy Gravity';
    this._activePreset = PRESETS['Easy Gravity'];
    this._waveCleared = false;

    // Stars (generated once)
    this._stars = [];

    // Core game state — single source of truth
    this.state = {
      running: false,
      paused: false,
      gameOver: false,
      score: 0,
      wave: 1,
      player: {
        x: 0,
        y: 0,
        radius: 22,
        shield: PLAYER_SHIELD_MAX,
        barrelAngle: BASE_ANGLE,
        chargePower: 0,
      },
      enemies: [],
      projectiles: [],
      gravityObjects: [],
      history: [],
      shotsFired: 0,
      hits: 0,
      incomingShots: 0,
    };
  }

  // ---- Initialisation -------------------------------------------

  async init() {
    this._container = document.getElementById(this._containerId);
    if (!this._container) throw new Error(`GravityGunner: container #${this._containerId} not found`);

    this._buildDOM();

    this._canvas = this._container.querySelector('#gg-canvas');
    this._ctx = this._canvas.getContext('2d');

    this._generateStars(STAR_COUNT);

    // Resize
    this._boundResize = () => this._onResize();
    window.addEventListener('resize', this._boundResize);
    this._onResize();

    // Pointer events (mouse + touch via pointer API)
    this._boundPointerDown = (e) => this._onPointerDown(e);
    this._boundPointerMove = (e) => this._onPointerMove(e);
    this._boundPointerUp   = (e) => this._onPointerUp(e);
    this._canvas.addEventListener('pointerdown',   this._boundPointerDown);
    this._canvas.addEventListener('pointermove',   this._boundPointerMove);
    this._canvas.addEventListener('pointerup',     this._boundPointerUp);
    this._canvas.addEventListener('pointercancel', this._boundPointerUp);

    // Start first wave then loop
    this._startWave();
    this.state.running = true;
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame((t) => this._loop(t));
  }

  // ---- DOM -------------------------------------------------------

  _buildDOM() {
    this._container.innerHTML = `
      <canvas id="gg-canvas"
        style="display:block;width:100%;height:100%;touch-action:none;cursor:crosshair;"
      ></canvas>

      <!-- Presets — top-center -->
      <div id="gg-presets"
        class="miniapp-panel"
        style="top:10px;left:50%;transform:translateX(-50%);
               display:flex;flex-wrap:wrap;justify-content:center;
               gap:5px;padding:7px 10px;z-index:30;max-width:95%;">
        ${Object.keys(PRESETS).map(name =>
          `<button class="miniapp-btn gg-preset-btn" data-preset="${name}">${name}</button>`
        ).join('')}
      </div>

      <!-- Top-left: Controls -->
      <div class="miniapp-panel miniapp-panel--top-left" style="top:56px;">
        <div class="miniapp-subtitle">Controls</div>
        <div class="miniapp-display" id="gg-power-display">Power: 0%</div>
        <div class="miniapp-display" id="gg-angle-display">Angle: 0°</div>
        <div style="margin-top:8px;">
          <div style="font-size:11px;color:#6b7280;margin-bottom:3px;">Charge</div>
          <div style="width:100%;height:5px;border-radius:3px;
                      background:rgba(255,255,255,0.08);overflow:hidden;">
            <div id="gg-power-bar"
              style="height:100%;width:0%;
                     background:linear-gradient(90deg,#22d3ee,#f59e0b);
                     border-radius:3px;transition:width 0.04s;"></div>
          </div>
        </div>
      </div>

      <!-- Top-right: Metrics -->
      <div class="miniapp-panel miniapp-panel--top-right" style="top:56px;">
        <div class="miniapp-subtitle">Metrics</div>
        <div class="miniapp-display">
          Score: <span id="gg-score" style="color:#fbbf24;font-weight:700;">0</span>
        </div>
        <div class="miniapp-display">
          Wave: <span id="gg-wave" style="color:#60a5fa;font-weight:700;">1</span>
        </div>
        <div class="miniapp-display">
          Shield: <span id="gg-shield" style="color:#4ade80;font-weight:700;">100</span>
        </div>
        <div class="miniapp-display">
          Enemies: <span id="gg-enemies" style="color:#f87171;font-weight:700;">—</span>
        </div>
        <div style="margin-top:8px;">
          <div style="font-size:11px;color:#6b7280;margin-bottom:3px;">Shield</div>
          <div style="width:100%;height:5px;border-radius:3px;
                      background:rgba(255,255,255,0.08);overflow:hidden;">
            <div id="gg-shield-bar"
              style="height:100%;width:100%;background:#4ade80;
                     border-radius:3px;transition:width 0.2s,background 0.3s;"></div>
          </div>
        </div>
      </div>

      <!-- Bottom-left: Actions -->
      <div class="miniapp-panel miniapp-panel--bottom-left">
        <div class="miniapp-subtitle">Actions</div>
        <button class="miniapp-btn" id="gg-btn-pause">Pause</button>
        <button class="miniapp-btn miniapp-btn--reset" id="gg-btn-reset">Reset</button>
        <button class="miniapp-btn miniapp-btn--neutron" id="gg-btn-next-wave"
          style="display:none;">Next Wave ›</button>
      </div>

      <!-- Bottom-right: Event log -->
      <div class="miniapp-panel miniapp-panel--bottom-right">
        <div class="miniapp-subtitle">Events</div>
        <div id="gg-history"
          style="font-size:11px;color:#9ca3af;min-height:36px;"></div>
      </div>
    `;

    // Wire preset buttons
    this._container.querySelectorAll('.gg-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._container.querySelectorAll('.gg-preset-btn').forEach(b =>
          b.classList.remove('miniapp-btn--neutron')
        );
        btn.classList.add('miniapp-btn--neutron');
        this._applyPreset(btn.dataset.preset);
      });
    });

    // Highlight default preset
    const defaultBtn = this._container.querySelector(`[data-preset="${this._activePresetName}"]`);
    if (defaultBtn) defaultBtn.classList.add('miniapp-btn--neutron');

    // Wire action buttons
    this._container.querySelector('#gg-btn-pause')
      .addEventListener('click', () => this._togglePause());
    this._container.querySelector('#gg-btn-reset')
      .addEventListener('click', () => this._reset());
    this._container.querySelector('#gg-btn-next-wave')
      .addEventListener('click', () => this._advanceWave());
  }

  // ---- Resize ---------------------------------------------------

  _onResize() {
    const rect = this._container.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (this._canvas.width !== w || this._canvas.height !== h) {
      this._canvas.width  = w;
      this._canvas.height = h;
    }
    // Player position tracks resize
    this.state.player.x = w * 0.12;
    this.state.player.y = h * 0.50;
  }

  // ---- Stars -----------------------------------------------------

  _generateStars(count) {
    this._stars = [];
    for (let i = 0; i < count; i++) {
      this._stars.push({
        nx: Math.random(),
        ny: Math.random(),
        r: Math.random() * 1.4 + 0.3,
        brightness: Math.random() * 0.5 + 0.3,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  // ---- Presets ---------------------------------------------------

  _applyPreset(name) {
    const preset = PRESETS[name];
    if (!preset) return;
    this._activePresetName = name;
    this._activePreset = preset;
    // Rebuild gravity objects with new settings without restarting wave
    this._spawnGravityObjects(preset.gravityCount, preset.gravityStrength);
    // Update enemy fire intervals
    for (const e of this.state.enemies) {
      if (e.alive) e.fireInterval = preset.enemyFireInterval;
    }
    this._addHistory(`Preset: ${name}`);
  }

  // ---- Wave Management ------------------------------------------

  _startWave() {
    const wave = this.state.wave;
    const enemyCount = Math.min(wave, 3);
    this.state.enemies = [];
    this.state.projectiles = [];
    this._waveCleared = false;

    const fireInterval = Math.max(
      1.4,
      this._activePreset.enemyFireInterval - (wave - 1) * 0.15
    );

    const laneYRatios = [0.22, 0.50, 0.78];
    for (let i = 0; i < enemyCount; i++) {
      this.state.enemies.push({
        id: this._nextEnemyId++,
        laneYRatio: laneYRatios[i],
        x: 0, // set in _updateEnemies based on canvas width
        y: 0,
        radius: 18,
        health: 1,
        maxHealth: 1,
        fireTimer: i * (fireInterval / Math.max(enemyCount, 1)),
        fireInterval,
        bobTimer: Math.random() * Math.PI * 2,
        alive: true,
      });
    }

    const gravCount = Math.min(
      this._activePreset.gravityCount + Math.max(0, wave - 1),
      5
    );
    this._spawnGravityObjects(gravCount, this._activePreset.gravityStrength);

    this._hideNextWaveBtn();
    this._addHistory(`Wave ${wave} — ${enemyCount} enem${enemyCount === 1 ? 'y' : 'ies'}`);
  }

  _spawnGravityObjects(count, strength) {
    this.state.gravityObjects = [];
    const W = this._canvas ? this._canvas.width : 800;
    const H = this._canvas ? this._canvas.height : 600;
    const types = ['attractor', 'repulsor'];

    for (let i = 0; i < count; i++) {
      const type = types[i % 2];
      const startTop = i % 2 === 0;
      const baseSpeed = 55 + i * 15 + Math.random() * 30;
      this.state.gravityObjects.push({
        id: this._nextGravityId++,
        type,
        x: W * (0.32 + Math.random() * 0.30),
        y: startTop ? -45 : H + 45,
        vx: 0,
        vy: startTop ? baseSpeed : -baseSpeed,
        radius: 24 + Math.random() * 14,
        mass: 1,
        strength,
      });
    }
  }

  _showNextWaveBtn() {
    const btn = this._container?.querySelector('#gg-btn-next-wave');
    if (btn) btn.style.display = 'inline-block';
  }

  _hideNextWaveBtn() {
    const btn = this._container?.querySelector('#gg-btn-next-wave');
    if (btn) btn.style.display = 'none';
  }

  _advanceWave() {
    this.state.wave++;
    this._startWave();
  }

  // ---- Game Loop ------------------------------------------------

  _loop(timestamp) {
    if (!this.state.running) return;
    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.05);
    this._lastTime = timestamp;

    if (!this.state.paused && !this.state.gameOver) {
      this._update(dt);
    }

    this._render();
    this._rafId = requestAnimationFrame((t) => this._loop(t));
  }

  // ---- Update ---------------------------------------------------

  _update(dt) {
    this._updateGravityObjects(dt);
    this._updateProjectiles(dt);
    this._updateEnemies(dt);
    this._checkCollisions();
    this._checkWaveClear();
    this._updateUI();
  }

  _updateGravityObjects(dt) {
    const W = this._canvas.width;
    const H = this._canvas.height;
    for (const obj of this.state.gravityObjects) {
      obj.y += obj.vy * dt;
      // Wrap vertically
      if (obj.vy > 0 && obj.y > H + 60) obj.y = -60;
      if (obj.vy < 0 && obj.y < -60)    obj.y = H + 60;
      // Clamp horizontally to middle band
      obj.x = clamp(obj.x + obj.vx * dt, W * 0.28, W * 0.72);
    }
  }

  _updateProjectiles(dt) {
    for (const p of this.state.projectiles) {
      if (!p.alive) continue;

      p.lifetime += dt;
      if (p.lifetime > PROJECTILE_LIFETIME) { p.alive = false; continue; }

      // Gravity influence
      let ax = 0, ay = 0;
      for (const obj of this.state.gravityObjects) {
        const dx = obj.x - p.x;
        const dy = obj.y - p.y;
        const distSq = Math.max(dx * dx + dy * dy, MIN_GRAV_DIST_SQ);
        const dist   = Math.sqrt(distSq);
        let force = obj.strength * obj.mass / distSq;
        force = Math.min(force, MAX_GRAV_ACCEL);
        const sign = obj.type === 'repulsor' ? -1 : 1;
        ax += sign * (dx / dist) * force;
        ay += sign * (dy / dist) * force;
      }

      p.vx += ax * dt;
      p.vy += ay * dt;

      // Trail
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > TRAIL_LENGTH) p.trail.shift();

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Off-screen cull
      const W = this._canvas.width;
      const H = this._canvas.height;
      if (p.x < -30 || p.x > W + 30 || p.y < -30 || p.y > H + 30) {
        p.alive = false;
      }
    }

    // Remove dead; cap pool
    this.state.projectiles = this.state.projectiles.filter(p => p.alive);
    if (this.state.projectiles.length > MAX_PROJECTILES) {
      this.state.projectiles = this.state.projectiles.slice(-MAX_PROJECTILES);
    }
  }

  _updateEnemies(dt) {
    const W = this._canvas.width;
    const H = this._canvas.height;
    for (const enemy of this.state.enemies) {
      if (!enemy.alive) continue;

      // Position: fixed right side, bob in lane
      enemy.bobTimer += dt * 0.7;
      enemy.x = W - 90;
      enemy.y = H * enemy.laneYRatio + Math.sin(enemy.bobTimer) * 16;

      // Fire
      enemy.fireTimer += dt;
      if (enemy.fireTimer >= enemy.fireInterval) {
        this._fireEnemyShot(enemy);
        enemy.fireTimer = 0;
      }
    }
  }

  _checkCollisions() {
    const player = this.state.player;
    const projectiles = this.state.projectiles;

    for (const p of projectiles) {
      if (!p.alive) continue;

      if (p.owner === 'player') {
        // Hit enemy
        for (const enemy of this.state.enemies) {
          if (!enemy.alive) continue;
          if (circlesOverlap(p.x, p.y, p.radius, enemy.x, enemy.y, enemy.radius)) {
            enemy.health -= p.damage;
            p.alive = false;
            if (enemy.health <= 0) {
              enemy.alive = false;
              this.state.score += 100;
              this.state.hits++;
              this._addHistory('Enemy destroyed! +100');
            }
            break;
          }
        }
        // Intercept enemy bullet
        if (p.alive) {
          for (const ep of projectiles) {
            if (!ep.alive || ep.owner !== 'enemy') continue;
            if (circlesOverlap(p.x, p.y, p.radius, ep.x, ep.y, ep.radius)) {
              ep.alive = false;
              p.alive  = false;
              this.state.score += 25;
              this.state.hits++;
              this.state.incomingShots = Math.max(0, this.state.incomingShots - 1);
              this._addHistory('Shot intercepted! +25');
              break;
            }
          }
        }
      } else if (p.owner === 'enemy') {
        // Hit player
        if (circlesOverlap(p.x, p.y, p.radius, player.x, player.y, player.radius)) {
          player.shield = Math.max(0, player.shield - p.damage);
          p.alive = false;
          this.state.score = Math.max(0, this.state.score - 50);
          this._addHistory(`Player hit! Shield: ${player.shield}`);
          if (player.shield <= 0) this._triggerGameOver();
        }
      }
    }
  }

  _checkWaveClear() {
    if (!this._waveCleared && this.state.enemies.length > 0 &&
        this.state.enemies.every(e => !e.alive)) {
      this._waveCleared = true;
      this.state.score += 250;
      this._addHistory(`Wave ${this.state.wave} cleared! +250`);
      this._showNextWaveBtn();
    }
  }

  // ---- Firing ---------------------------------------------------

  _firePlayerShot(powerRatio, angle) {
    const player = this.state.player;
    const barrelLen = player.radius + 16;
    const startX = player.x + Math.cos(angle) * barrelLen;
    const startY = player.y + Math.sin(angle) * barrelLen;
    const mv = MIN_VELOCITY + powerRatio * (this._activePreset.maxVelocity - MIN_VELOCITY);

    this.state.projectiles.push({
      id: this._nextProjectileId++,
      owner: 'player',
      x: startX,
      y: startY,
      vx: Math.cos(angle) * mv,
      vy: Math.sin(angle) * mv,
      radius: 5,
      damage: 1,
      alive: true,
      lifetime: 0,
      trail: [],
    });

    this.state.shotsFired++;
    player.barrelAngle = angle;
    player.chargePower = powerRatio;
    this._addHistory('Shot fired');
  }

  _fireEnemyShot(enemy) {
    const player = this.state.player;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 280;

    this.state.projectiles.push({
      id: this._nextProjectileId++,
      owner: 'enemy',
      x: enemy.x - enemy.radius,
      y: enemy.y,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      radius: 4,
      damage: ENEMY_HIT_DAMAGE,
      alive: true,
      lifetime: 0,
      trail: [],
    });

    this.state.incomingShots++;
  }

  // ---- Game state helpers ---------------------------------------

  _triggerGameOver() {
    this.state.gameOver = true;
    this._addHistory('Game over!');
  }

  _addHistory(msg) {
    this.state.history.push(msg);
    if (this.state.history.length > 8) this.state.history.shift();
    const el = this._container?.querySelector('#gg-history');
    if (el) {
      el.innerHTML = [...this.state.history]
        .reverse()
        .map(h => `<div style="margin-bottom:2px;">${h}</div>`)
        .join('');
    }
  }

  _togglePause() {
    this.state.paused = !this.state.paused;
    const btn = this._container?.querySelector('#gg-btn-pause');
    if (btn) btn.textContent = this.state.paused ? 'Resume' : 'Pause';
  }

  _reset() {
    Object.assign(this.state, {
      score: 0,
      wave: 1,
      gameOver: false,
      paused: false,
      projectiles: [],
      history: [],
      shotsFired: 0,
      hits: 0,
      incomingShots: 0,
    });
    this.state.player.shield = PLAYER_SHIELD_MAX;
    this.state.player.barrelAngle = BASE_ANGLE;
    this.state.player.chargePower = 0;

    const pauseBtn = this._container?.querySelector('#gg-btn-pause');
    if (pauseBtn) pauseBtn.textContent = 'Pause';

    this._startWave();
    this._addHistory('Game reset');
  }

  // ---- UI DOM update -------------------------------------------

  _updateUI() {
    const s = this.state;
    const q = (id) => this._container?.querySelector(id);

    const scoreEl = q('#gg-score');
    if (scoreEl) scoreEl.textContent = s.score;

    const waveEl = q('#gg-wave');
    if (waveEl) waveEl.textContent = s.wave;

    const shieldEl = q('#gg-shield');
    if (shieldEl) shieldEl.textContent = s.player.shield;

    const enemiesEl = q('#gg-enemies');
    if (enemiesEl) enemiesEl.textContent = s.enemies.filter(e => e.alive).length;

    const shieldBar = q('#gg-shield-bar');
    if (shieldBar) {
      const pct = s.player.shield;
      shieldBar.style.width = `${pct}%`;
      shieldBar.style.background = pct > 60 ? '#4ade80' : pct > 25 ? '#f59e0b' : '#f87171';
    }

    const powerPct = Math.round(s.player.chargePower * 100);
    const powerDisplay = q('#gg-power-display');
    if (powerDisplay) powerDisplay.textContent = `Power: ${powerPct}%`;

    const powerBar = q('#gg-power-bar');
    if (powerBar) powerBar.style.width = `${powerPct}%`;

    const angleDisplay = q('#gg-angle-display');
    if (angleDisplay) {
      const deg = Math.round(s.player.barrelAngle * 180 / Math.PI);
      angleDisplay.textContent = `Angle: ${deg}°`;
    }
  }

  // ---- Input ----------------------------------------------------

  _getCanvasPos(e) {
    const rect = this._canvas.getBoundingClientRect();
    const scaleX = this._canvas.width  / rect.width;
    const scaleY = this._canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  }

  _calcDragParams(dragX, dragY) {
    const powerRatio = clamp(Math.abs(dragX), 0, MAX_DRAG) / MAX_DRAG;
    const angleOffset = clamp(-dragY * ANGLE_SENSITIVITY, -MAX_ANGLE_RAD, MAX_ANGLE_RAD);
    return { powerRatio, angle: BASE_ANGLE + angleOffset };
  }

  _onPointerDown(e) {
    e.preventDefault();
    if (this.state.paused || this.state.gameOver) return;
    const pos = this._getCanvasPos(e);
    this._drag.active = true;
    this._drag.startX   = pos.x;
    this._drag.startY   = pos.y;
    this._drag.currentX = pos.x;
    this._drag.currentY = pos.y;
    this._canvas.setPointerCapture(e.pointerId);
  }

  _onPointerMove(e) {
    e.preventDefault();
    if (!this._drag.active) return;
    const pos = this._getCanvasPos(e);
    this._drag.currentX = pos.x;
    this._drag.currentY = pos.y;

    // Live update barrel angle and charge display
    const dragX = this._drag.currentX - this._drag.startX;
    const dragY = this._drag.currentY - this._drag.startY;
    const { powerRatio, angle } = this._calcDragParams(dragX, dragY);
    this.state.player.barrelAngle = angle;
    this.state.player.chargePower = powerRatio;
  }

  _onPointerUp(e) {
    e.preventDefault();
    if (!this._drag.active) return;
    this._drag.active = false;

    if (this.state.paused || this.state.gameOver) return;

    const dragX = this._drag.currentX - this._drag.startX;
    const dragY = this._drag.currentY - this._drag.startY;
    const { powerRatio, angle } = this._calcDragParams(dragX, dragY);

    if (powerRatio >= 0.04) {
      this._firePlayerShot(powerRatio, angle);
    }

    // Clear live charge display
    this.state.player.chargePower = 0;
  }

  // ---- Rendering ------------------------------------------------

  _render() {
    const ctx = this._ctx;
    const W = this._canvas.width;
    const H = this._canvas.height;

    // Background
    ctx.fillStyle = '#080810';
    ctx.fillRect(0, 0, W, H);

    this._renderStars(ctx, W, H);
    this._renderGravityObjects(ctx);
    this._renderTrails(ctx);
    this._renderProjectiles(ctx);
    this._renderEnemies(ctx);
    this._renderPlayer(ctx);

    if (this._drag.active) this._renderDragPreview(ctx, W, H);
    if (this.state.gameOver) this._renderGameOver(ctx, W, H);
    else if (this.state.paused) this._renderPaused(ctx, W, H);
  }

  _renderStars(ctx, W, H) {
    const t = performance.now() / 1000;
    for (const s of this._stars) {
      const alpha = s.brightness * (0.55 + 0.45 * Math.sin(t * 0.7 + s.phase));
      ctx.beginPath();
      ctx.arc(s.nx * W, s.ny * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
      ctx.fill();
    }
  }

  _renderGravityObjects(ctx) {
    const t = performance.now() / 1000;
    for (const obj of this.state.gravityObjects) {
      const isAttractor = obj.type === 'attractor';
      const innerColor  = isAttractor ? '#4338ca' : '#c2410c';
      const outerColor  = isAttractor ? '99,102,241' : '251,146,60';
      const pulse = 0.85 + 0.15 * Math.sin(t * 2 + obj.id);

      // Glow
      const grad = ctx.createRadialGradient(obj.x, obj.y, 0, obj.x, obj.y, obj.radius * 2.4 * pulse);
      grad.addColorStop(0,   `rgba(${outerColor},0.55)`);
      grad.addColorStop(0.45,`rgba(${outerColor},0.18)`);
      grad.addColorStop(1,   `rgba(${outerColor},0)`);
      ctx.beginPath();
      ctx.arc(obj.x, obj.y, obj.radius * 2.4 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Core ring
      ctx.beginPath();
      ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
      ctx.fillStyle = innerColor;
      ctx.fill();
      ctx.strokeStyle = isAttractor ? '#818cf8' : '#fb923c';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Symbol
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `bold ${Math.max(11, Math.round(obj.radius * 0.55))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isAttractor ? '●' : '✦', obj.x, obj.y);

      // Type label
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = `${Math.max(9, Math.round(obj.radius * 0.38))}px sans-serif`;
      ctx.fillText(isAttractor ? 'pull' : 'push', obj.x, obj.y + obj.radius + 11);
    }
  }

  _renderTrails(ctx) {
    for (const p of this.state.projectiles) {
      if (!p.alive || p.trail.length < 2) continue;
      const rgb = p.owner === 'player' ? '34,211,238' : '248,113,113';
      const len = p.trail.length;
      for (let i = 1; i < len; i++) {
        const alpha = (i / len) * 0.55;
        ctx.beginPath();
        ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
        ctx.lineTo(p.trail[i].x,     p.trail[i].y);
        ctx.strokeStyle = `rgba(${rgb},${alpha.toFixed(2)})`;
        ctx.lineWidth   = p.radius * 0.65;
        ctx.lineCap     = 'round';
        ctx.stroke();
      }
    }
  }

  _renderProjectiles(ctx) {
    for (const p of this.state.projectiles) {
      if (!p.alive) continue;
      const color     = p.owner === 'player' ? '#22d3ee' : '#f87171';
      const glowColor = p.owner === 'player' ? 'rgba(34,211,238,0.35)' : 'rgba(248,113,113,0.35)';

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 2.6, 0, Math.PI * 2);
      ctx.fillStyle = glowColor;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  _renderEnemies(ctx) {
    for (const enemy of this.state.enemies) {
      if (!enemy.alive) continue;

      // Cooldown ring
      const progress  = clamp(enemy.fireTimer / enemy.fireInterval, 0, 1);
      const ringRadius = enemy.radius + 9;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, ringRadius,
        -Math.PI / 2,
        -Math.PI / 2 + progress * Math.PI * 2);
      ctx.strokeStyle = progress > 0.8 ? '#ef4444' : '#f59e0b';
      ctx.lineWidth   = 3;
      ctx.stroke();

      // Body glow
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius + 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(248,113,113,0.12)';
      ctx.fill();

      // Body
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#7f1d1d';
      ctx.fill();
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth   = 2;
      ctx.stroke();

      // Barrel (pointing left)
      const bLen = enemy.radius + 13;
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(enemy.x - bLen, enemy.y);
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth   = 5;
      ctx.lineCap     = 'round';
      ctx.stroke();
    }
  }

  _renderPlayer(ctx) {
    const p = this.state.player;
    const angle = p.barrelAngle;

    // Shield glow (fades with damage)
    if (p.shield > 0) {
      const glowAlpha = (p.shield / PLAYER_SHIELD_MAX) * 0.28;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 10, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(74,222,128,${glowAlpha.toFixed(2)})`;
      ctx.fill();
    }

    // Body
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#0d2035';
    ctx.fill();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth   = 2.5;
    ctx.stroke();

    // Cockpit highlight
    ctx.beginPath();
    ctx.arc(p.x + p.radius * 0.2, p.y - p.radius * 0.1, p.radius * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(34,211,238,0.25)';
    ctx.fill();

    // Barrel
    const barrelLen = p.radius + 18;
    const tipX = p.x + Math.cos(angle) * barrelLen;
    const tipY = p.y + Math.sin(angle) * barrelLen;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(tipX, tipY);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth   = 6;
    ctx.lineCap     = 'round';
    ctx.stroke();
  }

  _renderDragPreview(ctx, W, H) {
    const player = this.state.player;
    const dragX  = this._drag.currentX - this._drag.startX;
    const dragY  = this._drag.currentY - this._drag.startY;
    const { powerRatio, angle } = this._calcDragParams(dragX, dragY);

    // Drag rubber-band line
    ctx.beginPath();
    ctx.moveTo(this._drag.startX,   this._drag.startY);
    ctx.lineTo(this._drag.currentX, this._drag.currentY);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Trajectory preview — simulate with gravity
    const mv  = MIN_VELOCITY + powerRatio * (this._activePreset.maxVelocity - MIN_VELOCITY);
    const barrelLen = player.radius + 18;
    let px = player.x + Math.cos(angle) * barrelLen;
    let py = player.y + Math.sin(angle) * barrelLen;
    let vx = Math.cos(angle) * mv;
    let vy = Math.sin(angle) * mv;

    const simDt = 0.011;
    const steps  = 65;

    ctx.beginPath();
    ctx.moveTo(px, py);

    for (let i = 0; i < steps; i++) {
      let ax = 0, ay = 0;
      for (const obj of this.state.gravityObjects) {
        const dx = obj.x - px;
        const dy = obj.y - py;
        const distSq = Math.max(dx * dx + dy * dy, MIN_GRAV_DIST_SQ);
        const dist   = Math.sqrt(distSq);
        let force = obj.strength * obj.mass / distSq;
        force = Math.min(force, MAX_GRAV_ACCEL);
        const sign = obj.type === 'repulsor' ? -1 : 1;
        ax += sign * (dx / dist) * force;
        ay += sign * (dy / dist) * force;
      }
      vx += ax * simDt;
      vy += ay * simDt;
      px += vx * simDt;
      py += vy * simDt;
      ctx.lineTo(px, py);
      if (px < -10 || px > W + 10 || py < -10 || py > H + 10) break;
    }

    ctx.strokeStyle = 'rgba(34,211,238,0.5)';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([3, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  _renderGameOver(ctx, W, H) {
    ctx.fillStyle = 'rgba(0,0,0,0.68)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#f87171';
    ctx.font = `bold ${Math.min(46, Math.floor(W * 0.09))}px "Space Grotesk",sans-serif`;
    ctx.fillText('GAME OVER', W / 2, H / 2 - 28);

    ctx.fillStyle = '#fbbf24';
    ctx.font = `${Math.min(22, Math.floor(W * 0.042))}px "Space Grotesk",sans-serif`;
    ctx.fillText(`Score: ${this.state.score}`, W / 2, H / 2 + 18);

    ctx.fillStyle = '#9ca3af';
    ctx.font = `${Math.min(15, Math.floor(W * 0.028))}px sans-serif`;
    ctx.fillText('Tap Reset to play again', W / 2, H / 2 + 55);
  }

  _renderPaused(ctx, W, H) {
    ctx.fillStyle = 'rgba(0,0,0,0.48)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e5e7eb';
    ctx.font = `bold ${Math.min(38, Math.floor(W * 0.07))}px "Space Grotesk",sans-serif`;
    ctx.fillText('PAUSED', W / 2, H / 2);
  }

  // ---- Public API -----------------------------------------------

  getState() {
    const s = this.state;
    const shots    = Math.max(s.shotsFired, 1);
    const accuracy = s.hits / shots;

    return {
      primary: {
        player: {
          shield:        s.player.shield,
          barrelAngleDeg: Math.round(s.player.barrelAngle * 180 / Math.PI),
          chargePower:   parseFloat(s.player.chargePower.toFixed(2)),
        },
        wave:         s.wave,
        enemiesAlive: s.enemies.filter(e => e.alive).length,
        gravityObjects: s.gravityObjects.map(obj => ({
          type:     obj.type,
          x:        Math.round(obj.x),
          y:        Math.round(obj.y),
          strength: parseFloat((obj.strength / 1_000_000).toFixed(2)),
        })),
      },
      metrics: {
        score:        s.score,
        shotsFired:   s.shotsFired,
        hits:         s.hits,
        accuracy:     parseFloat(accuracy.toFixed(2)),
        incomingShots: s.incomingShots,
      },
      status: {
        stable: !s.gameOver && !s.paused,
        label:  s.gameOver
          ? 'Game Over'
          : s.paused
            ? 'Paused'
            : this._waveCleared
              ? 'Wave cleared'
              : 'Wave active',
        score: Math.round(accuracy * 100),
      },
      availableActions: s.gameOver
        ? ['reset']
        : s.paused
          ? ['resume', 'reset']
          : this._waveCleared
            ? ['fire', 'reset', 'next_wave']
            : ['fire', 'pause', 'reset'],
      history: [...s.history].slice(-5),
    };
  }

  dispose() {
    this.state.running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this._canvas) {
      this._canvas.removeEventListener('pointerdown',   this._boundPointerDown);
      this._canvas.removeEventListener('pointermove',   this._boundPointerMove);
      this._canvas.removeEventListener('pointerup',     this._boundPointerUp);
      this._canvas.removeEventListener('pointercancel', this._boundPointerUp);
    }
    if (this._boundResize) {
      window.removeEventListener('resize', this._boundResize);
    }
    if (this._container) {
      this._container.innerHTML = '';
    }
  }
}
