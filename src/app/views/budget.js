/* وين راحت؟ — budget.js: category spending and money set aside for payments. */
(function (WR) {
  'use strict';
  const L = window.WRLedger, F = window.WRFormat;
  const LEVEL = { ok: ['check', 'صرفك مضبوط'], warn: ['clock', 'قربت توصل للسقف!'], over: ['alert', 'فاتك السقف!'] };

  function row(c) {
    const pct = c.budget ? Math.min(100, Math.round(c.spent / c.budget * 100)) : 0;
    const status = c.budget ? (c.remaining >= 0 ? `باقيلك ${WR.money(c.remaining)}` : `زايد ${WR.money(-c.remaining)}`) : 'بدون سقف';
    return `<button type="button" class="budget-row" data-action="edit-category" data-id="${WR.safe(c.id)}" data-level="${c.level}">
      <span class="tx-ic" style="--c:${c.color}">${WR.icon(c.icon)}</span>
      <span class="budget-main"><span class="budget-top"><b>${WR.safe(c.name)}</b>
        ${LEVEL[c.level] ? `<span class="pill" data-tone="${c.level}">${WR.icon(LEVEL[c.level][0])}${LEVEL[c.level][1]}</span>` : ''}</span>
        ${c.budget ? `<span class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${WR.safe(c.name)}"><i style="width:${pct}%" data-level="${c.level}"></i></span>` : ''}
        <span class="budget-numbers"><small>صرفت ${WR.money(c.spent)}${c.budget ? ` من ${WR.money(c.budget)}` : ''}</small><small class="budget-left">${status}</small></span></span></button>`;
  }

  function reserveCard(app) {
    const items = L.reserves(app.state, app.currentKey());
    return `<section class="card reserves">
      <header class="card-head"><h2>مبالغ معزولة</h2>
        <button type="button" class="btn small ghost" data-action="edit-reserve">${WR.icon('plus')}مبلغ معزول جديد</button></header>
      ${items.length ? items.map(({ account, balance, paidThisMonth, needed }) => `<article class="reserve-item">
        <header class="reserve-head">
          <span class="tx-ic">${WR.icon('wallet')}</span>
          <h3>${WR.safe(account.name)}</h3>
          <button type="button" class="icon-btn" data-action="edit-reserve" data-id="${WR.safe(account.id)}" aria-label="${WR.safe('تعديل ' + account.name)}">${WR.icon('edit')}</button>
        </header>
        <div class="reserve-balance"><span>المعزول الآن</span><strong data-reserve-value="balance">${WR.money(balance)}</strong></div>
        ${account.reserveTarget ? `<p class="muted reserve-status">الهدف ${WR.money(account.reserveTarget)} · <span data-reserve-value="needed">${needed ? 'باقي ' + WR.money(needed) : 'اكتمل لهذا الشهر'}</span></p>` : ''}
        ${paidThisMonth ? `<p class="muted reserve-status">تسدّد هالشهر <span data-reserve-value="paid">${WR.money(paidThisMonth)}</span></p>` : ''}
        <div class="btn-row">
          ${[['fund', 'plus', 'اعزل', 'primary'], ['withdraw', 'transfer', 'رجّع', 'ghost'], ['pay', 'check', 'سدّد', 'ghost']].map(([mode, icon, label, style]) =>
            `<button type="button" class="btn small ${style}" data-action="reserve-move" data-mode="${mode}" data-id="${WR.safe(account.id)}" ${mode !== 'fund' && !balance ? 'disabled' : ''}>${WR.icon(icon)}${label}</button>`).join('')}
        </div>
      </article>`).join('') : '<p class="muted">اعزل مبلغ من رصيدك لدفعة مثل سلفة الدوام. تقدر تزيده أو ترجع منه لحسابك عند الحاجة.</p>'}
    </section>`;
  }

  function editReserve(id) {
    const app = WR.app, state = app.state;
    const account = id ? state.accounts.find(a => a.id === id && !a.archived && a.reserveTarget !== undefined) : null;
    if (id && !account) return;
    const currency = WR.cur(), balance = account ? L.balances(state).accounts[id] : 0;
    WR.sheet({
      title: account ? `تعديل «${account.name}»` : 'مبلغ معزول جديد',
      body: WR.field({ label: 'الاسم', name: 'name', value: account?.name, attrs: 'required maxlength="40" placeholder="مثلاً: سلفة الدوام"' }) +
        WR.amountField({ label: 'الهدف الشهري (اختياري)', name: 'target', value: account?.reserveTarget ? F.amountInputValue(account.reserveTarget, currency.dec) : '', attrs: '' }),
      secondary: account && !balance ? { label: 'إزالة المبلغ المعزول', danger: true, run: close => {
        app.commit(L.removeAccount(app.state, id), 'أُزيل المبلغ المعزول');
        close();
      } } : null,
      onSubmit: (data, form, close) => {
        const current = app.state, name = (data.name || '').trim();
        if (!name) throw new Error('اكتب اسم المبلغ المعزول.');
        const reserveTarget = data.target ? WR.parseAmount(data.target, { allowZero: true }) : 0;
        if (current.accounts.some(a => a.id !== id && !a.archived && a.name === name)) throw new Error('يوجد حساب أو مبلغ معزول بهذا الاسم.');
        if (id && !current.accounts.some(a => a.id === id && !a.archived && a.reserveTarget !== undefined)) throw new Error('هذا المبلغ المعزول غير متاح.');
        const next = L.saveAccount(current, id ? { id, name, reserveTarget } : { name, reserveTarget, opening: 0 });
        app.commit(next, id ? 'تم حفظ المبلغ المعزول' : 'أُضيف المبلغ المعزول');
        close();
      }
    });
  }

  function reserveMove(id, mode) {
    const actions = { fund: ['اعزل من فلوسك', 'اعزل', 'تم عزل المبلغ'],
      withdraw: ['رجّع لفلوسك', 'رجّع', 'تم إرجاع المبلغ'], pay: ['سدّد', 'سدّد', 'تم تسجيل التسديد'] };
    const app = WR.app, state = app.state;
    const reserve = L.reserves(state, app.currentKey()).find(x => x.account.id === id);
    if (!reserve || !Object.hasOwn(actions, mode)) return;
    const [title, submitLabel, message] = actions[mode];
    const { account, balance, paidThisMonth } = reserve;
    const totals = L.balances(state);
    const needsAccount = mode !== 'pay' && !L.unifiedWallet(state);
    const accounts = state.accounts.filter(a => !a.archived && a.reserveTarget === undefined);
    const available = mode === 'fund' ? L.walletTotals(state, totals).available : balance;
    const due = Math.max(0, account.reserveTarget - paidThisMonth);
    WR.sheet({
      title: `${title} · ${account.name}`, submitLabel,
      subtitle: needsAccount ? '' : (mode === 'fund' ? 'المتاح للصرف ' : 'المعزول الآن ') + WR.moneyText(available),
      body: WR.amountField({ big: true, attrs: 'required autofocus', value: mode === 'pay' ?
        F.amountInputValue(Math.min(balance, due || balance), WR.cur().dec) : '' }) +
        (needsAccount ? `<label class="field"><span>${mode === 'fund' ? 'من حساب' : 'إلى حساب'}</span><select name="accountId">
          ${accounts.map(a => `<option value="${WR.safe(a.id)}">${WR.safe(a.name)}</option>`).join('')}</select></label>` : ''),
      onSubmit: (data, form, close) => {
        const amount = WR.parseAmount(data.amount || '');
        const next = L.moveReserve(app.state, id, mode, amount, { accountId: data.accountId, today: app.today() });
        app.commit(next, message);
        close();
      }
    });
  }

  function render(app) {
    const s = app.state, m = L.monthSummary(s, app.monthKey, { today: app.today() });
    const active = m.categories.filter(c => !c.archived);
    const planned = active.filter(c => c.budget);
    const open = active.filter(c => !c.budget).sort((a, b) => b.spent - a.spent);
    const openSpent = open.reduce((sum, category) => sum + category.spent, 0);
    const usedPct = m.budgetTotal ? Math.min(100, Math.round(m.budgetedSpent / m.budgetTotal * 100)) : 0;
    const archivedSpent = m.categories.filter(c => c.archived);
    return WR.pageHead('الميزانية', 'تابع صرفك حسب الفئة واعزل مبالغ للدفعات الجاية.',
      '<button type="button" class="btn ghost" data-action="new-category">' + WR.icon('plus') + 'فئة جديدة</button>') +
      reserveCard(app) + WR.monthBar() +
      `<section class="card budget-summary">
        <div class="kpis"><div><span>مجموع السقوف</span><b>${WR.money(m.budgetTotal)}</b></div>
          <div><span>صرفت منها</span><b>${WR.money(m.budgetedSpent)}</b></div>
          <div><span>${m.budgetedSpent > m.budgetTotal ? 'الزايد' : 'الباقي'}</span><b>${WR.money(m.remainingBudget || Math.max(0, m.budgetedSpent - m.budgetTotal))}</b></div></div>
        ${m.budgetTotal ? `<span class="meter big" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${usedPct}" aria-label="نسبة المصروف من الميزانية"><i style="width:${usedPct}%" data-level="${m.pace.status}"></i></span>
          <p class="muted">مضى ${m.pace.elapsed}% من الشهر واستخدمت ${m.pace.used}% من الميزانية.${m.income ? ` الميزانية تساوي ${Math.round(m.budgetTotal / m.income * 100)}% من دخل الشهر.` : ''}</p>` :
          '<p class="muted">اضغط على أي فئة لتحدد سقفها الشهري.</p>'}
      </section>
      ${planned.length ? `<section class="card"><header class="card-head"><h2>فئات لها سقف</h2></header><div class="budget-list">${planned.map(row).join('')}</div></section>` : ''}
      ${open.length ? `<section class="card"><header class="card-head"><h2>فئات بدون سقف</h2>
        <span class="muted">مجموع الصرف ${WR.money(openSpent)}</span></header>
        <div class="budget-list">${open.map(row).join('')}</div></section>` : ''}
      ${archivedSpent.length ? `<section class="card"><header class="card-head"><h2>فئات مؤرشفة صُرف منها هذا الشهر</h2></header><div class="budget-list">${archivedSpent.map(row).join('')}</div></section>` : ''}`;
  }

  function editCategory(id) {
    const s = WR.app.state, c = id ? s.categories.find(x => x.id === id) : { name: '', icon: 'dots', color: L.COLORS[s.categories.length % L.COLORS.length], budget: 0 };
    if (!c) return;
    const icons = ['cart', 'coffee', 'car', 'bolt', 'home', 'kids', 'health', 'shirt', 'spark', 'gift', 'receipt', 'book', 'phone', 'user', 'shield', 'wallet', 'dots'];
    const used = id && s.transactions.some(t => t.categoryId === id);
    WR.sheet({
      title: id ? `فئة «${c.name}»` : 'فئة جديدة',
      body: WR.field({ label: 'اسم الفئة', name: 'name', value: c.name, attrs: 'required maxlength="40"' }) +
        WR.chips({ name: 'budgetMode', label: 'طريقة المتابعة', value: c.budget ? 'limited' : 'open',
          options: [{ value: 'open', label: 'بدون سقف', icon: 'list' }, { value: 'limited', label: 'سقف شهري', icon: 'pie' }] }) +
        `<div data-budget-limit ${c.budget ? '' : 'hidden'}>${WR.amountField({ label: 'السقف الشهري', name: 'budget', value: c.budget ? F.amountInputValue(c.budget, WR.cur().dec) : '' })}</div>` +
        `<fieldset class="chips icon-pick"><legend>الأيقونة</legend>${icons.map(i => `<label class="chip icon-chip"><input type="radio" name="icon" value="${i}" ${c.icon === i ? 'checked' : ''}><span style="--c:${c.color}">${WR.icon(i)}</span></label>`).join('')}</fieldset>
        <fieldset class="chips color-pick"><legend>اللون</legend>${L.COLORS.map(col => `<label class="chip color-chip"><input type="radio" name="color" value="${col}" ${c.color.toUpperCase() === col ? 'checked' : ''} aria-label="${col}"><span style="--c:${col}"></span></label>`).join('')}</fieldset>`,
      submitLabel: id ? 'حفظ' : 'إضافة الفئة',
      secondary: id ? { label: used ? 'أرشفة الفئة' : 'حذف الفئة', danger: true, run: close => {
        const current = WR.app.state;
        if (current.categories.filter(x => !x.archived).length <= 1) throw new Error('يجب أن تبقى فئة واحدة على الأقل.');
        WR.app.commit(L.removeCategory(current, id), current.transactions.some(t => t.categoryId === id)
          ? `أُرشفت «${c.name}»: تبقى حركاتها في السجل ولن تظهر في التسجيل الجديد.` : `حُذفت «${c.name}»`);
        close();
      } } : null,
      onOpen: form => {
        const limit = form.querySelector('[data-budget-limit]');
        form.addEventListener('change', e => {
          if (e.target.name === 'budgetMode') limit.hidden = e.target.value !== 'limited';
        });
      },
      onSubmit: (data, form, close) => {
        const current = WR.app.state;
        const name = (data.name || '').trim(); if (!name) throw new Error('اكتب اسم الفئة.');
        if (id && !current.categories.some(x => x.id === id)) throw new Error('هذه الفئة لم تعد موجودة.');
        if (current.categories.some(x => x.id !== id && !x.archived && x.name === name)) throw new Error('توجد فئة بهذا الاسم.');
        const budget = data.budgetMode === 'limited' ? WR.parseAmount(data.budget || '') : 0;
        const item = { name, budget, icon: data.icon || c.icon, color: data.color || c.color };
        if (id) item.id = id; else item.archived = false;
        WR.app.commit(L.saveCategory(current, item), id ? `تم حفظ «${name}»` : `أُضيفت فئة «${name}»`);
        close();
      }
    });
  }

  WR.views = WR.views || {};
  WR.views.budget = { render };
  WR.actions = Object.assign(WR.actions || {}, {
    'edit-category': d => editCategory(d.id),
    'new-category': () => editCategory(null),
    'edit-reserve': d => editReserve(d.id),
    'reserve-move': d => reserveMove(d.id, d.mode)
  });
})(window.WR = window.WR || {});
