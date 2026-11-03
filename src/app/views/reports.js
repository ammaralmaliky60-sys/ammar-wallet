/* وين راحت؟ — reports.js: the month in numbers and charts, comparisons, and PDF/CSV export. */
(function (WR) {
  'use strict';
  const L = window.WRLedger, F = window.WRFormat;
  // Short month names for chart axes ("تشرين" alone would be ambiguous).
  const SHORT_MONTHS = ['ك2', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'ت1', 'ت2', 'ك1'];

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
    return `<svg class="chart" viewBox="0 -4 ${W} ${H + 24}" role="img" aria-label="الصرف اليومي خلال الشهر"><line x1="0" x2="${W}" y1="${H}" y2="${H}" class="axis"/>${bars}${ticks}</svg>`;
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
    const m = L.monthSummary(s, key, { today }), cmp = L.compare(s, key), days = L.dailyExpense(s, key), tr = L.trend(s, key, 6);
    const spentDays = days.filter(d => F.daysBetween(d.date, today) >= 0).length || 1;
    const rate = m.income ? Math.round(m.net / m.income * 100) : null;
    const netText = m.net > 0 ? `وفّرت ${rate}% من دخلك` : m.net < 0 ? 'صرفت أكثر من دخلك' : 'تساوى الدخل والمصروف';
    return WR.pageHead('التقارير', 'وين راحت فلوسك هذا الشهر، وكيف تقارن بما قبله.',
      '<button type="button" class="btn ghost" data-action="export-csv">' + WR.icon('download') + 'CSV</button><button type="button" class="btn primary" data-action="export-pdf">' + WR.icon('download') + 'PDF</button>') +
      WR.monthBar() +
      `<section class="card"><div class="kpis kpis-3">
        <div><span>الدخل</span><b class="pos">${WR.money(m.income)}</b></div>
        <div><span>المصروف</span><b class="neg">${WR.money(m.expense)}</b></div>
        <div><span>الصافي</span><b>${WR.money(m.net, { sign: m.net > 0 ? '+' : m.net < 0 ? '−' : '' })}</b></div></div>
        <p class="net-note"><span class="pill" data-tone="${m.net >= 0 ? 'ok' : 'over'}">${WR.icon(m.net >= 0 ? 'check' : 'alert')}${netText}</span></p></section>
      <div class="report-grid">
        <section class="card"><header class="card-head"><h2>وين راحت فلوسك؟</h2><span class="muted">${WR.money(m.expense)}</span></header>
          ${m.ranked.length ? WR.categoryBars(m.ranked, m.expense) + '<p class="hint">اضغط على أي فئة لعرض حركاتها.</p>' : WR.empty('pie', 'لا يوجد مصروف في هذا الشهر', 'عند تسجيل مصروف يظهر هنا توزيعه على الفئات.')}</section>
        <section class="card"><header class="card-head"><h2>مقارنة بالشهر السابق</h2></header>
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
  const detail = t => t.type === 'expense' ? WR.category(t.categoryId).name : t.type === 'income' ? (WR.source(t.sourceId)?.name || 'دخل آخر') : `${WR.account(t.accountId).name} ← ${WR.account(t.toAccountId).name}`;

  function exportCsv() {
    const app = WR.app, s = app.state, list = L.transactionsIn(s, app.monthKey).slice().sort((a, b) => a.date.localeCompare(b.date));
    const dec = WR.cur().dec, cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['التاريخ', 'النوع', 'الفئة أو المصدر', 'الحساب', 'إلى حساب', 'المبلغ', 'العملة', 'الملاحظة'],
      ...list.map(t => [t.date, TYPE_LABEL[t.type], detail(t), WR.account(t.accountId).name, t.toAccountId ? WR.account(t.toAccountId).name : '',
        F.amountInputValue(t.amount, dec) || '0', s.settings.currency, t.note])];
    Promise.resolve(WR.download(`ween-rahat-${app.monthKey}.csv`, '﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n'), 'text/csv;charset=utf-8'))
      .then(() => WR.toast(window.WRNative?.isNative ? 'فُتحت خيارات حفظ تقرير CSV.' : 'تم تنزيل حركات الشهر بصيغة CSV'))
      .catch(e => WR.toast('تعذر حفظ CSV: ' + e.message, { tone: 'error' }));
  }
  function exportPdf() {
    if (!window.ThukhrPDF?.download) throw new Error('مكوّن PDF غير متاح. أعد تحميل الصفحة.');
    const app = WR.app, s = app.state, key = app.monthKey, today = app.today();
    const m = L.monthSummary(s, key, { today }), p = m.period, end = p.end < today ? p.end : today;
    const list = L.transactionsIn(s, key).slice().sort((a, b) => a.date.localeCompare(b.date));
    const data = {
      period: key, from: p.start, to: end, // the key ("2026-11") also names the downloaded file issuedAt: new Date().toLocaleString('ar-IQ'),
      currency: WR.cur().unit, brand: 'وين راحت؟',
      stats: { opening: WR.fmt(L.balances(s, F.addDays(p.start, -1)).total), income: WR.fmt(m.income), expenses: WR.fmt(m.expense),
        net: WR.fmt(m.net), total: WR.fmt(L.balances(s, end).total), count: String(list.length) },
      wallets: m.categories.filter(c => c.spent || c.budget).map(c => ({ name: c.name, budget: c.budget ? WR.fmt(c.budget) : '—', spent: WR.fmt(c.spent), balance: c.budget ? WR.fmt(c.remaining) : '—' })),
      entries: list.map(t => ({ id: t.id, date: t.date, type: TYPE_LABEL[t.type], category: detail(t), note: t.note || detail(t), amount: WR.fmt(t.amount) }))
    };
    WR.toast('جارٍ إنشاء تقرير PDF…');
    Promise.resolve(window.ThukhrPDF.download(data)).then(info => WR.toast(window.WRNative?.isNative ? `فُتحت خيارات حفظ PDF (${info.pages} صفحة).` : `تم تنزيل التقرير، عدد الصفحات: ${info.pages}`))
      .catch(e => WR.toast('تعذر إنشاء PDF: ' + (e?.message || 'خطأ غير معروف'), { tone: 'error' }));
  }

  WR.views = WR.views || {};
  WR.views.reports = { render };
  WR.actions = Object.assign(WR.actions || {}, { 'export-csv': exportCsv, 'export-pdf': exportPdf });
})(window.WR = window.WR || {});
