(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MizanMigration = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const IDS = ['home', 'kids', 'personal', 'emergency'];
  const WALLET_META = {
    home: { name: 'المنزل والخضروات', kind: 'spend', color: '#2d8b73', weight: 125 },
    kids: { name: 'الأسرة والأطفال', kind: 'spend', color: '#c58f3e', weight: 60 },
    personal: { name: 'المصاريف الشخصية', kind: 'spend', color: '#6289be', weight: 120 },
    emergency: { name: 'الطوارئ', kind: 'emergency', color: '#a08abd', weight: 30 }
  };
  const fail = message => { throw new Error('تعذر استيراد النسخة القديمة: ' + message); };
  const amount = (value, allowZero = false) => {
    if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) fail('يوجد مبلغ غير صحيح أو خارج الحد المسموح.');
    return value;
  };
  const validDate = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value + 'T12:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
  };
  const wallet = value => {
    if (!IDS.includes(value)) fail('توجد محفظة غير معروفة في السجل.');
    return value;
  };
  const method = value => {
    if (!['card', 'cash'].includes(value)) fail('توجد طريقة دفع غير معروفة.');
    return value;
  };
  const text = value => typeof value === 'string' ? value.slice(0, 500) : '';

  function importLegacy(old, Engine) {
    if (!Engine || !Engine.initial || !Engine.commit || !Engine.validate) fail('محرك الحساب غير متاح.');
    if (!old || old.version !== 1 || !old.cycle || !Array.isArray(old.history)) fail('الملف ليس نسخة متوافقة من الإصدار الأول.');
    const c = old.cycle;
    if (!validDate(c.start) || !Number.isSafeInteger(c.days) || c.days < 1 || c.days > 366 || !Array.isArray(c.transactions)) fail('بيانات الدورة غير صحيحة.');
    if (!c.wallets || typeof c.wallets !== 'object') fail('توزيع المحافظ مفقود.');
    const opening = amount(c.opening, true);
    const cash = amount(c.startingCash === undefined ? 0 : c.startingCash, true);
    if (cash > opening) fail('النقد الافتتاحي يتجاوز إجمالي الرصيد.');
    const allocations = IDS.map(id => amount(c.wallets[id], true));
    const sum = allocations.reduce((a, b) => a + b, 0);
    if (!Number.isSafeInteger(sum) || sum !== opening) fail('مجموع مخصصات المحافظ لا يساوي الرصيد الافتتاحي.');

    let state = Engine.initial();
    state.settings = { ...state.settings, currency: 'IQD' };
    state.cycle = { id: 'legacy-' + text(String(c.id || c.start)), start: c.start, days: c.days };
    state.wallets = IDS.map(id => ({ id, ...WALLET_META[id] }));
    state.transactions = [];
    state.obligations = [];
    state.history = [];
    state.reconciliations = [];
    let serial = 0;
    const append = event => {
      event.id = 'legacy-event-' + (++serial);
      state = Engine.commit(state, event);
    };
    if (opening - cash > 0) append({ type: 'income', date: c.start, amount: opening - cash, method: 'card', note: 'رصيد افتتاحي مستورد من النسخة السابقة' });
    if (cash > 0) append({ type: 'income', date: c.start, amount: cash, method: 'cash', note: 'نقد افتتاحي مستورد من النسخة السابقة' });
    IDS.forEach((id, i) => {
      if (allocations[i]) append({ type: 'allocate', date: c.start, walletId: id, amount: allocations[i], note: 'تخصيص افتتاحي مستورد' });
    });
    const seen = new Set();
    const end = new Date(c.start + 'T12:00:00Z');
    end.setUTCDate(end.getUTCDate() + c.days - 1);
    const endDate = end.toISOString().slice(0, 10);
    for (const tx of c.transactions) {
      if (!tx || typeof tx !== 'object' || !validDate(tx.date) || tx.date < c.start || tx.date > endDate) fail('تاريخ حركة غير صحيح أو خارج الدورة الأصلية.');
      if (typeof tx.id !== 'string' || !tx.id || seen.has(tx.id)) fail('معرّفات الحركات مفقودة أو مكررة.');
      seen.add(tx.id);
      const base = { date: tx.date, note: text(tx.note) };
      if (tx.type === 'expense') {
        if (!Array.isArray(tx.items) || !tx.items.length || tx.items.length > 500) fail('بنود مصروف غير صحيحة.');
        const payment = method(tx.method);
        for (const item of tx.items) {
          if (!item || typeof item !== 'object') fail('يوجد بند مصروف تالف.');
          const description = text(item.description);
          append({ ...base, type: 'expense', walletId: wallet(item.wallet), amount: amount(item.amount), method: payment,
            note: [base.note, description].filter(Boolean).join(' · ').slice(0, 500) });
        }
      } else if (tx.type === 'transfer') {
        append({ ...base, type: 'transfer', from: wallet(tx.from), to: wallet(tx.to), amount: amount(tx.amount) });
      } else if (tx.type === 'cash') {
        if (!['withdraw', 'deposit'].includes(tx.direction)) fail('اتجاه حركة النقد غير معروف.');
        append({ ...base, type: 'account', from: tx.direction === 'withdraw' ? 'card' : 'cash', to: tx.direction === 'withdraw' ? 'cash' : 'card', amount: amount(tx.amount) });
      } else if (tx.type === 'income') {
        const payment = method(tx.method), target = wallet(tx.wallet), value = amount(tx.amount);
        append({ ...base, type: 'income', method: payment, amount: value });
        append({ ...base, type: 'allocate', walletId: target, amount: value });
      } else fail('توجد حركة غير معروفة في السجل.');
    }
    // Keep old archived cycles as reference only: their closing balances are
    // already included in the current opening and must never be added again.
    state.legacyHistory = JSON.parse(JSON.stringify(old.history));
    state.migration = {
      sourceVersion: 1,
      sourceCycleId: text(String(c.id || '')),
      importedAt: new Date().toISOString(),
      sourceTransactionCount: c.transactions.length,
      openingIncludesPriorRollover: !!c.rollover,
      originalReconciliation: c.recon ? JSON.parse(JSON.stringify(c.recon)) : null
    };
    Engine.validate(state);
    return state;
  }

  return { importLegacy };
});
