/* وين راحت؟ — transactions.js: every movement in the month, searchable and filterable, grouped by day. */
(function (WR) {
  'use strict';
  const L = window.WRLedger, F = window.WRFormat;
  const TYPES = [['all', 'الكل'], ['expense', 'مصروف'], ['income', 'دخل'], ['transfer', 'تحويل']];
  const filter = () => (WR.app.filter = WR.app.filter || { type: 'all', categoryId: '', q: '' });

  function matching(app) {
    const f = filter(), q = f.q.trim().toLowerCase();
    return L.sortNewest(L.transactionsIn(app.state, app.monthKey)).filter(t =>
      (f.type === 'all' || t.type === f.type) &&
      (!f.categoryId || t.categoryId === f.categoryId) &&
      (!q || [t.note, t.type === 'expense' && WR.category(t.categoryId).name, t.type === 'income' && WR.source(t.sourceId)?.name,
        WR.account(t.accountId).name, String(t.amount)].filter(Boolean).join(' ').toLowerCase().includes(q)));
  }

  function results(app) {
    const list = matching(app), digits = app.state.settings.digits, today = app.today();
    const sum = type => list.filter(t => t.type === type).reduce((n, t) => n + t.amount, 0);
    const summary = `<div class="stat-strip">
      <div><span>الحركات</span><b>${new Intl.NumberFormat(digits === 'ar' ? 'ar-IQ' : 'en-US').format(list.length)}</b></div>
      <div data-kind="income"><span>الدخل</span><b>${WR.money(sum('income'), { sign: sum('income') ? '+' : '' })}</b></div>
      <div data-kind="expense"><span>المصروف</span><b>${WR.money(sum('expense'), { sign: sum('expense') ? '−' : '' })}</b></div></div>`;
    if (!list.length) return summary + WR.empty('search', 'لا توجد حركات مطابقة', 'غيّر البحث أو الفلتر، أو اختر شهراً آخر.');
    const days = [];
    for (const t of list) { const last = days.at(-1); if (last?.date === t.date) last.items.push(t); else days.push({ date: t.date, items: [t] }); }
    return summary + days.map(d => {
      const spent = d.items.filter(t => t.type === 'expense').reduce((n, t) => n + t.amount, 0);
      return `<section class="day"><header><b>${WR.safe(F.dateLabel(d.date, { digits, relativeTo: today, long: d.date.slice(0, 4) !== today.slice(0, 4) }))}</b>
        ${spent ? `<span>${WR.money(spent, { sign: '−' })}</span>` : ''}</header>
        <div class="tx-list">${d.items.map(t => WR.txRow(t, { showDate: false })).join('')}</div></section>`;
    }).join('');
  }

  function render(app) {
    const f = filter(), s = app.state;
    const usedCats = new Set(L.transactionsIn(s, app.monthKey).filter(t => t.type === 'expense').map(t => t.categoryId));
    const cats = s.categories.filter(c => usedCats.has(c.id) || c.id === f.categoryId);
    return WR.pageHead('الحركات', 'كل ما دخل وطلع، مرتب حسب اليوم.', '<button type="button" class="btn spend desktop-only" data-action="add">' + WR.icon('plus') + 'سجّل</button>') +
      WR.monthBar() +
      `<section class="card filters">
        <label class="search">${WR.icon('search')}<input type="search" id="txSearch" value="${WR.safe(f.q)}" placeholder="ابحث بالملاحظة أو الفئة أو المبلغ…" aria-label="بحث في الحركات" autocomplete="off"></label>
        <div class="seg seg-small" role="group" aria-label="نوع الحركة">${TYPES.map(([id, label]) =>
          `<button type="button" data-action="tx-type" data-id="${id}" aria-pressed="${f.type === id}">${label}</button>`).join('')}</div>
        ${cats.length ? `<div class="scroll-chips" role="group" aria-label="الفئة">
          <button type="button" class="fchip" data-action="tx-cat" data-id="" aria-pressed="${!f.categoryId}">كل الفئات</button>
          ${cats.map(c => `<button type="button" class="fchip" data-action="tx-cat" data-id="${WR.safe(c.id)}" aria-pressed="${f.categoryId === c.id}" style="--c:${c.color}">${WR.icon(c.icon)}${WR.safe(c.name)}</button>`).join('')}</div>` : ''}
      </section>
      <section class="card" id="txResults" aria-live="polite">${results(app)}</section>`;
  }

  function bind(root, app) {
    const input = root.querySelector('#txSearch');
    input.addEventListener('input', () => { filter().q = input.value; root.querySelector('#txResults').innerHTML = results(app); });
  }

  WR.views = WR.views || {};
  WR.views.transactions = { render, bind };
  WR.actions = Object.assign(WR.actions || {}, {
    'tx-type': d => { filter().type = d.id; if (d.id !== 'expense' && d.id !== 'all') filter().categoryId = ''; WR.render(); },
    'tx-cat': d => { filter().categoryId = d.id; if (d.id) filter().type = 'expense'; WR.render(); }
  });
})(window.WR = window.WR || {});
