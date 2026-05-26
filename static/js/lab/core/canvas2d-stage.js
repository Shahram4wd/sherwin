/**
 * Canvas2DStage — 2D companion to SceneManager.
 *
 * Provides the same lifecycle contract (start/stop/dispose, onTick hook,
 * resize handling) for sims that render with a plain `<canvas>` 2D context
 * instead of Three.js. The HiDPI-aware backing store keeps rendering crisp
 * on retina displays while exposing logical (CSS pixel) width/height to the
 * draw callback.
 *
 * Typical use:
 *
 *   const stage = new Canvas2DStage(containerEl);
 *   stage.onTick = (dt, ctx, w, h) => { ... };
 *   stage.start();
 */
export class Canvas2DStage {
  /**
   * @param {HTMLElement} container - Element to render into.
   * @param {object} [options]
   * @param {string} [options.background='#0b1220'] CSS color for clear.
   * @param {number} [options.maxDeltaSec=0.1] Frame-delta clamp.
   */
  constructor(container, options = {}) {
    if (!container) throw new Error('Canvas2DStage: container is required');
    this.container = container;
    this.background = options.background ?? '#0b1220';
    this.maxDeltaSec = options.maxDeltaSec ?? 0.1;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'lab-canvas2d';
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    this.width = 0;
    this.height = 0;
    this._lastTime = 0;
    this._rafId = 0;
    this._running = false;
    this._disposed = false;

    /** @type {(dt:number, ctx:CanvasRenderingContext2D, w:number, h:number)=>void} */
    this.onTick = () => {};

    this._resize = this._resize.bind(this);
    this._loop = this._loop.bind(this);
    this._ro = new ResizeObserver(this._resize);
    this._ro.observe(this.container);
    this._resize();
  }

  start() {
    if (this._disposed || this._running) return;
    this._running = true;
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame(this._loop);
  }

  stop() {
    this._running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = 0;
    }
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this.stop();
    try { this._ro.disconnect(); } catch { /* noop */ }
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    this.canvas = null;
    this.ctx = null;
  }

  _resize() {
    if (this._disposed || !this.canvas) return;
    const rect = this.container.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    this.width = w;
    this.height = h;
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  _loop(now) {
    if (!this._running) return;
    const dtRaw = (now - this._lastTime) / 1000;
    this._lastTime = now;
    const dt = Math.min(this.maxDeltaSec, Math.max(0, dtRaw));
    const { ctx, width, height, background } = this;
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }
    try {
      this.onTick(dt, ctx, width, height);
    } catch (err) {
      // Stop the loop on uncaught draw errors so we don't spam the console.
      console.error('[Canvas2DStage] onTick threw, stopping loop:', err);
      this.stop();
      return;
    }
    this._rafId = requestAnimationFrame(this._loop);
  }
}
