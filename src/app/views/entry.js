/* وين راحت؟ — entry.js: one sheet to record or edit an expense, income or transfer. */
(function (WR) {
  'use strict';
  const L = window.WRLedger, F = window.WRFormat;
  const TYPES = [['expense', 'مصروف', 'expense'], ['income', 'دخل', 'income'], ['transfer', 'تحويل', 'transfer']];
  const quickSteps = () => WR.cur().dec ? [1, 5, 10, 50] : [1000, 5000, 10000, 25000];

  /** The account used most recently for this type (a sensible default). */
  function lastAccount(state, type) {
    const t = L.sortNewest(state.transactions).find(x => x.type === type);
    const active = state.accounts.filter(a => !a.archived && a.reserveTarget === undefined);
    return active.some(a => a.id === t?.accountId) ? t.accountId : active[0].id;
  }

  function open({ type = 'expense', tx = null, preset = {}, title, fixedAccounts } = {}) {
    const app = WR.app, s = app.state, today = app.today();
    const v = tx ? { ...tx } : { type, date: today, accountId: lastAccount(s, type), ...preset };
    if (!v.type) v.type = type;
    const accounts = s.accounts.filter(a => !a.archived || a.id === v.accountId || a.id === v.toAccountId);
    function accountChips(name, value, label) {
      const fixed = fixedAccounts?.[name];
      const other = name === 'fromAccountId' ? fixedAccounts?.toAccountId :
        name === 'toAccountId' ? fixedAccounts?.fromAccountId : null;
      const choices = accounts.filter(a => {
        if (fixed) return a.id === fixed;
        if (name === 'accountId') return a.reserveTarget === undefined || a.id === value;
        return a.id !== other;
      });
      return WR.chips({ name, value: fixed || value, label, cls: 'chips-row',
        options: choices.map(a => ({ value: a.id, label: a.name, icon: a.id === 'card' ? 'card' : a.id === 'cash' ? 'cash' : 'wallet' })) });
    }
    const categories = s.categories.filter(c => !c.archived || c.id === v.categoryId);
    const sources = s.incomeSources.filter(x => !x.archived || x.id === v.sourceId);
    const dateChoice = v.date === today ? 'today' : v.date === F.addDays(today, -1) ? 'yesterday' : 'other';

    const body = `<div class="entry" data-type="${v.type}">
      ${fixedAccounts ? `<input type="hidden" name="type" value="${v.type}">` :
      `<fieldset class="seg" role="radiogroup"><legend class="sr-only">نوع الحركة</legend>${TYPES.map(([id, label, icon]) =>
        `<label><input type="radio" name="type" value="${id}" ${v.type === id ? 'checked' : ''}><span>${WR.icon(icon)}${label}</span></label>`).join('')}</fieldset>`}
      ${WR.amountField({ big: true, value: v.amount ? F.amountInputValue(v.amount, WR.cur().dec) : '', attrs: 'required autofocus' })}
      <div class="quick-amounts" aria-label="إضافة مبلغ سريع">${quickSteps().map(n => `<button type="button" data-quick="${n}">+${WR.fmt(n * 10 ** WR.cur().dec)}</button>`).join('')}</div>
      <div class="when-expense">${WR.chips({ name: 'categoryId', value: v.categoryId, label: 'الفئة', cls: 'chips-grid',
        options: categories.map(c => ({ value: c.id, label: c.name, icon: c.icon, color: c.color })) })}</div>
      <div class="when-income">${WR.chips({ name: 'sourceId', value: v.sourceId || '', label: 'مصدر الدخل', cls: 'chips-row',
        options: [...sources.map(x => ({ value: x.id, label: x.name, icon: 'income' })), { value: '', label: 'دخل آخر', icon: 'dots' }] })}</div>
      <div class="when-money">${accountChips('accountId', v.accountId, 'الحساب')}</div>
      <div class="when-transfer">${accountChips('fromAccountId', v.type === 'transfer' ? v.accountId : accounts[0]?.id, 'من حساب')}
        ${accountChips('toAccountId', v.toAccountId || accounts.find(a => a.id !== (v.accountId || accounts[0]?.id))?.id, 'إلى حساب')}</div>
      <fieldset class="chips chips-row date-pick"><legend>اليوم</legend>
        <label class="chip"><input type="radio" name="when" value="today" ${dateChoice === 'today' ? 'checked' : ''}><span><b>اليوم</b></span></label>
        <label class="chip"><input type="radio" name="when" value="yesterday" ${dateChoice === 'yesterday' ? 'checked' : ''}><span><b>أمس</b></span></label>
        <label class="chip"><input type="radio" name="when" value="other" ${dateChoice === 'other' ? 'checked' : ''}><span>${WR.icon('calendar')}<b>تاريخ آخر</b></span></label>
        <input type="date" name="date" value="${WR.safe(v.date)}" max="${today}" aria-label="التاريخ" ${dateChoice === 'other' ? '' : 'hidden'}>
      </fieldset>
      ${WR.field({ label: 'ملاحظة (اختيارية)', name: 'note', value: v.note || '', attrs: 'maxlength="140" placeholder="مثلاً: خضار وفواكه"' })}
    </div>`;

    WR.sheet({
      title: title || (tx ? 'تعديل الحركة' : 'سجّل حركة'), body, submitLabel: tx ? 'حفظ التعديل' : 'حفظ',
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
        const t = fixedAccounts ? type : data.type, amount = WR.parseAmount(data.amount || '');
        const date = data.when === 'today' ? today : data.when === 'yesterday' ? F.addDays(today, -1) : data.date;
        if (!F.isDate(date)) throw new Error('اختر تاريخاً صحيحاً.');
        const entry = { type: t, amount, date, note: data.note || '' };
        if (t === 'expense') { if (!data.categoryId) throw new Error('اختر فئة المصروف.'); Object.assign(entry, { categoryId: data.categoryId, accountId: fixedAccounts?.accountId || data.accountId }); }
        if (t === 'income') Object.assign(entry, { sourceId: data.sourceId || null, accountId: data.accountId });
        if (t === 'transfer') {
          const from = fixedAccounts?.fromAccountId || data.fromAccountId;
          const to = fixedAccounts?.toAccountId || data.toAccountId;
          if (!from || !to || from === to) throw new Error('اختر حسابين مختلفين للتحويل.');
          Object.assign(entry, { accountId: from, toAccountId: to });
        }
        if (!entry.accountId) throw new Error('اختر الحساب.');
        const current = app.state;
        if (fixedAccounts && Object.values(fixedAccounts).some(id => !current.accounts.some(a => a.id === id && !a.archived))) {
          throw new Error('هذا المبلغ المعزول غير متاح.');
        }
        const next = tx ? L.updateTransaction(current, tx.id, entry, { today }) : L.addTransaction(current, entry, { today }).state;
        app.commit(next, message(entry, !!tx, next), { tone: warning(next, entry) ? 'warn' : 'ok' });
        close();
      }
    });
  }

  function warning(state, entry) {
    const b = L.balances(state).accounts;
    return [entry.accountId, entry.toAccountId].filter(Boolean).find(id => b[id] < 0);
  }
  function message(entry, edited, state) {
    const verb = edited ? 'تم تعديل' : 'تم تسجيل';
    const what = entry.type === 'expense' ? `مصروف ${WR.moneyText(entry.amount)} في «${WR.category(entry.categoryId).name}»`
      : entry.type === 'income' ? `دخل ${WR.moneyText(entry.amount)}` : `تحويل ${WR.moneyText(entry.amount)}`;
    const negative = warning(state, entry);
    return `${verb} ${what}` + (negative ? ` · تنبيه: رصيد «${WR.account(negative).name}» صار سالباً، راجع رصيد البداية من الإعدادات.` : '');
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
