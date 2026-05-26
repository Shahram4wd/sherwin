/**
 * Telemetry buffer for the Lab framework.
 *
 * Coalesces events in memory and flushes them via `navigator.sendBeacon`
 * (or `fetch keepalive` fallback) on:
 *   - explicit `flush()` calls,
 *   - the page becoming hidden,
 *   - the browser firing `pagehide` / `beforeunload`,
 *   - a soft 15 s timer.
 *
 * Respects Do Not Track and the user's session-id staying anonymous.
 */

const FLUSH_INTERVAL_MS = 15_000;
const MAX_BUFFER = 50;

/** Generate a short random session id, persisted only for the tab. */
function ensureSessionId() {
  try {
    const KEY = 'lab.telemetry.session';
    let sid = window.sessionStorage.getItem(KEY);
    if (!sid) {
      sid = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
      window.sessionStorage.setItem(KEY, sid);
    }
    return sid;
  } catch {
    return 'anon';
  }
}

export class TelemetryClient {
  /**
   * @param {object} options
   * @param {string} options.endpoint   Full URL of the ingest endpoint.
   * @param {string} options.slug       Mini-app slug for default tagging.
   * @param {boolean} [options.enabled=true]
   */
  constructor({ endpoint, slug, enabled = true }) {
    this.endpoint = endpoint;
    this.slug = slug;
    this.sessionId = ensureSessionId();
    // Respect DNT and explicit opt-out.
    const dnt = (typeof navigator !== 'undefined') && (
      navigator.doNotTrack === '1' ||
      window.doNotTrack === '1' ||
      navigator.msDoNotTrack === '1'
    );
    this.enabled = enabled && !dnt && !!endpoint;
    /** @type {Array<{slug:string,event:string,props:object}>} */
    this.buffer = [];
    this._timer = 0;
    this._bound = this._onPageHide.bind(this);
    this._boundVis = this._onVisibility.bind(this);
    if (this.enabled) {
      window.addEventListener('pagehide', this._bound);
      window.addEventListener('beforeunload', this._bound);
      document.addEventListener('visibilitychange', this._boundVis);
      this._scheduleFlush();
    }
  }

  track(event, props = {}) {
    if (!this.enabled || !event) return;
    this.buffer.push({ slug: this.slug, event: String(event), props });
    if (this.buffer.length >= MAX_BUFFER) this.flush();
  }

  flush() {
    if (!this.enabled || this.buffer.length === 0) return;
    const events = this.buffer.splice(0, this.buffer.length);
    const payload = JSON.stringify({ session_id: this.sessionId, events });
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(this.endpoint, blob);
        return;
      }
    } catch { /* fall through to fetch */ }
    try {
      fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
        credentials: 'same-origin',
      }).catch(() => {});
    } catch { /* ignore */ }
  }

  dispose() {
    this.flush();
    window.removeEventListener('pagehide', this._bound);
    window.removeEventListener('beforeunload', this._bound);
    document.removeEventListener('visibilitychange', this._boundVis);
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = 0;
    }
  }

  _scheduleFlush() {
    this._timer = window.setTimeout(() => {
      this.flush();
      if (this.enabled) this._scheduleFlush();
    }, FLUSH_INTERVAL_MS);
  }

  _onPageHide() { this.flush(); }
  _onVisibility() {
    if (document.visibilityState === 'hidden') this.flush();
  }
}
