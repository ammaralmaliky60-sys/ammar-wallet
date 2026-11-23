/* وين راحت؟ — main.js: app state, navigation, shared month bar, saving with undo, theme and start-up. */
(function (WR) {
  'use strict';
  const L = window.WRLedger, F = window.WRFormat;
  const $ = sel => document.querySelector(sel);
  const systemAppearance = matchMedia('(prefers-color-scheme: dark)');
  const settingsLink = $('#mobileSettings');

  const NAV = [['home', 'home', 'الرئيسية'], ['transactions', 'list', 'الحركات'], ['budget', 'pie', 'الميزانية'], ['reports', 'chart', 'التقارير']];
  const PAGES = ['home', 'transactions', 'budget', 'reports', 'settings'];

  const app = WR.app = {
    state: null, page: 'home', monthKey: null, boot: null,
    today: () => F.today(),
    currentKey() { return L.currentKey(app.state, app.today()); },
    /** Saves a new state, re-renders, and offers to undo. */
    commit(next, message, { undo = true, tone = 'ok' } = {}) {
      const previous = app.state;
      WR.store.save(next);
      app.state = next;
      render();
      if (message) WR.toast(message, { tone, action: undo && previous ? { label: 'تراجع', run: () => { WR.store.save(previous); app.state = previous; render(); WR.toast('تم التراجع'); } } : undefined });
    },
    go(page, opts = {}) { Object.assign(app, opts); if (location.hash !== '#' + page) location.hash = page; else render(); }
  };

  // ---- shared components ----
  WR.monthBar = () => {
    const s = app.state.settings, key = app.monthKey, current = app.currentKey();
    return `<div class="monthbar" role="group" aria-label="الشهر">
      <button type="button" class="icon-btn" data-action="month" data-step="-1" aria-label="الشهر السابق">${WR.icon('prev')}</button>
      <div class="monthbar-label">${WR.icon('calendar')}<span><b>${WR.safe(F.periodTitle(key, s.monthStartDay, s.digits))}</b>${s.monthStartDay !== 1 ? `<small>${WR.safe(F.periodLabel(key, s.monthStartDay, s.digits))}</small>` : ''}</span></div>
      <button type="button" class="icon-btn" data-action="month" data-step="1" aria-label="الشهر التالي" ${key >= current ? 'disabled' : ''}>${WR.icon('next')}</button></div>`;
  };
  WR.pageHead = (title, sub = '', actions = '') => `<header class="page-head"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${actions ? `<div class="page-actions">${actions}</div>` : ''}</header>`;
  WR.empty = (icon, title, text, action = '') => `<div class="empty"><span class="empty-art">${WR.icon(icon)}</span><strong>${WR.safe(title)}</strong><p>${WR.safe(text)}</p>${action}</div>`;
  WR.category = id => app.state.categories.find(c => c.id === id) || { id, name: 'فئة محذوفة', icon: 'dots', color: '#5C6B73' };
  WR.account = id => app.state.accounts.find(a => a.id === id) || { id, name: 'حساب محذوف' };
  WR.source = id => app.state.incomeSources.find(s => s.id === id);

  // ---- rendering ----
  function renderNav() {
    const side = $('#sideNav'), tab = $('#tabbar');
    if (!tab.querySelector('.liquid-indicator')) {
      const link = ([page, icon, label]) => `<a href="#${page}" class="nav-item">${WR.icon(icon)}<span>${label}</span></a>`;
      side.innerHTML = NAV.map(link).join('') + link(['settings', 'settings', 'الإعدادات']);
      tab.innerHTML = '<span class="liquid-indicator" aria-hidden="true"></span>' +
        NAV.slice(0, 2).map(link).join('') +
        `<button type="button" class="tab-add" data-action="add" aria-label="سجّل حركة">${WR.icon('plus')}<span>سجّل</span></button>` +
        NAV.slice(2).map(link).join('');
    }
    document.querySelectorAll('#sideNav .nav-item, #tabbar .nav-item').forEach(link => {
      const active = link.hash === '#' + app.page;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (app.page === 'settings') settingsLink.setAttribute('aria-current', 'page');
    else settingsLink.removeAttribute('aria-current');
    WR.motion?.syncTabIndicator();
  }
  function render() {
    if (!app.state) return;
    const hash = location.hash.slice(1);
    app.page = PAGES.includes(hash) ? hash : 'home';
    if (!app.monthKey) app.monthKey = app.currentKey();
    document.body.dataset.page = app.page;
    renderNav();
    const view = WR.views[app.page];
    const pageLabel = app.page === 'settings' ? 'الإعدادات' : NAV.find(n => n[0] === app.page)[2];
    $('#pageTitle').innerHTML = 'وين راحت؟ / <strong>' + pageLabel + '</strong>';
    const main = $('#main');
    main.innerHTML = view.render(app) + `<footer class="app-signature" aria-label="معلومات التطبيق">
      <span>إعداد وتنفيذ وتصميم</span><strong>عمار عبدالجبار هاشم</strong><small dir="ltr">v0.045</small>
    </footer>`;
    WR.wireAmounts(main);
    view.bind?.(main, app);
  }
  WR.render = render;

  // ---- theme: follows the device unless chosen ----
  function applyTheme() {
    const chosen = WR.store.theme();
    const dark = chosen ? chosen === 'night' : systemAppearance.matches;
    const theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.theme = document.body.dataset.theme = theme;
    $('meta[name="theme-color"]').content = dark ? '#080F20' : '#F4F8FF';

    const btn = $('#themeBtn');
    if (btn.dataset.theme !== theme) {
      const label = dark ? 'المظهر الفاتح' : 'المظهر الداكن';
      btn.dataset.theme = theme;
      btn.innerHTML = WR.icon(dark ? 'sun' : 'moon') + '<span>' + label + '</span>';
      btn.setAttribute('aria-label', label);
      btn.title = label;
    }
    document.querySelectorAll('[data-action="set-theme"]').forEach(option => {
      option.setAttribute('aria-pressed', String(option.dataset.id === (chosen || 'auto')));
    });
  }
  WR.applyTheme = applyTheme;
  systemAppearance.addEventListener?.('change', applyTheme);

  // ---- global actions ----
  WR.actions = Object.assign(WR.actions || {}, {
    month: d => {
      const next = F.shiftKey(app.monthKey, Number(d.step));
      if (next > app.currentKey()) return;
      app.monthKey = next; render();
      document.querySelector(`[data-action="month"][data-step="${d.step}"]:not(:disabled)`)?.focus();
    },
    theme: () => { const dark = document.body.dataset.theme === 'dark'; WR.store.setTheme(dark ? 'classic' : 'night'); applyTheme(); }
  });
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el || el.closest('#sheet form') && el.type === 'submit') return;
    const fn = WR.actions[el.dataset.action];
    if (!fn) return;
    e.preventDefault();
    try { fn(el.dataset, el); } catch (ex) { WR.toast(ex.message, { tone: 'error' }); }
  });
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); $('#main').focus({ preventScroll: true }); });
  // Another tab saved: pick up its data.
  window.addEventListener('storage', e => {
    if (e.key === WR.store.THEME_KEY || e.key === null) applyTheme();
    if (e.key !== WR.store.KEY || !e.newValue) return;
    try { const next = JSON.parse(e.newValue); L.validate(next); app.state = next; render(); WR.toast('تم تحديث البيانات من نافذة أخرى'); } catch { /* ignore partial writes */ }
  });

  // ---- start-up ----
  function start() {
    applyTheme();
    const result = app.boot = WR.store.load();
    if (result.status === 'ok' || result.status === 'migrated') {
      app.state = result.state;
      render();
      if (result.status === 'migrated') WR.views.settings.migrationNotice(result.report);
      else {
        const hello = new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير';
        const name = app.state.settings.name?.trim();
        WR.toast(name ? `${hello}، ${name}` : hello);
      }
    } else if (result.status === 'new') {
      WR.views.onboarding.show();
    } else {
      WR.views.onboarding.recovery(result);
    }
    if ('serviceWorker' in navigator && location.protocol !== 'file:') addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
  WR.start = start;
})(window.WR = window.WR || {});
