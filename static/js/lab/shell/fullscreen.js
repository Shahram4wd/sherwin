/**
 * Fullscreen helper for the Lab framework.
 *
 * Wraps the standard Fullscreen API and falls back to a CSS-driven
 * "pseudo fullscreen" mode (position: fixed; inset: 0) on platforms where
 * real fullscreen is unavailable (notably iOS Safari).
 */

const PSEUDO_CLASS = 'is-pseudo-fullscreen';

export class FullscreenController {
  /** @param {HTMLElement} target  Element to enter fullscreen on. */
  constructor(target) {
    this.target = target;
    this.active = false;
    this._mode = 'native';
    this._onChange = this._onChange.bind(this);
    this._listeners = new Set();
    document.addEventListener('fullscreenchange', this._onChange);
    document.addEventListener('webkitfullscreenchange', this._onChange);
  }

  /** @returns {boolean} true if any form of fullscreen is supported. */
  get supported() {
    return !!(this.target.requestFullscreen || this.target.webkitRequestFullscreen) || true;
  }

  isActive() { return this.active; }

  async toggle() {
    if (this.active) return this.exit();
    return this.enter();
  }

  async enter() {
    if (this.active) return;
    const t = this.target;
    try {
      if (t.requestFullscreen) {
        await t.requestFullscreen();
        this._mode = 'native';
      } else if (t.webkitRequestFullscreen) {
        t.webkitRequestFullscreen();
        this._mode = 'native';
      } else {
        this._enterPseudo();
      }
    } catch {
      this._enterPseudo();
    }
    this._setActive(true);
  }

  async exit() {
    if (!this.active) return;
    try {
      if (this._mode === 'pseudo') {
        this._exitPseudo();
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    } catch { /* ignore */ }
    this._setActive(false);
  }

  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  dispose() {
    document.removeEventListener('fullscreenchange', this._onChange);
    document.removeEventListener('webkitfullscreenchange', this._onChange);
    if (this._mode === 'pseudo' && this.active) this._exitPseudo();
    this._listeners.clear();
  }

  _enterPseudo() {
    this._mode = 'pseudo';
    this.target.classList.add(PSEUDO_CLASS);
    document.body.style.overflow = 'hidden';
  }

  _exitPseudo() {
    this.target.classList.remove(PSEUDO_CLASS);
    document.body.style.overflow = '';
  }

  _onChange() {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    const nowActive = !!fsEl && fsEl === this.target;
    if (nowActive !== this.active && this._mode !== 'pseudo') {
      this._setActive(nowActive);
    }
  }

  _setActive(v) {
    this.active = v;
    for (const fn of this._listeners) {
      try { fn(v); } catch { /* ignore */ }
    }
  }
}
