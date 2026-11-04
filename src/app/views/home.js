/* وين راحت؟ — home.js: this month at a glance. */
(function (WR) {
  'use strict';
  const L = window.WRLedger, F = window.WRFormat;
  const PACE = { ok: ['check', 'ضمن الخطة'], fast: ['clock', 'أسرع من الخطة'], over: ['alert', 'تجاوزت الميزانية'] };
  const INCOME = { received: ['check', 'تم الاستلام'], due: ['clock', 'موعده اليوم'], late: ['alert', 'تأخر'], upcoming: ['calendar', 'متوقع'] };

  function greeting(name) {
    const hour = new Date().getHours();
    return (hour < 12 ? 'صباح الخير' : 'مساء الخير') + (name ? '، ' + WR.safe(name) : '');
  }

  /** A transaction row, reused by the transactions page. */
  WR.txRow = (t, { showDate = true } = {}) => {
    const s = WR.app.state, digits = s.settings.digits, today = WR.app.today();
    let icon, color, title, sub, sign;
    if (t.type === 'expense') { const c = WR.category(t.categoryId); icon = c.icon; color = c.color; title = t.note || c.name; sub = t.note ? c.name : WR.account(t.accountId).name; sign = '−'; }
    else if (t.type === 'income') { icon = 'income'; color = 'var(--brand-gold)'; title = t.note || WR.source(t.sourceId)?.name || 'دخل'; sub = (t.note && WR.source(t.sourceId)?.name) || WR.account(t.accountId).name; sign = '+'; }
    else { icon = 'transfer'; color = 'var(--text-muted)'; title = t.note || 'تحويل'; sub = `${WR.account(t.accountId).name} ← ${WR.account(t.toAccountId).name}`; sign = ''; }
    const when = showDate ? ' · ' + F.dateLabel(t.date, { digits, relativeTo: today }) : '';
    return `<button type="button" class="tx" data-action="edit-tx" data-id="${WR.safe(t.id)}" data-type="${t.type}">
      <span class="tx-ic" style="--c:${color}">${WR.icon(icon)}</span>
      <span class="tx-text"><b>${WR.safe(title)}</b><small>${WR.safe(sub + when)}</small></span>
      <span class="tx-amount">${WR.money(t.amount, { sign })}</span></button>`;
  };

  /** Ranked category bars ("where did it go?"), reused by the reports page. */
  WR.categoryBars = (ranked, total, { limit = Infinity } = {}) => {
    const max = Math.max(1, ...ranked.map(c => c.spent));
    return ranked.slice(0, limit).map(c => `<button type="button" class="bar-row" data-action="show-category" data-id="${WR.safe(c.id)}"
      aria-label="${WR.safe(c.name)}: ${WR.safe(WR.moneyText(c.spent))}، ${Math.round(c.share * 100)}%">
      <span class="bar-head"><span class="bar-name"><i style="--c:${c.color}">${WR.icon(c.icon)}</i>${WR.safe(c.name)}</span>
      <span class="bar-value">${WR.money(c.spent)}<small dir="ltr">${Math.round(c.share * 100)}%</small></span></span>
      <span class="bar-track"><span class="bar-fill" style="width:${Math.max(2, Math.round(c.spent / max * 100))}%"></span></span></button>`).join('');
  };

  function render(app) {
    const s = app.state, today = app.today(), key = app.monthKey, isCurrent = key === app.currentKey();
    const m = L.monthSummary(s, key, { today }), b = L.balances(s);
    const recent = L.sortNewest(L.transactionsIn(s, key)).slice(0, 5);
    const income = isCurrent ? L.incomeStatus(s, key, { today }) : [];
    const pending = income.filter(x => x.status !== 'received');
    const usedPct = m.budgetTotal ? Math.min(100, Math.round(m.budgetedSpent / m.budgetTotal * 100)) : 0;

    const hero = `<section class="card hero">
      <span class="eyebrow">صرفت ${isCurrent ? 'هذا الشهر' : 'في هذا الشهر'}</span>
      <strong class="hero-amount">${WR.money(m.expense)}</strong>
      <div class="hero-split">
        <span><small>الدخل</small><b>${m.income ? WR.money(m.income) : 'لم يُسجّل بعد'}</b></span>
        ${m.income ? `<span><small>${m.net >= 0 ? 'المتبقي من الدخل' : 'صرفت أكثر من دخلك بـ'}</small><b class="${m.net < 0 ? 'neg' : ''}">${WR.money(Math.abs(m.net))}</b></span>`
          : `<span><small>رصيدك الكلي الآن</small><b>${WR.money(b.total)}</b></span>`}
      </div>
      ${m.budgetTotal ? `<div class="hero-budget">
        ${WR.progressRing(usedPct)}\n        <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${usedPct}" aria-label="نسبة المصروف من الميزانية"><i style="width:${usedPct}%" data-level="${m.pace.status}"></i></div>
        <p>استخدمت <b>${m.pace.used}%</b> من ميزانية ${WR.money(m.budgetTotal)}${isCurrent && m.pace.status !== 'over' ? ` · تقدر تصرف <b>${WR.money(m.pace.daily)}</b> يومياً` : ''}</p>
        ${isCurrent ? `<span class="pill" data-tone="${m.pace.status}">${WR.icon(PACE[m.pace.status][0])}${PACE[m.pace.status][1]}</span>` : ''}
      </div>` : `<p class="hero-hint">ما حددت ميزانية بعد. <a href="#budget">حدد سقفاً لكل فئة</a> حتى تعرف وين وصلت.</p>`}
    </section>`;

    const incomeCard = pending.length ? `<section class="card">
      <header class="card-head"><h2>دخلك المتوقع</h2></header>
      ${pending.map(x => `<div class="income-row" data-status="${x.status}">
        <span class="tx-ic" style="--c:var(--brand-gold)">${WR.icon('income')}</span>
        <span class="tx-text"><b>${WR.safe(x.source.name)}</b><small><span class="status-text" data-tone="${x.status}">${INCOME[x.status][1]}</span> · ${WR.safe(F.dateLabel(x.expected, { digits: s.settings.digits, relativeTo: today }))}${x.source.amount ? ' · ' + WR.safe(WR.moneyText(x.source.amount)) : ''}</small></span>
        <button type="button" class="btn small ghost" data-action="receive" data-id="${WR.safe(x.source.id)}">${WR.icon('check')}استلمت</button></div>`).join('')}
    </section>` : '';

    const accounts = `<section class="card">
      <header class="card-head"><h2>أرصدتك الآن</h2><a href="#settings" class="link">الحسابات</a></header>
      <div class="balances">${s.accounts.filter(a => !a.archived).map(a => `<div class="balance ${b.accounts[a.id] < 0 ? 'neg' : ''}">
        <span>${WR.icon(a.id === 'card' ? 'card' : a.id === 'cash' ? 'cash' : 'wallet')}${WR.safe(a.name)}</span><b>${WR.money(b.accounts[a.id])}</b></div>`).join('')}
        <div class="balance total"><span>${WR.icon('wallet')}المجموع</span><b>${WR.money(b.total)}</b></div></div>
    </section>`;

    const where = `<section class="card">
      <header class="card-head"><h2>وين راحت فلوسك؟</h2>${m.ranked.length > 5 ? '<a href="#reports" class="link">التقرير الكامل</a>' : ''}</header>
      ${m.ranked.length ? WR.categoryBars(m.ranked, m.expense, { limit: 5 }) : WR.empty('pie', 'ما في مصروف بعد', 'كل مصروف تسجله يظهر هنا حسب فئته.')}
    </section>`;

    const latest = `<section class="card">
      <header class="card-head"><h2>آخر الحركات</h2>${recent.length ? '<a href="#transactions" class="link">كل الحركات</a>' : ''}</header>
      ${recent.length ? `<div class="tx-list">${recent.map(t => WR.txRow(t)).join('')}</div>` :
        WR.empty('list', 'ما سجلت شي هذا الشهر', 'ابدأ بأول مصروف، يكفي المبلغ والفئة.', '<button type="button" class="btn primary" data-action="add">' + WR.icon('plus') + 'سجّل مصروف</button>')}
    </section>`;

    return WR.pageHead(greeting(s.settings.name), WR.safe(F.dateLabel(today, { long: true, digits: s.settings.digits })),
      '<button type="button" class="btn spend desktop-only" data-action="add">' + WR.icon('plus') + 'سجّل مصروف</button>') +
      WR.monthBar() + `<div class="home-grid"><div class="col">${hero}${incomeCard}${where}</div><div class="col">${accounts}${latest}</div></div>`;
  }

  WR.views = WR.views || {};
  WR.views.home = { render };
  WR.actions = Object.assign(WR.actions || {}, {
    receive: d => {
      const src = WR.source(d.id); if (!src) return;
      WR.entry.open({ type: 'income', preset: { sourceId: src.id, accountId: src.accountId, amount: src.amount || undefined } });
    },
    'show-category': d => { WR.app.go('transactions', { filter: { type: 'expense', categoryId: d.id, q: '' } }); }
  });
})(window.WR = window.WR || {});
