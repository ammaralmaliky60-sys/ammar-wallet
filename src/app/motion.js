/* وين راحت؟ — motion.js: decorative microinteractions; never reads/writes financial state. */
(function (WR) {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const enabled = () => !reduced.matches && !document.hidden;
  let tabReady = false;

  /** Keep one indicator node alive while navigation links are re-rendered.
   *  Its transform travels between tabs rather than fading in at each page. */
  function syncTabIndicator() {
    const nav = document.querySelector('#tabbar');
    const indicator = nav?.querySelector('.liquid-indicator');
    const active = nav?.querySelector('.nav-item.active');
    if (!indicator) return;
    if (!active) { indicator.style.opacity = '0'; return; }
    const rect = active.getBoundingClientRect(), base = nav.getBoundingClientRect();
    if (!rect.width || !base.width) return;
    if (!tabReady) indicator.style.transition = 'none';
    indicator.style.setProperty('--liquid-x', Math.round(rect.left - base.left) + 'px');
    indicator.style.setProperty('--liquid-y', Math.round(rect.top - base.top) + 'px');
    indicator.style.setProperty('--liquid-w', Math.round(rect.width) + 'px');
    indicator.style.setProperty('--liquid-h', Math.round(rect.height) + 'px');
    indicator.style.opacity = '1';
    if (!tabReady) {
      tabReady = true;
      requestAnimationFrame(() => { if (indicator.isConnected) indicator.style.transition = ''; });
    }
  }
  WR.motion = { syncTabIndicator };

  /** The circular visual is deliberately aria-hidden: the existing linear
   *  meter remains the only accessible progressbar, with the real percentage. */
  WR.progressRing = value => {
    const pct = Math.max(0, Math.min(100, Number(value) || 0));
    return '<span class="motion-progress-ring" aria-hidden="true">' +
      '<svg viewBox="0 0 60 60" focusable="false"><circle class="motion-progress-track" cx="30" cy="30" r="24"/>' +
      '<circle class="motion-progress-value" cx="30" cy="30" r="24" pathLength="100" style="--progress:' + pct + '"/></svg>' +
      '<b>' + pct + '%</b></span>';
  };

  // Spring response only, never intercepting an action or delaying a save.
  document.addEventListener('click', event => {
    if (!enabled()) return;
    const target = event.target.closest?.('.nav-item,.tab-add,[data-action="add"],.icon-btn,.bar-row,.budget-row');
    if (!target || target.matches(':disabled,[aria-disabled="true"]')) return;
    const icon = target.querySelector('.ic');
    if (!icon || typeof icon.animate !== 'function') return;
    icon.animate([
      { transform: 'scale(1) rotate(0deg)' },
      { transform: 'scale(.8) rotate(-9deg)', offset: .28 },
      { transform: 'scale(1.16) rotate(4deg)', offset: .72 },
      { transform: 'scale(1) rotate(0deg)' }
    ], { duration: 350, easing: 'cubic-bezier(.25,.75,.3,1)' });
  }, { capture: true, passive: true });

  // Plus -> check is shown only after the original toast confirms an action.
  // Purely decorative; the toast message and Undo button remain untouched.
  const baseToast = WR.toast;
  WR.toast = (message, opts = {}) => {
    baseToast(message, opts);
    if (!enabled()) return;
    const toast = document.querySelector('#toast');
    if (!toast) return;
    if (opts.tone === 'warn' || opts.tone === 'error') {
      toast.classList.remove('motion-alert');
      // Restart the short warning animation for repeated errors.
      void toast.offsetWidth;
      toast.classList.add('motion-alert');
    } else {
      toast.classList.remove('motion-alert');
      if (/^(تم تسجيل|تم تعديل|تم حفظ|أُضيفت|تم التراجع|تم تنزيل|تم استلام)/.test(message)) {
        const mark = document.createElement('span');
        mark.className = 'motion-morph';
        mark.setAttribute('aria-hidden', 'true');
        mark.innerHTML = WR.icon('plus', 'motion-morph-plus') + WR.icon('check', 'motion-morph-check');
        toast.prepend(mark);
      }
    }
  };

  window.addEventListener('resize', () => requestAnimationFrame(syncTabIndicator), { passive: true });
  reduced.addEventListener?.('change', () => requestAnimationFrame(syncTabIndicator));
})(window.WR = window.WR || {});
