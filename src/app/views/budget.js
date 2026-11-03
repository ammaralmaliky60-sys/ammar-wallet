/* وين راحت؟ — budget.js: a monthly cap per category, compared with what was actually spent. */
(function (WR) {
  'use strict';
  const L = window.WRLedger, F = window.WRFormat;
  const LEVEL = { ok: ['check', 'ضمن السقف'], warn: ['clock', 'قارب السقف'], over: ['alert', 'تجاوز السقف'] };

  function row(c) {
    const pct = c.budget ? Math.min(100, Math.round(c.spent / c.budget * 100)) : 0;
    const status = c.budget ? (c.remaining >= 0 ? `باقي ${WR.money(c.remaining)}` : `زاد ${WR.money(-c.remaining)}`) : 'بدون سقف';
    return `<button type="button" class="budget-row" data-action="edit-category" data-id="${WR.safe(c.id)}" data-level="${c.level}">
      <span class="tx-ic" style="--c:${c.color}">${WR.icon(c.icon)}</span>
      <span class="budget-main"><span class="budget-top"><b>${WR.safe(c.name)}</b>
        ${LEVEL[c.level] ? `<span class="pill" data-tone="${c.level}">${WR.icon(LEVEL[c.level][0])}${LEVEL[c.level][1]}</span>` : ''}</span>
        ${c.budget ? `<span class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${WR.safe(c.name)}"><i style="width:${pct}%" data-level="${c.level}"></i></span>` : ''}
        <span class="budget-numbers"><small>صرفت ${WR.money(c.spent)}${c.budget ? ` من ${WR.money(c.budget)}` : ''}</small><small class="budget-left">${status}</small></span></span></button>`;
  }

  function render(app) {
    const s = app.state, m = L.monthSummary(s, app.monthKey, { today: app.today() });
    const active = m.categories.filter(c => !c.archived);
    const planned = active.filter(c => c.budget), unplanned = active.filter(c => !c.budget);
    const usedPct = m.budgetTotal ? Math.min(100, Math.round(m.budgetedSpent / m.budgetTotal * 100)) : 0;
    const archivedSpent = m.categories.filter(c => c.archived);
    return WR.pageHead('الميزانية', 'حدد سقفاً شهرياً لكل فئة، وتابع كم صرفت منه. السقف للمقارنة ولا يحجز مالاً.',
      '<button type="button" class="btn ghost" data-action="new-category">' + WR.icon('plus') + 'فئة جديدة</button>') +
      WR.monthBar() +
      `<section class="card budget-summary">
        <div class="kpis"><div><span>الميزانية</span><b>${WR.money(m.budgetTotal)}</b></div>
          <div><span>صرفت منها</span><b>${WR.money(m.budgetedSpent)}</b></div>
          <div><span>${m.remainingBudget || !m.budgetTotal ? 'المتبقي' : 'تجاوزت بـ'}</span><b>${WR.money(m.remainingBudget || Math.max(0, m.budgetedSpent - m.budgetTotal))}</b></div></div>
        ${m.budgetTotal ? `<span class="meter big" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${usedPct}" aria-label="نسبة المصروف من الميزانية"><i style="width:${usedPct}%" data-level="${m.pace.status}"></i></span>
          <p class="muted">مضى ${m.pace.elapsed}% من الشهر واستخدمت ${m.pace.used}% من الميزانية.${m.income ? ` الميزانية تساوي ${Math.round(m.budgetTotal / m.income * 100)}% من دخل الشهر.` : ''}</p>` :
          '<p class="muted">اضغط على أي فئة لتحدد سقفها الشهري.</p>'}
      </section>
      ${planned.length ? `<section class="card"><header class="card-head"><h2>فئات لها سقف</h2></header><div class="budget-list">${planned.map(row).join('')}</div></section>` : ''}
      <section class="card"><header class="card-head"><h2>${planned.length ? 'فئات بدون سقف' : 'الفئات'}</h2></header>
        <div class="budget-list">${unplanned.map(row).join('') || '<p class="muted">كل الفئات لها سقف.</p>'}</div></section>
      ${archivedSpent.length ? `<section class="card"><header class="card-head"><h2>فئات مؤرشفة صُرف منها هذا الشهر</h2></header><div class="budget-list">${archivedSpent.map(row).join('')}</div></section>` : ''}`;
  }

  function editCategory(id) {
    const s = WR.app.state, c = id ? s.categories.find(x => x.id === id) : { name: '', icon: 'dots', color: L.COLORS[s.categories.length % L.COLORS.length], budget: 0 };
    if (!c) return;
    const icons = ['cart', 'coffee', 'car', 'bolt', 'home', 'kids', 'health', 'shirt', 'spark', 'gift', 'receipt', 'book', 'phone', 'user', 'shield', 'wallet', 'dots'];
    const used = id && s.transactions.some(t => t.categoryId === id);
    WR.sheet({
      title: id ? `فئة «${c.name}»` : 'فئة جديدة',
      subtitle: 'السقف الشهري اختياري: اتركه صفراً إذا ما تريد سقفاً لهذه الفئة.',
      body: WR.field({ label: 'اسم الفئة', name: 'name', value: c.name, attrs: 'required maxlength="40"' }) +
        WR.amountField({ label: 'السقف الشهري', name: 'budget', value: c.budget ? F.amountInputValue(c.budget, WR.cur().dec) : '', attrs: '' }) +
        `<fieldset class="chips icon-pick"><legend>الأيقونة</legend>${icons.map(i => `<label class="chip icon-chip"><input type="radio" name="icon" value="${i}" ${c.icon === i ? 'checked' : ''}><span style="--c:${c.color}">${WR.icon(i)}</span></label>`).join('')}</fieldset>
        <fieldset class="chips color-pick"><legend>اللون</legend>${L.COLORS.map(col => `<label class="chip color-chip"><input type="radio" name="color" value="${col}" ${c.color.toUpperCase() === col ? 'checked' : ''} aria-label="${col}"><span style="--c:${col}"></span></label>`).join('')}</fieldset>`,
      submitLabel: id ? 'حفظ' : 'إضافة الفئة',
      secondary: id ? { label: used ? 'أرشفة الفئة' : 'حذف الفئة', danger: true, run: close => {
        if (s.categories.filter(x => !x.archived).length <= 1) throw new Error('يجب أن تبقى فئة واحدة على الأقل.');
        close();
        WR.app.commit(L.removeCategory(s, id), used ? `أُرشفت «${c.name}»: تبقى حركاتها في السجل ولن تظهر في التسجيل الجديد.` : `حُذفت «${c.name}»`);
      } } : null,
      onSubmit: (data, form, close) => {
        const name = (data.name || '').trim(); if (!name) throw new Error('اكتب اسم الفئة.');
        if (s.categories.some(x => x.id !== id && !x.archived && x.name === name)) throw new Error('توجد فئة بهذا الاسم.');
        const budget = data.budget ? WR.parseAmount(data.budget, { allowZero: true }) : 0;
        const item = { name, budget, icon: data.icon || c.icon, color: data.color || c.color };
        if (id) item.id = id; else item.archived = false;
        close();
        WR.app.commit(L.saveCategory(s, item), id ? `تم حفظ «${name}»` : `أُضيفت فئة «${name}»`);
      }
    });
  }

  WR.views = WR.views || {};
  WR.views.budget = { render };
  WR.actions = Object.assign(WR.actions || {}, {
    'edit-category': d => editCategory(d.id),
    'new-category': () => editCategory(null)
  });
})(window.WR = window.WR || {});
