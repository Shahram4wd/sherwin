/**
 * LabShell — the chrome that wraps every lab simulation.
 *
 * Responsibilities:
 *   - Mount a structured DOM: outer .lab-shell > .lab-toolbar + stage + overlays.
 *   - Provide the stage element (with legacy id="simulation" + class
 *     "miniapp-container") that sims render into. Sim code is unmodified.
 *   - Lifecycle: attach(sim) starts it, dispose() tears down cleanly.
 *   - Cross-sim utilities: fullscreen toggle, namespaced storage, asset
 *     loader (loadData), error boundary, loading state, help overlay,
 *     reduced-motion class, debug overlay, telemetry, voice assistant.
 *   - Auto pause on tab hide; auto resume on tab show.
 *
 * Sims only need to expose a small contract; see lab/types.js (LabSim).
 *
 * @typedef {import('../types.js').LabSim} LabSim
 * @typedef {import('../types.js').LabSimManifest} LabSimManifest
 */

import { FullscreenController } from './fullscreen.js';
import { DebugOverlay } from './debug-overlay.js';
import { TelemetryClient } from './telemetry.js';
import { trapFocus, prefersReducedMotion } from './a11y.js';

const STAGE_ID = 'simulation';

export class LabShell {
  /**
   * @param {object} options
   * @param {HTMLElement} options.mountEl   Outer container in the page.
   * @param {LabSimManifest} options.manifest
   * @param {string} [options.aiEndpoint]   URL for /ai/assistant/chat.
   * @param {string} [options.telemetryEndpoint]  URL for /api/lab-telemetry/events/.
   * @param {string} [options.csrfToken]
   */
  constructor({ mountEl, manifest, aiEndpoint, telemetryEndpoint, csrfToken }) {
    if (!mountEl) throw new Error('LabShell: mountEl is required');
    if (!manifest || !manifest.slug) throw new Error('LabShell: manifest with slug required');

    this.mountEl = mountEl;
    this.manifest = manifest;
    this.slug = manifest.slug;
    this.capabilities = manifest.capabilities || {};
    this.aiEndpoint = aiEndpoint || '';
    this.telemetryEndpoint = telemetryEndpoint || '';
    this.csrfToken = csrfToken || '';

    this.reducedMotion = prefersReducedMotion();

    /** @type {LabSim|null} */
    this.sim = null;
    /** Stage element (where sim renders). */
    this.stage = null;
    this.stageId = STAGE_ID;

    this._disposed = false;
    this._helpOpen = false;
    this._helpTrapDispose = null;
    this._aiAssistant = null;
    this._aiStubFab = null;
    this._fullscreen = null;
    this._debug = null;
    this._telemetry = null;
    this._rafId = 0;
    this._visHandler = this._onVisibility.bind(this);
    this._keyHandler = this._onKey.bind(this);
    this._reducedMotionMql = null;
    this._reducedMotionListener = null;
  }

  /* ------------------------------------------------------------------ */
  /*  Lifecycle                                                          */
  /* ------------------------------------------------------------------ */

  mount() {
    if (this.stage) return;
    const shellEl = document.createElement('div');
    shellEl.className = 'lab-shell';
    shellEl.dataset.slug = this.slug;
    if (this.reducedMotion) shellEl.classList.add('lab-reduced-motion');
    this.shellEl = shellEl;

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'lab-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', `${this.manifest.name || this.slug} controls`);
    shellEl.appendChild(toolbar);
    this.toolbarEl = toolbar;

    // Stage
    const stage = document.createElement('div');
    stage.id = STAGE_ID;
    stage.className = 'miniapp-container lab-stage';
    stage.setAttribute('role', 'application');
    stage.setAttribute('aria-label', this.manifest.name || this.slug);
    shellEl.appendChild(stage);
    this.stage = stage;

    // Loading state placeholder
    this._loadingEl = document.createElement('div');
    this._loadingEl.className = 'lab-loading';
    this._loadingEl.innerHTML = '<div class="lab-loading-spinner" aria-hidden="true"></div><div class="lab-loading-label">Loading simulation…</div>';
    stage.appendChild(this._loadingEl);

    this._buildToolbar();

    this.mountEl.appendChild(shellEl);

    // Cross-cutting helpers
    if (this.capabilities.fullscreen !== false) {
      this._fullscreen = new FullscreenController(shellEl);
      this._fullscreen.onChange((active) => {
        if (this._fsBtn) {
          this._fsBtn.setAttribute('aria-pressed', String(active));
          this._fsBtn.title = active ? 'Exit fullscreen' : 'Enter fullscreen';
        }
        this.track('sim.fullscreen', { active });
      });
    }

    this._telemetry = new TelemetryClient({
      endpoint: this.telemetryEndpoint,
      slug: this.slug,
    });

    this._debug = new DebugOverlay({
      host: shellEl,
      getSimState: () => (this.sim && this.sim.getState ? this.sim.getState() : {}),
      buildInfo: { slug: this.slug },
    });

    // Track reduced-motion changes live so sims can react.
    try {
      this._reducedMotionMql = window.matchMedia('(prefers-reduced-motion: reduce)');
      this._reducedMotionListener = (e) => {
        this.reducedMotion = !!e.matches;
        shellEl.classList.toggle('lab-reduced-motion', this.reducedMotion);
      };
      this._reducedMotionMql.addEventListener('change', this._reducedMotionListener);
    } catch { /* ignore */ }

    document.addEventListener('visibilitychange', this._visHandler);
    document.addEventListener('keydown', this._keyHandler);

    // Debug overlay tick (cheap when disabled).
    const debugTick = () => {
      if (this._disposed) return;
      this._debug.tick();
      this._rafId = requestAnimationFrame(debugTick);
    };
    this._rafId = requestAnimationFrame(debugTick);
  }

  /**
   * Start the simulation. Wraps init() in an error boundary and reports
   * errors via telemetry + an in-stage error card.
   * @param {LabSim} sim
   */
  async attach(sim) {
    if (!this.stage) this.mount();
    this.sim = sim;
    this.track('sim.opened');
    try {
      const result = sim.init();
      if (result && typeof result.then === 'function') await result;
      this._hideLoading();
      // Voice assistant — lazy: render a stub FAB, only fetch the JS module
      // when the user clicks it (first-click cost only).
      if (this.capabilities.ai !== false && this.aiEndpoint) {
        this._mountAIStub();
      }
    } catch (err) {
      this._renderError(err);
      this.track('sim.error', { phase: 'init', message: String(err && err.message || err) });
      throw err;
    }
  }

  /** Tear everything down. Called automatically on pagehide too. */
  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this.track('sim.disposed');
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = 0; }
    document.removeEventListener('visibilitychange', this._visHandler);
    document.removeEventListener('keydown', this._keyHandler);
    if (this._reducedMotionMql && this._reducedMotionListener) {
      try { this._reducedMotionMql.removeEventListener('change', this._reducedMotionListener); }
      catch { /* ignore */ }
    }
    try { this.sim && this.sim.dispose && this.sim.dispose(); } catch (e) { console.error(e); }
    try { this._aiAssistant && this._aiAssistant.dispose && this._aiAssistant.dispose(); } catch { /* ignore */ }
    try { this._fullscreen && this._fullscreen.dispose(); } catch { /* ignore */ }
    try { this._debug && this._debug.dispose(); } catch { /* ignore */ }
    try { this._telemetry && this._telemetry.dispose(); } catch { /* ignore */ }
    if (this.shellEl && this.shellEl.parentNode) {
      this.shellEl.parentNode.removeChild(this.shellEl);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Public utilities for sims                                          */
  /* ------------------------------------------------------------------ */

  /** Namespaced, versioned localStorage helper for a sim. */
  storage(namespace, version = 1) {
    const key = (k) => `lab.${this.slug}.${namespace}.v${version}.${k}`;
    const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };
    return {
      get(k, fallback = null) {
        return safe(() => {
          const raw = window.localStorage.getItem(key(k));
          return raw == null ? fallback : JSON.parse(raw);
        }, fallback);
      },
      set(k, v) {
        safe(() => window.localStorage.setItem(key(k), JSON.stringify(v)), null);
      },
      remove(k) {
        safe(() => window.localStorage.removeItem(key(k)), null);
      },
    };
  }

  /**
   * Load JSON / text data with caching and an error-boundary.
   * @param {string} url
   * @param {{ as?: 'json'|'text', cache?: RequestCache }} [opts]
   */
  async loadData(url, { as = 'json', cache = 'force-cache' } = {}) {
    const res = await fetch(url, { cache, credentials: 'same-origin' });
    if (!res.ok) throw new Error(`loadData failed (${res.status}) for ${url}`);
    return as === 'json' ? res.json() : res.text();
  }

  /** Emit a telemetry event. */
  track(event, props) {
    if (this._telemetry) this._telemetry.track(event, props || {});
  }

  /** Toggle a CSS-driven sim-paused state (sim opt-in). */
  pause() {
    try { this.sim && this.sim.pause && this.sim.pause(); } catch (e) { console.error(e); }
    this.track('sim.pause');
  }
  resume() {
    try { this.sim && this.sim.resume && this.sim.resume(); } catch (e) { console.error(e); }
    this.track('sim.resume');
  }

  /* ------------------------------------------------------------------ */
  /*  Toolbar / Help / AI                                                */
  /* ------------------------------------------------------------------ */

  _buildToolbar() {
    const tb = this.toolbarEl;

    if (this.capabilities.fullscreen !== false) {
      const fs = document.createElement('button');
      fs.type = 'button';
      fs.className = 'lab-toolbar-btn lab-fullscreen-btn';
      fs.setAttribute('aria-label', 'Toggle fullscreen');
      fs.setAttribute('aria-pressed', 'false');
      fs.title = 'Enter fullscreen';
      fs.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
      fs.addEventListener('click', () => this._fullscreen && this._fullscreen.toggle());
      tb.appendChild(fs);
      this._fsBtn = fs;
    }

    if (this.manifest.help) {
      const help = document.createElement('button');
      help.type = 'button';
      help.className = 'lab-toolbar-btn lab-help-btn';
      help.setAttribute('aria-label', 'How to use this simulation');
      help.title = 'Help';
      help.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
      help.addEventListener('click', () => this._toggleHelp());
      tb.appendChild(help);
    }
  }

  _toggleHelp() {
    if (this._helpOpen) return this._closeHelp();
    this._openHelp();
  }

  _openHelp() {
    if (this._helpOpen) return;
    const overlay = document.createElement('div');
    overlay.className = 'lab-help-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Simulation help');
    overlay.innerHTML = `
      <div class="lab-help-panel" tabindex="-1">
        <button type="button" class="lab-help-close" aria-label="Close help">×</button>
        <div class="lab-help-content">${this.manifest.help}</div>
      </div>
    `;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this._closeHelp();
    });
    overlay.querySelector('.lab-help-close').addEventListener('click', () => this._closeHelp());
    this.shellEl.appendChild(overlay);
    this._helpEl = overlay;
    this._helpOpen = true;
    this._helpTrapDispose = trapFocus(overlay.querySelector('.lab-help-panel'));
  }

  _closeHelp() {
    if (!this._helpOpen) return;
    this._helpOpen = false;
    if (this._helpTrapDispose) { try { this._helpTrapDispose(); } catch { /* ignore */ } this._helpTrapDispose = null; }
    if (this._helpEl && this._helpEl.parentNode) this._helpEl.parentNode.removeChild(this._helpEl);
    this._helpEl = null;
  }

  /**
   * Render a stub "Ask AI Assistant" floating button. The real VoiceAssistant
   * module is only fetched and instantiated on first click — this keeps the
   * critical-path payload (and the AI panel DOM) out of initial render.
   */
  _mountAIStub() {
    if (this._aiStubFab) return;
    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'miniapp-ai-fab';
    fab.setAttribute('aria-label', 'Open AI assistant');
    fab.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M12 18.5A2.5 2.5 0 0 1 9.5 16V8a2.5 2.5 0 0 1 5 0v8a2.5 2.5 0 0 1-2.5 2.5Z"/>
        <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
        <line x1="12" y1="22" x2="12" y2="18.5"/>
      </svg>
      Ask AI Assistant
    `;
    fab.addEventListener('click', () => this._upgradeAIStub(), { once: true });
    this.stage.appendChild(fab);
    this._aiStubFab = fab;
  }

  async _upgradeAIStub() {
    // Remove the stub so the real assistant can render its own FAB in place.
    if (this._aiStubFab && this._aiStubFab.parentNode) {
      this._aiStubFab.parentNode.removeChild(this._aiStubFab);
    }
    this._aiStubFab = null;
    await this._initAI({ autoOpen: true });
  }

  async _initAI({ autoOpen = false } = {}) {
    try {
      const mod = await import('@lab/ai/voice-assistant');
      const VoiceAssistant = mod.VoiceAssistant;
      this._aiAssistant = new VoiceAssistant({
        container: this.stage,
        appSlug: this.slug,
        apiUrl: this.aiEndpoint,
        getStateFn: () => (this.sim && this.sim.getState ? this.sim.getState() : {}),
        csrfToken: this.csrfToken,
      });
      // Lightly instrument: shadow original send to emit telemetry, when present.
      if (this._aiAssistant && typeof this._aiAssistant.sendMessage === 'function') {
        const orig = this._aiAssistant.sendMessage.bind(this._aiAssistant);
        this._aiAssistant.sendMessage = (msg) => {
          this.track('sim.ai.message', { length: typeof msg === 'string' ? msg.length : 0 });
          return orig(msg);
        };
      }
      this.track('sim.ai.opened');
      // Open immediately when user invoked it via the stub.
      if (autoOpen && this._aiAssistant && typeof this._aiAssistant.toggle === 'function') {
        this._aiAssistant.toggle();
      }
    } catch (err) {
      console.warn('[LabShell] AI assistant unavailable:', err);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Loading / error                                                    */
  /* ------------------------------------------------------------------ */

  _hideLoading() {
    if (this._loadingEl && this._loadingEl.parentNode) {
      this._loadingEl.parentNode.removeChild(this._loadingEl);
      this._loadingEl = null;
    }
  }

  _renderError(err) {
    this._hideLoading();
    const card = document.createElement('div');
    card.className = 'lab-error-card';
    card.setAttribute('role', 'alert');
    card.innerHTML = `
      <h3>Simulation failed to start</h3>
      <p>Something went wrong while booting <strong>${this.manifest.name || this.slug}</strong>.</p>
      <pre class="lab-error-detail"></pre>
      <button type="button" class="lab-btn">Reload</button>
    `;
    card.querySelector('.lab-error-detail').textContent = String(err && err.stack || err);
    card.querySelector('button').addEventListener('click', () => window.location.reload());
    this.stage.appendChild(card);
  }

  /* ------------------------------------------------------------------ */
  /*  Auto pause / Esc cascade                                           */
  /* ------------------------------------------------------------------ */

  _onVisibility() {
    if (document.visibilityState === 'hidden') this.pause();
    else this.resume();
  }

  _onKey(e) {
    if (e.key !== 'Escape') return;
    // Cascade: help → AI panel → fullscreen.
    if (this._helpOpen) { this._closeHelp(); e.preventDefault(); return; }
    if (this._aiAssistant && typeof this._aiAssistant.isOpen === 'function' && this._aiAssistant.isOpen()) {
      try { this._aiAssistant.close && this._aiAssistant.close(); } catch { /* ignore */ }
      e.preventDefault();
      return;
    }
    if (this._fullscreen && this._fullscreen.isActive()) {
      this._fullscreen.exit();
      e.preventDefault();
    }
  }
}
