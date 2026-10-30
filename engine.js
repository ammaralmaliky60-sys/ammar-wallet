(function (root, factory) {
  'use strict';
  const schedule = typeof module === 'object' && module.exports ? require('./schedule.js') : root.IncomeSchedule;
  const api = factory(schedule);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FinanceEngine = api;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this, function (S) {
  'use strict';

  const TYPES = new Set(['income', 'allocate', 'reserve', 'expense', 'pay', 'account', 'transfer', 'release', 'unreserve']);
  const METHODS = new Set(['card', 'cash']);
  const clone = value => JSON.parse(JSON.stringify(value));
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  function fail(message) { throw new Error(message); }
  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `m${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
  }
  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
  }
  function date(value) {
    if (!validDate(value) || value > today()) fail('التاريخ غير صحيح أو يقع في المستقبل.');
  }
  function id(value) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/.test(value) || ['constructor', 'prototype', '__proto__'].includes(value)) fail('معرّف السجل غير صالح.');
  }
  function money(value, allowZero = false) {
    if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) fail('أدخل مبلغاً صحيحاً موجباً ضمن النطاق المسموح.');
  }
  function add(a, b) {
    const n = a + b;
    if (!Number.isSafeInteger(n) || n < 0) fail('الرصيد غير كافٍ أو المبلغ يتجاوز النطاق المسموح.');
    return n;
  }
  function text(value, max, label) {
    if (typeof value !== 'string' || value.length > max) fail(`حقل ${label} غير صالح.`);
  }
  function initial() {
    return {
      version: 2,
      settings: { name: '', currency: 'IQD', theme: 'dark', digits: 'en', incomeSources: S.defaults() },
      cycle: { id: uid(), start: today(), days: 30 },
      wallets: [
        { id: 'home', name: 'المنزل', kind: 'spend', color: '#25866b', weight: 125 },
        { id: 'personal', name: 'المصاريف الشخصية', kind: 'spend', color: '#6485c8', weight: 120 },
        { id: 'kids', name: 'العائلة', kind: 'spend', color: '#c19345', weight: 60 },
        { id: 'emergency', name: 'الطوارئ', kind: 'emergency', color: '#8a75b6', weight: 30 }
      ],
      obligations: [], transactions: [], history: [], reconciliations: []
    };
  }
  function checkStructure(state) {
    if (!record(state) || state.version !== 2 || !record(state.settings) || !record(state.cycle) || !Array.isArray(state.wallets) || !Array.isArray(state.obligations) || !Array.isArray(state.transactions) || !Array.isArray(state.history) || !Array.isArray(state.reconciliations)) fail('ملف البيانات غير متوافق مع الإصدار الحالي.');
    text(state.settings.name, 100, 'الاسم');
    S.validateSources(S.sources(state));
    if (!/^[A-Z]{3}$/.test(state.settings.currency)) fail('رمز العملة غير صالح.');
    if (!['light', 'dark', 'system'].includes(state.settings.theme) || !['en', 'ar'].includes(state.settings.digits)) fail('إعدادات العرض غير صالحة.');
    id(state.cycle.id);
    date(state.cycle.start);
    if (!Number.isInteger(state.cycle.days) || state.cycle.days < 1 || state.cycle.days > 366) fail('مدة الدورة يجب أن تكون بين يوم واحد و366 يوماً.');
    const ids = new Set();
    for (const w of state.wallets) {
      if (!record(w)) fail('تعريف المحفظة غير صالح.');
      id(w.id);
      if (ids.has(w.id)) fail('معرّفات المحافظ مكررة.');
      ids.add(w.id);
      text(w.name, 100, 'اسم المحفظة');
      if (!w.name.trim() || !['spend', 'saving', 'emergency'].includes(w.kind)) fail('اسم المحفظة أو نوعها غير صالح.');
      if (typeof w.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(w.color)) fail('لون المحفظة غير صالح.');
      if (typeof w.weight !== 'number' || !Number.isFinite(w.weight) || w.weight < 0 || w.weight > 1e9) fail('وزن توزيع المحفظة غير صالح.');
    }
    const obligationIds = new Set();
    for (const o of state.obligations) {
      if (!record(o)) fail('تعريف الالتزام غير صالح.');
      id(o.id);
      if (obligationIds.has(o.id)) fail('معرّفات الالتزامات مكررة.');
      obligationIds.add(o.id);
      text(o.name, 100, 'اسم الالتزام');
      money(o.amount);
      if (!o.name.trim() || !validDate(o.due) || typeof o.recurring !== 'boolean') fail('بيانات الالتزام غير صالحة.');
    }
    const archiveIds = new Set();
    for (const h of state.history) {
      if (!record(h) || !record(h.summary) || !Array.isArray(h.transactionIds)) fail('بيانات الدورة المؤرشفة غير صالحة.');
      id(h.id); date(h.start); date(h.closedAt);
      if (archiveIds.has(h.id) || h.start >= h.closedAt || h.closedAt > state.cycle.start || !Number.isInteger(h.days) || h.days < 1 || h.days > 366) fail('تواريخ أو معرّفات الأرشيف غير صالحة.');
      archiveIds.add(h.id);
      money(h.cycleIncome, true); money(h.cycleExpenses, true);
      for (const field of ['card', 'cash', 'total', 'unallocated', 'income', 'expenses', 'obligationPaid']) money(h.summary[field], true);
      let envelopeTotal = h.summary.unallocated;
      for (const field of ['wallets', 'reserved', 'paid']) {
        if (!record(h.summary[field])) fail('ملخص أرصدة الأرشيف غير صالح.');
        for (const [key, value] of Object.entries(h.summary[field])) {
          id(key); money(value, true);
          if (field !== 'paid') envelopeTotal = add(envelopeTotal, value);
        }
      }
      if (add(h.summary.card, h.summary.cash) !== h.summary.total || envelopeTotal !== h.summary.total) fail('أرصدة ملخص الأرشيف غير متوازنة.');
      for (const transactionId of h.transactionIds) id(transactionId);
      if (new Set(h.transactionIds).size !== h.transactionIds.length) fail('معرّفات حركات الأرشيف مكررة.');
    }
    if (state.reconciliations.some(r => !record(r))) fail('بيانات المطابقة غير صالحة.');
  }
  function replay(state) {
    checkStructure(state);
    const s = { card: 0, cash: 0, total: 0, unallocated: 0, wallets: {}, reserved: {}, paid: {}, income: 0, expenses: 0, obligationPaid: 0 };
    const obligations = new Map(state.obligations.map(o => [o.id, o]));
    for (const w of state.wallets) s.wallets[w.id] = 0;
    for (const o of state.obligations) { s.reserved[o.id] = 0; s.paid[o.id] = 0; }
    const transactionIds = new Set();
    const receiptKeys = new Set();
    const transactions = state.transactions.map((event, order) => ({ event, order }));
    for (const { event: e } of transactions) {
      if (!record(e)) fail('حركة مالية غير صالحة.');
      id(e.id);
      if (transactionIds.has(e.id)) fail('معرّفات الحركات مكررة.');
      transactionIds.add(e.id);
      if (!TYPES.has(e.type)) fail('نوع الحركة المالية غير معروف.');
      date(e.date);
      money(e.amount);
      if (e.sourceId !== undefined || e.incomePeriod !== undefined) {
        if (e.type !== 'income') fail('المصدر الشهري يرتبط بالدخل فقط.');
        id(e.sourceId);
        if (typeof e.incomePeriod !== 'string' || !/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(e.incomePeriod) || e.incomePeriod > e.date.slice(0, 7)) fail('فترة استلام الدخل غير صالحة.');
        if (e.sourceName !== undefined) text(e.sourceName, 100, 'مصدر الدخل');
        const key = e.sourceId + ':' + e.incomePeriod;
        if (receiptKeys.has(key)) fail('استلام المصدر نفسه مسجل أكثر من مرة لهذه الفترة.');
        receiptKeys.add(key);
      }
      if (e.note !== undefined) text(e.note, 500, 'الملاحظة');
    }
    for (const h of state.history) {
      if (h.transactionIds.some(transactionId => !transactionIds.has(transactionId))) fail('الأرشيف يشير إلى حركة مالية مفقودة.');
    }
    // Backdated operations are checked in their actual date order; same-day journal order is stable.
    transactions.sort((a, b) => a.event.date.localeCompare(b.event.date) || a.order - b.order);
    for (const { event: e } of transactions) {
      const amount = e.amount;
      const wallet = () => { if (!own(s.wallets, e.walletId)) fail('المحفظة المرتبطة بالحركة غير موجودة.'); };
      const obligation = () => { if (!obligations.has(e.obligationId)) fail('الالتزام المرتبط بالحركة غير موجود.'); };
      const method = () => { if (!METHODS.has(e.method)) fail('اختر البطاقة أو النقد لطريقة الدفع.'); };
      switch (e.type) {
        case 'income':
          method();
          s[e.method] = add(s[e.method], amount);
          s.unallocated = add(s.unallocated, amount);
          s.income = add(s.income, amount);
          break;
        case 'allocate':
          wallet();
          s.unallocated = add(s.unallocated, -amount);
          s.wallets[e.walletId] = add(s.wallets[e.walletId], amount);
          break;
        case 'release':
          wallet();
          s.wallets[e.walletId] = add(s.wallets[e.walletId], -amount);
          s.unallocated = add(s.unallocated, amount);
          break;
        case 'reserve':
          obligation();
          if (amount > obligations.get(e.obligationId).amount - s.reserved[e.obligationId] - s.paid[e.obligationId]) fail('الحجز يتجاوز المبلغ المتبقي من الالتزام.');
          s.unallocated = add(s.unallocated, -amount);
          s.reserved[e.obligationId] = add(s.reserved[e.obligationId], amount);
          break;
        case 'unreserve':
          obligation();
          s.reserved[e.obligationId] = add(s.reserved[e.obligationId], -amount);
          s.unallocated = add(s.unallocated, amount);
          break;
        case 'expense':
          wallet(); method();
          s.wallets[e.walletId] = add(s.wallets[e.walletId], -amount);
          s[e.method] = add(s[e.method], -amount);
          s.expenses = add(s.expenses, amount);
          break;
        case 'pay':
          obligation(); method();
          s.reserved[e.obligationId] = add(s.reserved[e.obligationId], -amount);
          s[e.method] = add(s[e.method], -amount);
          s.paid[e.obligationId] = add(s.paid[e.obligationId], amount);
          s.obligationPaid = add(s.obligationPaid, amount);
          break;
        case 'account':
          if (!METHODS.has(e.from) || !METHODS.has(e.to) || e.from === e.to) fail('اختر حسابين مختلفين لنقل المال.');
          s[e.from] = add(s[e.from], -amount);
          s[e.to] = add(s[e.to], amount);
          break;
        case 'transfer':
          if (!own(s.wallets, e.from) || !own(s.wallets, e.to) || e.from === e.to) fail('اختر محفظتين مختلفتين للتحويل.');
          s.wallets[e.from] = add(s.wallets[e.from], -amount);
          s.wallets[e.to] = add(s.wallets[e.to], amount);
          break;
      }
      s.total = add(s.card, s.cash);
      let envelopes = s.unallocated;
      for (const n of Object.values(s.wallets)) envelopes = add(envelopes, n);
      for (const n of Object.values(s.reserved)) envelopes = add(envelopes, n);
      if (s.total !== envelopes) fail('دفتر الحسابات غير متوازن.');
    }
    return s;
  }
  function stats(state) { return replay(state); }
  function validate(state) { replay(state); return true; }
  function commit(state, event) {
    checkStructure(state);
    if (!record(event)) fail('حركة مالية غير صالحة.');
    date(event.date);
    S.guardReceipt(state, event);
    if (event.date < state.cycle.start) fail('لا يمكن إضافة حركة إلى دورة مؤرشفة؛ اختر تاريخاً ضمن الدورة الحالية.');
    const next = clone(state);
    const value = clone(event);
    if (!value.id) value.id = uid();
    next.transactions.push(value);
    validate(next);
    return next;
  }
  function remove(state, eventId) {
    checkStructure(state);
    if (state.history.some(h => h.transactionIds.includes(eventId))) fail('لا يمكن حذف حركة من دورة مؤرشفة حفاظاً على ثبات رصيد الإغلاق.');
    const next = clone(state);
    const index = next.transactions.findIndex(t => t.id === eventId);
    if (index < 0) fail('الحركة المطلوب حذفها غير موجودة.');
    next.transactions.splice(index, 1);
    validate(next);
    return next;
  }
  function distribute(amount, weights) {
    money(amount, true);
    let entries, arrayResult = false;
    if (Array.isArray(weights)) {
      arrayResult = weights.every(w => typeof w === 'number');
      entries = weights.map((w, index) => arrayResult ? [String(index), w] : [w.id, w.weight]);
    } else if (weights && typeof weights === 'object') entries = Object.entries(weights);
    else fail('أوزان التوزيع غير صالحة.');
    if (new Set(entries.map(([key]) => key)).size !== entries.length) fail('معرّفات التوزيع مكررة.');
    for (const [key, weight] of entries) {
      if (typeof key !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(key) || typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0 || weight > 1e9) fail('أوزان التوزيع غير صالحة.');
    }
    const sum = entries.reduce((total, [, weight]) => total + weight, 0);
    if (sum === 0 && amount !== 0) fail('اختر وزناً موجباً لمحفظة واحدة على الأقل.');
    // Largest remainder distribution preserves every minor unit, including uneven percentages.
    const parts = entries.map(([key, weight], index) => {
      const exact = sum ? amount * (weight / sum) : 0;
      return { key, index, value: Math.floor(exact), remainder: exact - Math.floor(exact) };
    });
    let remaining = amount - parts.reduce((total, p) => total + p.value, 0);
    const ranked = [...parts].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    if (remaining < 0 || remaining > parts.length) fail('تعذر توزيع المبلغ بدقة؛ خفّض المبلغ أو أوزان التوزيع.');
    for (let i = 0; i < remaining; i++) ranked[i].value += 1;
    return arrayResult ? parts.map(p => p.value) : Object.fromEntries(parts.map(p => [p.key, p.value]));
  }
  function startCycle(state, options) {
    validate(state);
    const { start, days, income, method = 'card', policy = 'same' } = options || {};
    date(start);
    if (start <= state.cycle.start) fail('تاريخ الدورة الجديدة يجب أن يلي بداية الدورة الحالية.');
    if (!Number.isInteger(days) || days < 1 || days > 366) fail('مدة الدورة يجب أن تكون بين يوم واحد و366 يوماً.');
    money(income, true);
    if (!METHODS.has(method) || !['same', 'reserve'].includes(policy)) fail('خيارات الدورة الجديدة غير صالحة.');
    if (state.transactions.some(t => t.date >= start)) fail('توجد حركات بتاريخ الدورة الجديدة أو بعده؛ راجعها قبل بدء الدورة.');
    let next = clone(state);
    const closing = stats(next);
    const currentEvents = next.transactions.filter(t => t.date >= next.cycle.start);
    next.history.push({
      id: next.cycle.id, start: next.cycle.start, days: next.cycle.days, closedAt: start,
      summary: clone(closing), transactionIds: currentEvents.map(t => t.id),
      cycleIncome: currentEvents.filter(t => t.type === 'income').reduce((n, t) => n + t.amount, 0),
      cycleExpenses: currentEvents.filter(t => t.type === 'expense' || t.type === 'pay').reduce((n, t) => n + t.amount, 0)
    });
    next.cycle = { id: uid(), start, days };
    if (policy === 'reserve') {
      const reserveWallet = next.wallets.find(w => w.kind === 'emergency');
      const spending = next.wallets.filter(w => w.kind === 'spend' && closing.wallets[w.id] > 0);
      if (spending.length && !reserveWallet) fail('أضف محفظة طوارئ لاستقبال الفائض المرحّل.');
      for (const w of spending) next = commit(next, { type: 'transfer', date: start, amount: closing.wallets[w.id], from: w.id, to: reserveWallet.id, note: 'ترحيل فائض الدورة السابقة إلى الطوارئ' });
    }
    if (income > 0) next = commit(next, { type: 'income', date: start, amount: income, method, note: 'الدخل المستلم للدورة الجديدة' });
    validate(next);
    return next;
  }
  return Object.freeze({ initial, stats, validate, commit, remove, distribute, startCycle, today, uid, validDate });
});
