/**
 * Focus-trap and keyboard helpers for Lab overlays.
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Trap Tab/Shift+Tab focus within `root` while it is open. Returns a
 * disposer that restores focus to the previously active element.
 *
 * @param {HTMLElement} root
 * @returns {() => void}
 */
export function trapFocus(root) {
  if (!root) return () => {};
  const previouslyFocused = document.activeElement;
  const items = () => Array.from(root.querySelectorAll(FOCUSABLE))
    .filter(el => el.offsetParent !== null || el === document.activeElement);

  const onKey = (e) => {
    if (e.key !== 'Tab') return;
    const list = items();
    if (list.length === 0) {
      e.preventDefault();
      root.focus();
      return;
    }
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  root.addEventListener('keydown', onKey);
  // Initial focus
  const list = items();
  if (list.length > 0) list[0].focus();
  else if (root.tabIndex !== undefined) {
    root.tabIndex = -1;
    root.focus();
  }

  return () => {
    root.removeEventListener('keydown', onKey);
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      try { previouslyFocused.focus(); } catch { /* ignore */ }
    }
  };
}

/** Returns true when the user prefers reduced motion. */
export function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
