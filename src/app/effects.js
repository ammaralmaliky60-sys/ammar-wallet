/* Appearance only: brief feedback without delaying navigation, input or saving. */
(function () {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const controls = '.btn,.icon-btn,.nav-item,.tab-add,.fchip,.tx,.list-row,.budget-row,.bar-row,.quick-amounts button,.seg>button,.toast-action,.brand,.mobile-brand';
  const feedback = new Set(), layers = new Map(), selections = new Map();
  let pageFrame = 0, pageTimer = 0, lastPage = document.body.dataset.page;
  const enabled = () => !reduced.matches && !document.hidden;

  function select(control) {
    if (!enabled() || !control.isConnected) return;
    clearTimeout(selections.get(control));
    control.classList.add('effect-selected');
    selections.set(control, setTimeout(() => {
      control.classList.remove('effect-selected');
      selections.delete(control);
    }, 550));
  }

  function ripple(control, event) {
    if (!enabled() || typeof control.animate !== 'function') return;
    const rect = control.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    // A dialog is in the top layer. Its own overlay keeps feedback above its
    // contents; measuring the layer also handles a backdrop-filter containing block.
    const root = control.closest('dialog[open]') || document.body;
    let layer = layers.get(root);
    if (!layer?.isConnected) {
      layer = document.createElement('span');
      layer.className = 'effect-layer';
      layer.setAttribute('aria-hidden', 'true');
      Object.assign(layer.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '300' });
      root.append(layer); layers.set(root, layer);
    }
    const origin = layer.getBoundingClientRect();
    const clip = document.createElement('span');
    clip.className = 'effect-feedback';
    Object.assign(clip.style, {
      position: 'absolute', left: `${rect.left - origin.left}px`, top: `${rect.top - origin.top}px`,
      width: `${rect.width}px`, height: `${rect.height}px`, overflow: 'hidden',
      borderRadius: getComputedStyle(control).borderRadius, pointerEvents: 'none'
    });
    const point = document.createElement('span');
    point.className = 'effect-ripple';
    const size = Math.min(440, Math.max(rect.width, rect.height) * 2);
    const x = event?.detail ? Math.max(0, Math.min(rect.width, event.clientX - rect.left)) : rect.width / 2;
    const y = event?.detail ? Math.max(0, Math.min(rect.height, event.clientY - rect.top)) : rect.height / 2;
    Object.assign(point.style, {
      position: 'absolute', width: `${size}px`, height: `${size}px`,
      left: `${x - size / 2}px`, top: `${y - size / 2}px`, borderRadius: '50%', pointerEvents: 'none'
    });
    clip.append(point); layer.append(clip);
    const animation = point.animate([
      { transform: 'scale(.08)', opacity: .85 },
      { transform: 'scale(.65)', opacity: .45, offset: .55 },
      { transform: 'scale(1)', opacity: 0 }
    ], { duration: 460, easing: 'cubic-bezier(.2,.7,.3,1)' });
    let timer;
    const effect = { remove() {
      clearTimeout(timer); animation.onfinish = null; animation.cancel(); clip.remove(); feedback.delete(effect);
      if (!layer.childElementCount) {
        layer.remove();
        if (layers.get(root) === layer) layers.delete(root);
      }
    } };
    feedback.add(effect);
    animation.onfinish = () => effect.remove();
    timer = setTimeout(() => effect.remove(), 700);
    // Rapid tapping cannot accumulate an unbounded number of overlays.
    if (feedback.size > 5) feedback.values().next().value.remove();
  }

  document.addEventListener('click', event => {
    const control = event.target.closest?.(controls);
    if (!control || control.matches(':disabled,[aria-disabled="true"]') || control.closest('[inert]')) return;
    ripple(control, event);
    // Theme buttons replace their SVG during the native click handler.
    queueMicrotask(() => select(control));
  }, { capture: true, passive: true });

  // Native radio changes cover touch, label activation and arrow-key selection
  // without double feedback from a label's synthetic input click.
  document.addEventListener('change', event => {
    if (!event.target.matches?.('input[type="radio"]:checked')) return;
    const label = event.target.closest('.chip,.seg>label');
    const control = label?.querySelector('span');
    if (control) { ripple(control); select(control); }
  }, { passive: true });

  function clear() {
    cancelAnimationFrame(pageFrame); clearTimeout(pageTimer);
    document.querySelector('#main')?.classList.remove('motion-enter');
    feedback.forEach(effect => effect.remove());
    selections.forEach((timer, control) => { clearTimeout(timer); control.classList.remove('effect-selected'); });
    selections.clear();
  }
  reduced.addEventListener?.('change', () => { if (reduced.matches) clear(); });
  function visibility() {
    document.body.toggleAttribute('data-effects-paused', document.hidden);
    if (document.hidden) clear();
  }
  visibility();
  document.addEventListener('visibilitychange', visibility);

  // Observe only page identity, never field values or the tree of transaction
  // rows. Same-page search/filter/amount updates do not replay entrance effects.
  new MutationObserver(() => {
    const page = document.body.dataset.page;
    if (page === lastPage) return;
    lastPage = page;
    cancelAnimationFrame(pageFrame);
    if (!enabled()) return;
    pageFrame = requestAnimationFrame(() => {
      if (!enabled()) return;
      const main = document.querySelector('#main');
      if (!main) return;
      clearTimeout(pageTimer);
      main.classList.add('motion-enter');
      pageTimer = setTimeout(() => main.classList.remove('motion-enter'), 650);
      document.querySelectorAll('.nav-item.active').forEach(select);
    });
  }).observe(document.body, { attributes: true, attributeFilter: ['data-page'] });
})();
