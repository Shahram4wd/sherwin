/**
 * Lightweight FPS / frame-time / sim-state overlay.
 *
 * Activated when any of the following is true on construction:
 *   - URL contains ?debug=1
 *   - localStorage.lab_debug === '1'
 *   - Ctrl+Shift+D was pressed (toggle)
 *
 * When off, all hooks are no-ops and zero work happens per frame.
 */

export class DebugOverlay {
  /**
   * @param {{ host: HTMLElement, getSimState?: ()=>object, buildInfo?: object }} options
   */
  constructor({ host, getSimState, buildInfo }) {
    this.host = host;
    this.getSimState = getSimState || (() => ({}));
    this.buildInfo = buildInfo || {};
    this.enabled = DebugOverlay._initiallyEnabled();
    this._frames = 0;
    this._fpsEMA = 0;
    this._lastSec = performance.now();
    this._frameTimes = [];
    this._lastFrame = performance.now();
    this._stateTimer = 0;
    this._el = null;
    this._keyHandler = this._onKey.bind(this);
    document.addEventListener('keydown', this._keyHandler);
    if (this.enabled) this._mount();
  }

  static _initiallyEnabled() {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('debug') === '1') return true;
    } catch { /* ignore */ }
    try {
      if (window.localStorage.getItem('lab_debug') === '1') return true;
    } catch { /* ignore */ }
    return false;
  }

  /** Call once per frame from the shell's RAF tick. */
  tick() {
    if (!this.enabled || !this._el) return;
    const now = performance.now();
    const dt = now - this._lastFrame;
    this._lastFrame = now;
    this._frameTimes.push(dt);
    if (this._frameTimes.length > 120) this._frameTimes.shift();
    this._frames++;
    if (now - this._lastSec >= 1000) {
      const fps = this._frames * 1000 / (now - this._lastSec);
      this._fpsEMA = this._fpsEMA ? this._fpsEMA * 0.7 + fps * 0.3 : fps;
      this._frames = 0;
      this._lastSec = now;
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    try { window.localStorage.setItem('lab_debug', this.enabled ? '1' : '0'); } catch { /* ignore */ }
    if (this.enabled) this._mount();
    else this._unmount();
  }

  dispose() {
    document.removeEventListener('keydown', this._keyHandler);
    this._unmount();
  }

  _onKey(e) {
    // Ctrl+Shift+D toggles the overlay.
    if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
      e.preventDefault();
      this.toggle();
    }
  }

  _mount() {
    if (this._el) return;
    const el = document.createElement('div');
    el.className = 'lab-debug-overlay';
    el.setAttribute('aria-hidden', 'true');
    this.host.appendChild(el);
    this._el = el;
    // Render at 2 Hz to avoid noise.
    this._stateTimer = window.setInterval(() => this._render(), 500);
    this._render();
  }

  _unmount() {
    if (this._stateTimer) { clearInterval(this._stateTimer); this._stateTimer = 0; }
    if (this._el && this._el.parentNode) this._el.parentNode.removeChild(this._el);
    this._el = null;
  }

  _render() {
    if (!this._el) return;
    const sorted = [...this._frameTimes].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    let stateJson = '';
    try {
      stateJson = JSON.stringify(this.getSimState(), (_, v) => {
        if (typeof v === 'number') return Math.round(v * 1000) / 1000;
        return v;
      }, 2);
      if (stateJson.length > 1200) stateJson = stateJson.slice(0, 1200) + '\n…';
    } catch (err) {
      stateJson = `<getState error: ${err.message}>`;
    }
    const build = this.buildInfo;
    this._el.textContent =
      `FPS ${this._fpsEMA.toFixed(1)}   frame p50 ${p50.toFixed(1)}ms  p95 ${p95.toFixed(1)}ms\n` +
      `slug=${build.slug || '?'}  ua=${(navigator.userAgent || '').slice(0, 60)}\n` +
      `--- sim state ---\n${stateJson}`;
  }
}
