/* وين راحت؟ — reports.js: the month in numbers and charts, comparisons, and PDF export. */
(function (WR) {
  'use strict';
  const L = window.WRLedger, F = window.WRFormat;
  // Short month names for chart axes ("تشرين" alone would be ambiguous).
  const SHORT_MONTHS = ['ك2', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'ت1', 'ت2', 'ك1'];

  function filter(app) {
    const period = F.periodByKey(app.monthKey, app.state.settings.monthStartDay), previous = app.reportFilter;
    if (!previous || previous.key !== app.monthKey) {
      app.reportFilter = { key: app.monthKey, categories: previous?.categories || [], from: period.start, to: period.end };
    }
    const f = app.reportFilter, valid = new Set(app.state.categories.map(c => c.id));
    f.categories = f.categories.filter(id => valid.has(id));
    f.from = f.from < period.start || f.from > period.end ? period.start : f.from;
    f.to = f.to < period.start || f.to > period.end ? period.end : f.to;
    if (f.from > f.to) f.to = f.from;
    return f;
  }

  function rangeFor(state, key, f, basePeriod) {
    const period = F.periodByKey(key, state.settings.monthStartDay);
    const first = Math.min(period.days - 1, F.daysBetween(basePeriod.start, f.from));
    const last = Math.min(period.days - 1, F.daysBetween(basePeriod.start, f.to));
    return { period, from: F.addDays(period.start, first), to: F.addDays(period.start, Math.max(first, last)) };
  }

  function scopedList(state, key, f, basePeriod) {
    const { from, to } = rangeFor(state, key, f, basePeriod), categories = new Set(f.categories);
    return L.transactionsIn(state, key).filter(t => t.date >= from && t.date <= to &&
      (!categories.size || t.type === 'expense' && categories.has(t.categoryId)));
  }

  function summary(state, key, f, basePeriod) {
    const range = rangeFor(state, key, f, basePeriod), list = scopedList(state, key, f, basePeriod);
    const sum = type => list.filter(t => t.type === type).reduce((total, t) => total + t.amount, 0);
    const income = sum('income'), expense = sum('expense'), spentBy = new Map(), selected = new Set(f.categories);
    for (const t of list) if (t.type === 'expense') spentBy.set(t.categoryId, (spentBy.get(t.categoryId) || 0) + t.amount);
    const categories = state.categories.filter(c => (selected.size ? selected.has(c.id) : !c.archived || spentBy.has(c.id))).map(c => {
      const spent = spentBy.get(c.id) || 0;
      return { id: c.id, name: c.name, icon: c.icon, color: c.color, archived: c.archived, budget: c.budget, spent,
        remaining: c.budget - spent, share: expense ? spent / expense : 0, level: L.budgetLevel(spent, c.budget) };
    });
    return { period: range.period, from: range.from, to: range.to, list, income, expense, net: income - expense,
      categories, ranked: categories.filter(c => c.spent).sort((a, b) => b.spent - a.spent) };
  }

  function reportData(app) {
    const state = app.state, key = app.monthKey, f = filter(app);
    const basePeriod = F.periodByKey(key, state.settings.monthStartDay), m = summary(state, key, f, basePeriod);
    const previous = summary(state, F.shiftKey(key, -1), f, basePeriod);
    const previousByCategory = new Map(previous.categories.map(c => [c.id, c.spent]));
    const cmp = m.categories.map(c => ({ ...c, previous: previousByCategory.get(c.id) || 0,
      delta: c.spent - (previousByCategory.get(c.id) || 0) }))
      .filter(c => c.spent || c.previous).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    const tr = [];
    for (let i = 5; i >= 0; i--) {
      const monthKey = F.shiftKey(key, -i), item = summary(state, monthKey, f, basePeriod);
      tr.push({ key: monthKey, income: item.income, expense: item.expense });
    }
    const expenseByDate = new Map();
    for (const t of m.list) if (t.type === 'expense') expenseByDate.set(t.date, (expenseByDate.get(t.date) || 0) + t.amount);
    const days = [];
    for (let date = m.from; date <= m.to; date = F.addDays(date, 1)) days.push({ date, amount: expenseByDate.get(date) || 0 });
    const groupedIncome = new Map();
    for (const t of m.list) if (t.type === 'income') {
      const name = L.incomeSourceName(state, t);
      groupedIncome.set(name, (groupedIncome.get(name) || 0) + t.amount);
    }
    const incomeSources = [...groupedIncome].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
    return { f, m, cmp, tr, days, incomeSources };
  }

  /** Daily spending: one hue, day 1 on the right (reading direction), hover/focus titles, table fallback. */
  function dailyChart(days, digits) {
    const max = Math.max(1, ...days.map(d => d.amount)), W = 620, H = 160, gap = 2, bw = (W - gap * (days.length - 1)) / days.length;
    const bars = days.map((d, i) => {
      const h = d.amount ? Math.max(3, Math.round(d.amount / max * (H - 8))) : 0, x = W - (i + 1) * bw - i * gap;
      return `<rect x="${x.toFixed(1)}" y="${H - h}" width="${bw.toFixed(1)}" height="${h}" rx="3" class="bar"><title>${WR.safe(F.dateLabel(d.date, { digits }))}: ${WR.safe(WR.moneyText(d.amount))}</title></rect>`;
    }).join('');
    // Ticks on days 1, 8, 15, 22, 29 of the month (the last day is left out when it would crowd day 29).
    const ticks = days.map((d, i) => ({ d, i })).filter(({ i }) => i % 7 === 0 || (i === days.length - 1 && i % 7 > 2))
      .map(({ d, i }) => `<text x="${(W - (i + 0.5) * bw - i * gap).toFixed(1)}" y="${H + 16}" text-anchor="middle">${WR.safe(F.dateLabel(d.date, { digits }).split(' ')[0])}</text>`).join('');
    return `<svg class="chart" viewBox="0 -4 ${W} ${H + 24}" role="img" aria-label="الصرف اليومي خلال الفترة المحددة"><line x1="0" x2="${W}" y1="${H}" y2="${H}" class="axis"/>${bars}${ticks}</svg>`;
  }
  /** Income vs spending for the last 6 months: two series, legend + values in titles. */
  function trendChart(rows, s) {
    const max = Math.max(1, ...rows.flatMap(r => [r.income, r.expense])), W = 620, H = 150, group = W / rows.length, bw = Math.min(26, group / 3);
    const g = rows.map((r, i) => {
      const cx = W - (i + 0.5) * group;
      const bar = (v, dx, cls, label) => { const h = v ? Math.max(3, Math.round(v / max * (H - 8))) : 0;
        return `<rect x="${(cx + dx).toFixed(1)}" y="${H - h}" width="${bw}" height="${h}" rx="3" class="${cls}"><title>${label}: ${WR.safe(WR.moneyText(v))}</title></rect>`; };
      const title = SHORT_MONTHS[F.AR_MONTHS.indexOf(F.periodTitle(r.key, s.monthStartDay, s.digits).replace(/ \S+$/, ''))];
      return bar(r.income, 1, 'bar-income', 'الدخل') + bar(r.expense, -bw - 1, 'bar-expense', 'المصروف') +
        `<text x="${cx.toFixed(1)}" y="${H + 16}" text-anchor="middle">${WR.safe(title)}</text>`;
    }).join('');
    return `<div class="legend"><span><i class="sw-income"></i>الدخل</span><span><i class="sw-expense"></i>المصروف</span></div>
      <svg class="chart" viewBox="0 -4 ${W} ${H + 24}" role="img" aria-label="الدخل والمصروف لآخر 6 أشهر"><line x1="0" x2="${W}" y1="${H}" y2="${H}" class="axis"/>${g}</svg>`;
  }

  function render(app) {
    const s = app.state, key = app.monthKey, today = app.today(), digits = s.settings.digits;
    const { f, m, cmp, days, tr, incomeSources } = reportData(app), selected = new Set(f.categories);
    const period = F.periodByKey(key, s.settings.monthStartDay);
    const usedCategories = new Set(L.transactionsIn(s, key).filter(t => t.type === 'expense').map(t => t.categoryId));
    const categories = s.categories.filter(c => usedCategories.has(c.id) || selected.has(c.id) || !c.archived);
    const filtered = selected.size || f.from !== period.start || f.to !== period.end;
    const spentDays = days.filter(d => F.daysBetween(d.date, today) >= 0).length || 1;
    const rate = m.income ? Math.round(m.net / m.income * 100) : null;
    const netText = selected.size ? `مصروف ${selected.size} ${selected.size === 1 ? 'فئة محددة' : 'فئات محددة'}` :
      !m.income ? 'بعدك ما سجّلت دخل' : m.net > 0 ? `باقيلك ${rate}% من دخلك` : m.net < 0 ? (key === app.currentKey() ? 'صرفك زايد هالشهر!' : 'صرفك زايد بهالشهر!') : 'صرفك كدّ دخلك';
    return WR.pageHead('التقارير', 'وين راحت فلوسك هذا الشهر، وكيف تقارن بما قبله.',
      '<button type="button" class="btn primary" data-action="export-pdf">' + WR.icon('download') + 'PDF</button>') +
      WR.monthBar() +
      `<section class="card report-filters" aria-label="تصفية التقرير">
        <header class="report-filter-head"><div><h2>تصفية التقرير</h2><p class="muted">اختر فترة وفئة أو أكثر.</p></div>
          ${filtered ? `<button type="button" class="btn small ghost" data-action="report-reset">إلغاء التصفية</button>` : ''}</header>
        <div class="report-date-range">
          <label class="field"><span>من تاريخ</span><input type="date" data-report-date="from" value="${f.from}" min="${period.start}" max="${period.end}"></label>
          <label class="field"><span>إلى تاريخ</span><input type="date" data-report-date="to" value="${f.to}" min="${period.start}" max="${period.end}"></label>
        </div>
        <div class="scroll-chips" role="group" aria-label="فئات المصروف">
          <button type="button" class="fchip" data-action="report-all-categories" aria-pressed="${!selected.size}">كل الفئات</button>
          ${categories.map(c => `<button type="button" class="fchip" data-action="report-category" data-id="${WR.safe(c.id)}" aria-pressed="${selected.has(c.id)}" style="--c:${c.color}">${WR.icon(c.icon)}${WR.safe(c.name)}</button>`).join('')}
        </div>
      </section>` +
      `<section class="card"><div class="kpis kpis-3">
        <div><span>الدخل</span><b class="pos">${WR.money(m.income)}</b></div>
        <div><span>المصروف</span><b class="neg">${WR.money(m.expense)}</b></div>
        <div><span>الصافي</span><b>${WR.money(m.net, { sign: m.net > 0 ? '+' : m.net < 0 ? '−' : '' })}</b></div></div>
        <p class="net-note"><span class="pill" data-tone="${selected.size || !m.income ? 'muted' : m.net >= 0 ? 'ok' : 'over'}">${WR.icon(selected.size || !m.income ? 'clock' : m.net >= 0 ? 'check' : 'alert')}${netText}</span></p></section>
      ${incomeSources.length ? `<section class="card"><header class="card-head"><h2>الدخل حسب المصدر</h2><span class="muted">${WR.money(m.income)}</span></header>
        <div class="compare">${incomeSources.map(({ name, amount }) => `<div class="compare-row">
          <span class="bar-name">${WR.safe(name)}</span><span class="compare-now">${WR.money(amount)}</span></div>`).join('')}</div></section>` : ''}
      <div class="report-grid">
        <section class="card"><header class="card-head"><h2>وين راحت فلوسك؟</h2><span class="muted">${WR.money(m.expense)}</span></header>
          ${m.ranked.length ? WR.categoryBars(m.ranked, m.expense) + '<p class="hint">اضغط على أي فئة لعرض حركاتها.</p>' : WR.empty('pie', 'لا يوجد مصروف في هذا الشهر', 'عند تسجيل مصروف يظهر هنا توزيعه على الفئات.')}</section>
        <section class="card"><header class="card-head"><h2>مقارنة بالفترة نفسها من الشهر السابق</h2></header>
          ${cmp.length ? `<div class="compare">${cmp.map(c => `<div class="compare-row">
            <span class="bar-name"><i style="--c:${c.color}">${WR.icon(c.icon)}</i>${WR.safe(c.name)}</span>
            <span class="compare-now">${WR.money(c.spent)}</span>
            <span class="pill" data-tone="${c.delta > 0 ? 'over' : c.delta < 0 ? 'ok' : 'muted'}">${c.delta ? WR.icon(c.delta > 0 ? 'expense' : 'income') + (c.delta > 0 ? 'زاد ' : 'قلّ ') + WR.money(Math.abs(c.delta)) : 'بدون تغيير'}</span></div>`).join('')}</div>`
            : WR.empty('trend', 'لا توجد بيانات للمقارنة', 'تظهر المقارنة عندما يكون هناك مصروف في هذا الشهر أو الذي قبله.')}</section>
        <section class="card"><header class="card-head"><h2>الصرف اليومي</h2><span class="muted">متوسط ${WR.money(Math.round(m.expense / spentDays))} يومياً</span></header>
          ${dailyChart(days, digits)}</section>
        <section class="card"><header class="card-head"><h2>آخر 6 أشهر</h2></header>${trendChart(tr, s.settings)}
          <table class="sr-only"><caption>الدخل والمصروف لآخر 6 أشهر</caption><tr><th>الشهر</th><th>الدخل</th><th>المصروف</th></tr>
          ${tr.map(r => `<tr><td>${WR.safe(F.periodTitle(r.key, s.settings.monthStartDay, digits))}</td><td>${WR.safe(WR.moneyText(r.income))}</td><td>${WR.safe(WR.moneyText(r.expense))}</td></tr>`).join('')}</table></section>
      </div>`;
  }

  const TYPE_LABEL = { expense: 'مصروف', income: 'دخل', transfer: 'تحويل' };
  const detail = t => t.type === 'expense' ? WR.category(t.categoryId).name : t.type === 'income' ? L.incomeSourceName(WR.app.state, t) : `${WR.account(t.accountId).name} ← ${WR.account(t.toAccountId).name}`;

  function exportPdf() {
    if (!window.ThukhrPDF?.download) throw new Error('مكوّن PDF غير متاح. أعد تحميل الصفحة.');
    const app = WR.app, s = app.state, key = app.monthKey;
    const { f, m, incomeSources } = reportData(app), list = m.list.slice().sort((a, b) => a.date.localeCompare(b.date));
    const categoryOnly = f.categories.length > 0;
    const data = {
      period: key, from: m.from, to: m.to, ownerName: s.settings.name || '',
      currency: WR.cur().unit, brand: 'دبّرها',
      stats: { opening: categoryOnly ? WR.fmt(0) : WR.fmt(L.balances(s, F.addDays(m.from, -1)).total), income: WR.fmt(m.income), expenses: WR.fmt(m.expense),
        net: WR.fmt(m.net), total: categoryOnly ? WR.fmt(m.net) : WR.fmt(L.balances(s, m.to).total), count: String(list.length) },
      incomeSources: incomeSources.map(({ name, amount }) => ({ name, amount: WR.fmt(amount) })),
      wallets: m.categories.filter(c => c.spent || c.budget).map(c => ({ name: c.name, budget: c.budget ? WR.fmt(c.budget) : '—', spent: WR.fmt(c.spent), balance: c.budget ? WR.fmt(c.remaining) : '—' })),
      entries: list.map(t => ({ id: t.id, date: t.date, type: TYPE_LABEL[t.type], category: detail(t), note: t.note, amount: WR.fmt(t.amount) }))
    };
    WR.toast('جارٍ إنشاء تقرير PDF…');
    Promise.resolve(window.ThukhrPDF.download(data)).then(info => WR.toast(`تم تنزيل التقرير، عدد الصفحات: ${info.pages}`))
      .catch(e => WR.toast('تعذر إنشاء PDF: ' + (e?.message || 'خطأ غير معروف'), { tone: 'error' }));
  }

  function bind(root, app) {
    root.querySelectorAll('[data-report-date]').forEach(input => input.addEventListener('change', () => {
      const f = filter(app), field = input.dataset.reportDate;
      f[field] = input.value;
      if (f.from > f.to) f[field === 'from' ? 'to' : 'from'] = input.value;
      WR.render();
    }));
  }

  WR.views = WR.views || {};
  WR.views.reports = { render, bind };
  WR.actions = Object.assign(WR.actions || {}, {
    'report-category': data => {
      const f = filter(WR.app), selected = new Set(f.categories);
      if (selected.has(data.id)) selected.delete(data.id); else selected.add(data.id);
      f.categories = [...selected];
      WR.render();
    },
    'report-all-categories': () => { filter(WR.app).categories = []; WR.render(); },
    'report-reset': () => {
      const app = WR.app, period = F.periodByKey(app.monthKey, app.state.settings.monthStartDay);
      app.reportFilter = { key: app.monthKey, categories: [], from: period.start, to: period.end };
      WR.render();
    },
    'export-pdf': exportPdf
  });
})(window.WR = window.WR || {});
