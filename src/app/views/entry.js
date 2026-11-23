/* وين راحت؟ — entry.js: one sheet to record or edit an expense, income or transfer. */
(function (WR) {
  'use strict';
  const L = window.WRLedger, F = window.WRFormat;
  const TYPES = [['expense', 'مصروف', 'expense'], ['income', 'دخل', 'income'], ['transfer', 'تحويل', 'transfer']];
  const SPOUSE_OPTION = '@spouse', INFERRED_OPTION = '@inferred';
  const quickSteps = () => WR.cur().dec ? [1, 5, 10, 50] : [1000, 5000, 10000, 25000];

  /** The account used most recently for this type (a sensible default). */
  function lastAccount(state, type) {
    const t = L.sortNewest(state.transactions).find(x => x.type === type);
    const active = state.accounts.filter(a => !a.archived && a.reserveTarget === undefined);
    return active.some(a => a.id === t?.accountId) ? t.accountId : active[0].id;
  }

  function incomeChoices(state, entry) {
    const resolved = entry.type === 'income' ? L.resolveIncomeSource(state, entry) : null;
    const sources = state.incomeSources.filter(s => !s.archived || s.id === resolved?.sourceId);
    const spouseSources = sources.filter(s => L.isSpouseIncomeName(s.name) && !L.resolveIncomeSource(state, { sourceId: s.id }).payroll);
    const spouse = spouseSources.find(s => s.id === resolved?.sourceId) || spouseSources.find(s => s.name === L.SPOUSE_INCOME_NAME) || spouseSources[0];
    const options = sources.filter(s => !spouseSources.includes(s) || s === spouse)
      .map(s => ({ value: s.id, label: s === spouse ? L.SPOUSE_INCOME_NAME : s.name, icon: s === spouse ? 'home' : 'income' }));
    if (!spouse) options.push({ value: SPOUSE_OPTION, label: L.SPOUSE_INCOME_NAME, icon: 'home' });
    let selected = resolved?.sourceId || '';
    if (!selected && resolved && resolved.name !== 'دخل آخر') {
      if (resolved.name === L.SPOUSE_INCOME_NAME) selected = spouse?.id || SPOUSE_OPTION;
      else {
        selected = INFERRED_OPTION;
        options.push({ value: selected, label: resolved.name, icon: 'income' });
      }
    }
    options.push({ value: '', label: 'دخل آخر', icon: 'dots' });
    return { options, selected };
  }

  function open({ type = 'expense', tx = null, preset = {} } = {}) {
    const app = WR.app, s = app.state, today = app.today(), unified = L.unifiedWallet(s);
    const v = tx || { type, date: today, ...preset };
    const accounts = s.accounts.filter(a => !a.archived || a.id === v.accountId || a.id === v.toAccountId);
    const selected = accounts.find(a => a.id === v.accountId);
    const reservePayment = tx?.type === 'expense' && selected?.reserveTarget !== undefined;
    const lockedType = reservePayment || (unified && tx?.type === 'transfer');
    const accountOption = a => ({ value: a.id, label: a.name, icon: a.id === 'card' ? 'card' : a.id === 'cash' ? 'cash' : 'wallet' });
    const regular = accounts.filter(a => a.reserveTarget === undefined);
    const cashOrCard = regular.filter(a => a.pooled !== true);
    const accountId = v.accountId || (unified ? '' : lastAccount(s, v.type));
    const transferFrom = tx?.type === 'transfer' ? tx.accountId : lastAccount(s, 'transfer');
    const transferTo = v.toAccountId || accounts.find(a => a.id !== transferFrom)?.id;
    const types = unified ? TYPES.slice(0, 2) : TYPES;
    const payment = unified ? (cashOrCard.length ? `<details class="optional-field" ${selected && !selected.pooled ? 'open' : ''}>
      <summary>طريقة الدفع أو الاستلام (اختياري)</summary>
      <label class="field"><span class="sr-only">طريقة الدفع أو الاستلام</span><select name="accountId">
        <option value="">بدون تحديد</option>${cashOrCard.map(a =>
          `<option value="${WR.safe(a.id)}" ${a.id === accountId ? 'selected' : ''}>${WR.safe(a.name)}</option>`).join('')}
      </select></label></details>` : '') : WR.chips({ name: 'accountId', value: accountId, label: 'الحساب', options: regular.map(accountOption) });
    const categories = s.categories.filter(c => !c.archived || c.id === v.categoryId);
    const income = incomeChoices(s, v);
    const dateChoice = v.date === today ? 'today' : v.date === F.addDays(today, -1) ? 'yesterday' : 'other';

    const body = `<div class="entry" data-type="${v.type}">
      ${lockedType ? '' :
      `<fieldset class="seg" role="radiogroup"><legend class="sr-only">نوع الحركة</legend>${types.map(([id, label, icon]) =>
        `<label><input type="radio" name="type" value="${id}" ${v.type === id ? 'checked' : ''}><span>${WR.icon(icon)}${label}</span></label>`).join('')}</fieldset>`}
      ${WR.amountField({ big: true, value: v.amount ? F.amountInputValue(v.amount, WR.cur().dec) : '', attrs: 'required autofocus' })}
      <div class="quick-amounts" aria-label="إضافة مبلغ سريع">${quickSteps().map(n => `<button type="button" data-quick="${n}">+${WR.fmt(n * 10 ** WR.cur().dec)}</button>`).join('')}</div>
      <div class="when-expense">${WR.chips({ name: 'categoryId', value: v.categoryId, label: 'الفئة', cls: 'chips-grid',
        options: categories.map(c => ({ value: c.id, label: c.name, icon: c.icon, color: c.color })) })}</div>
      <div class="when-income">${WR.chips({ name: 'sourceId', value: income.selected, label: 'مصدر الدخل', cls: 'chips-row',
        options: income.options })}</div>
      ${reservePayment ? '' : `<div class="when-money">${payment}</div>`}
      ${unified ? '' : `<div class="when-transfer">
        ${WR.chips({ name: 'fromAccountId', value: transferFrom, label: 'من حساب', options: accounts.map(accountOption) })}
        ${WR.chips({ name: 'toAccountId', value: transferTo, label: 'إلى حساب', options: accounts.map(accountOption) })}</div>`}
      <fieldset class="chips chips-row date-pick"><legend>اليوم</legend>
        <label class="chip"><input type="radio" name="when" value="today" ${dateChoice === 'today' ? 'checked' : ''}><span><b>اليوم</b></span></label>
        <label class="chip"><input type="radio" name="when" value="yesterday" ${dateChoice === 'yesterday' ? 'checked' : ''}><span><b>أمس</b></span></label>
        <label class="chip"><input type="radio" name="when" value="other" ${dateChoice === 'other' ? 'checked' : ''}><span>${WR.icon('calendar')}<b>تاريخ آخر</b></span></label>
        <input type="date" name="date" value="${WR.safe(v.date)}" max="${today}" aria-label="التاريخ" ${dateChoice === 'other' ? '' : 'hidden'}>
      </fieldset>
      ${WR.field({ label: 'ملاحظة (اختيارية)', name: 'note', value: v.note || '', attrs: 'maxlength="140" placeholder="مثلاً: خضار وفواكه"' })}
    </div>`;

    WR.sheet({
      title: tx ? 'تعديل الحركة' : 'سجّل حركة', body, submitLabel: tx ? 'حفظ التعديل' : 'حفظ',
      secondary: tx ? { label: 'حذف', danger: true, run: () => remove(tx) } : null,
      onOpen: form => {
        const root = form.querySelector('.entry'), date = form.querySelector('input[name=date]');
        form.addEventListener('change', e => {
          if (e.target.name === 'type') root.dataset.type = e.target.value;
          if (e.target.name === 'when') date.hidden = e.target.value !== 'other';
        });
        form.querySelector('.quick-amounts').addEventListener('click', e => {
          const b = e.target.closest('[data-quick]'); if (!b) return;
          const input = form.querySelector('input[name=amount]');
          let current = 0; try { current = input.value.trim() ? WR.parseAmount(input.value, { allowZero: true }) : 0; } catch { current = 0; }
          input.value = WR.fmt(current + Number(b.dataset.quick) * 10 ** WR.cur().dec).replace(/[٬]/g, ',');
          input.dispatchEvent(new Event('input'));
        });
      },
      onSubmit: (data, form, close) => {
        const t = lockedType ? v.type : data.type, amount = WR.parseAmount(data.amount || '');
        const date = data.when === 'today' ? today : data.when === 'yesterday' ? F.addDays(today, -1) : data.date;
        if (!F.isDate(date)) throw new Error('اختر تاريخاً صحيحاً.');
        const entry = { type: t, amount, date, note: data.note || '' };
        let current = app.state;
        if (t === 'transfer') {
          const from = unified ? v.accountId : data.fromAccountId;
          const to = unified ? v.toAccountId : data.toAccountId;
          if (!from || !to || from === to) throw new Error('اختر حسابين مختلفين للتحويل.');
          Object.assign(entry, { accountId: from, toAccountId: to });
        } else {
          if (t === 'expense' && !data.categoryId) throw new Error('اختر فئة المصروف.');
          let accountId = reservePayment ? v.accountId : data.accountId;
          if (unified && !accountId) ({ state: current, accountId } = L.ensureWallet(current));
          if (!accountId) throw new Error('اختر الحساب.');
          entry.accountId = accountId;
          if (t === 'expense') entry.categoryId = data.categoryId;
          else if (data.sourceId === INFERRED_OPTION || (tx?.type === 'income' && !tx.sourceId && data.sourceId === income.selected)) {
            entry.sourceId = null;
          } else if (data.sourceId === SPOUSE_OPTION) {
            const source = current.incomeSources.find(x => !x.archived && x.name === L.SPOUSE_INCOME_NAME);
            entry.sourceId = source?.id || L.uid();
            if (!source) current = L.saveIncomeSource(current, { id: entry.sourceId, name: L.SPOUSE_INCOME_NAME, day: null, amount: 0, accountId });
          } else {
            entry.sourceId = data.sourceId || null;
            if (!entry.sourceId && income.selected) entry.inferIncomeSource = false;
          }
        }
        const next = tx ? L.updateTransaction(current, tx.id, entry, { today }) : L.addTransaction(current, entry, { today }).state;
        const negative = warning(next, entry);
        app.commit(next, message(entry, !!tx, negative), { tone: negative ? 'warn' : 'ok' });
        close();
      }
    });
  }

  function warning(state, entry) {
    const totals = L.balances(state);
    if (L.unifiedWallet(state)) return L.walletTotals(state, totals).available < 0 ? 'المتاح للصرف' : '';
    const id = [entry.accountId, entry.toAccountId].find(a => totals.accounts[a] < 0);
    return id ? 'رصيد «' + state.accounts.find(a => a.id === id).name + '»' : '';
  }

  function message(entry, edited, negative) {
    const verb = edited ? 'تم تعديل' : 'تم تسجيل';
    const what = entry.type === 'expense' ? `مصروف ${WR.moneyText(entry.amount)} في «${WR.category(entry.categoryId).name}»`
      : entry.type === 'income' ? `دخل ${WR.moneyText(entry.amount)}` : `تحويل ${WR.moneyText(entry.amount)}`;
    return `${verb} ${what}` + (negative ? ` · تنبيه: ${negative} صار سالباً.` : '');
  }

  async function remove(tx) {
    const ok = await WR.confirm({ title: 'حذف الحركة؟', text: `ستُحذف الحركة (${WR.moneyText(tx.amount)}) ويُعاد حساب الأرصدة.`, confirmLabel: 'حذف', danger: true });
    if (!ok) return;
    try { WR.app.commit(L.removeTransaction(WR.app.state, tx.id), 'تم حذف الحركة'); }
    catch (error) { WR.toast(error.message, { tone: 'error' }); }
  }

  WR.entry = { open };
  WR.actions = Object.assign(WR.actions || {}, {
    add: d => open({ type: d.type || 'expense', preset: d.category ? { categoryId: d.category } : {} }),
    'edit-tx': d => { const tx = WR.app.state.transactions.find(t => t.id === d.id); if (tx) open({ tx }); }
  });
})(window.WR = window.WR || {});
