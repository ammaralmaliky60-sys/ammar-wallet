/* وين راحت؟ — ledger.js
 * The household ledger (data version 3): accounts, categories with monthly budgets,
 * income sources with an expected day, and three transaction types (expense, income, transfer).
 * Pure functions: every mutation validates and returns a new state; nothing touches storage.
 */
(function (root, factory) {
  'use strict';
  const F = typeof module === 'object' && module.exports ? require('./format.js') : root.WRFormat;
  const api = factory(F);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.WRLedger = api;
})(typeof window !== 'undefined' ? window : globalThis, function (F) {
  'use strict';

  const VERSION = 3;
  const TYPES = ['expense', 'income', 'transfer'];
  const COLORS = ['#0F5E56', '#E0674B', '#D9A441', '#3B7EA1', '#8E6BB8', '#4F9D69', '#C97B2A', '#B4547A', '#5C6B73', '#2E9C9A'];
  const DEFAULT_CATEGORIES = [
    ['groceries', 'بقالة وسوق', 'cart'], ['dining', 'مطاعم وقهوة', 'coffee'], ['transport', 'مواصلات ووقود', 'car'],
    ['utilities', 'فواتير وخدمات', 'bolt'], ['housing', 'سكن وإيجار', 'home'], ['kids', 'أطفال ومدرسة', 'kids'],
    ['health', 'صحة ودواء', 'health'], ['clothes', 'ملابس', 'shirt'], ['fun', 'ترفيه وطلعات', 'spark'],
    ['gifts', 'هدايا ومناسبات', 'gift'], ['other', 'أخرى', 'dots']
  ].map(([id, name, icon], i) => ({ id, name, icon, color: COLORS[i % COLORS.length], budget: 0, archived: false }));
  const DEFAULT_ACCOUNTS = [{ id: 'cash', name: 'النقد', opening: 0, archived: false }, { id: 'card', name: 'البطاقة', opening: 0, archived: false }];
  const ICONS = ['cart', 'coffee', 'car', 'bolt', 'home', 'kids', 'health', 'shirt', 'spark', 'gift', 'dots', 'receipt', 'user', 'shield', 'book', 'phone', 'wallet'];

  const clone = v => JSON.parse(JSON.stringify(v));
  const fail = message => { throw new Error(message); };
  const record = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  function uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '').slice(0, 20);
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
  const validId = v => typeof v === 'string' && ID.test(v) && !['constructor', 'prototype', '__proto__'].includes(v);
  const text = (v, max) => typeof v === 'string' && v.length <= max;
  const name = (v, max = 40) => text(v, max) && v.trim().length > 0;
  const money = (v, { zero = false, negative = false } = {}) => Number.isSafeInteger(v) && (negative || v >= (zero ? 0 : 1));
  const unifiedWallet = state => state.settings.accountMode !== 'split';

  function createState({ name: owner = '', currency = 'IQD', digits = 'en', monthStartDay = 1, accounts, categories, incomeSources } = {}) {
    return {
      version: VERSION,
      settings: { name: owner, currency, digits, monthStartDay: F.clampDay(monthStartDay) },
      accounts: clone(accounts || DEFAULT_ACCOUNTS),
      categories: clone(categories || DEFAULT_CATEGORIES),
      incomeSources: clone(incomeSources || []),
      transactions: [],
      meta: { createdAt: F.today() }
    };
  }

  // ---------------------------------------------------------------- validation
  function validate(state) {
    if (!record(state) || state.version !== VERSION) fail('ملف البيانات ليس من الإصدار الحالي.');
    const s = state.settings;
    if (!record(s) || !text(s.name, 40) || !F.CURRENCIES[s.currency] || !['en', 'ar'].includes(s.digits) ||
      !Number.isInteger(s.monthStartDay) || s.monthStartDay < 1 || s.monthStartDay > 28) fail('إعدادات غير صالحة.');
    if (s.accountMode !== undefined && !['unified', 'split'].includes(s.accountMode)) fail('طريقة عرض الرصيد غير صالحة.');
    for (const key of ['accounts', 'categories', 'incomeSources', 'transactions']) if (!Array.isArray(state[key])) fail('بنية البيانات غير مكتملة.');
    const unique = (list, label) => {
      const ids = new Set();
      for (const item of list) {
        if (!record(item) || !validId(item.id) || ids.has(item.id)) fail(`معرّف ${label} غير صالح أو مكرر.`);
        ids.add(item.id);
      }
      return ids;
    };
    const accounts = unique(state.accounts, 'الحساب'), categories = unique(state.categories, 'الفئة'), sources = unique(state.incomeSources, 'مصدر الدخل');
    const reserves = state.accounts.filter(a => a.reserveTarget !== undefined);
    if (!state.accounts.some(a => !a.archived && a.reserveTarget === undefined)) fail('يجب أن يبقى حساب عادي واحد على الأقل.');
    for (const a of state.accounts) {
      if (!name(a.name) || !money(a.opening, { negative: true }) || typeof a.archived !== 'boolean') fail('بيانات حساب غير صالحة.');
      if (a.reserveTarget !== undefined && !money(a.reserveTarget, { zero: true })) fail('الهدف الشهري غير صالح.');
    }
    const wallet = state.accounts.filter(a => a.pooled === true);
    if (wallet.length > 1 || wallet.some(a => a.archived || a.reserveTarget !== undefined)) fail('حساب فلوسي غير صالح.');
    for (const c of state.categories) {
      if (!name(c.name) || !ICONS.includes(c.icon) || !/^#[0-9A-Fa-f]{6}$/.test(c.color) || !money(c.budget, { zero: true }) || typeof c.archived !== 'boolean') fail(`بيانات الفئة «${c.name || c.id}» غير صالحة.`);
    }
    for (const src of state.incomeSources) {
      if (!name(src.name) || (src.day !== null && (!Number.isInteger(src.day) || src.day < 1 || src.day > 31)) || !money(src.amount, { zero: true }) ||
        !accounts.has(src.accountId) || typeof src.archived !== 'boolean') fail(`بيانات مصدر الدخل «${src.name || src.id}» غير صالحة.`);
    }
    const txIds = new Set();
    for (const t of state.transactions) {
      if (!record(t) || !validId(t.id) || txIds.has(t.id)) fail('معرّف حركة غير صالح أو مكرر.');
      txIds.add(t.id);
      if (!TYPES.includes(t.type) || !F.isDate(t.date) || !money(t.amount) || !accounts.has(t.accountId) || !text(t.note || '', 140)) fail('حركة غير صالحة.');
      if (t.type === 'expense' && !categories.has(t.categoryId)) fail('فئة المصروف غير موجودة.');
      if (t.type === 'income' && t.sourceId != null && !sources.has(t.sourceId)) fail('مصدر الدخل غير موجود.');
      if (t.type === 'transfer' && (!accounts.has(t.toAccountId) || t.toAccountId === t.accountId)) fail('التحويل يحتاج حسابين مختلفين.');
    }
    if (reserves.length) {
      const held = balances(state).accounts;
      for (const reserve of reserves) {
        if (held[reserve.id] < 0) fail(`المبلغ أكبر من الرصيد المعزول في «${reserve.name}».`);
        if (reserve.archived && held[reserve.id]) fail(`رجّع أو سدّد الرصيد المعزول في «${reserve.name}» قبل الأرشفة.`);
      }
    }
    return true;
  }

  // ---------------------------------------------------------------- mutations
  function normaliseTx(tx) {
    const base = { id: tx.id || uid(), type: tx.type, date: tx.date, amount: tx.amount, accountId: tx.accountId, note: (tx.note || '').trim() };
    if (tx.type === 'expense') base.categoryId = tx.categoryId;
    if (tx.type === 'income') base.sourceId = tx.sourceId || null;
    if (tx.type === 'transfer') base.toAccountId = tx.toAccountId;
    return base;
  }
  function withChange(state, change) {
    const next = clone(state);
    change(next);
    validate(next);
    return next;
  }
  function addTransaction(state, tx, { today = F.today() } = {}) {
    if (tx.date > today) fail('لا يمكن تسجيل حركة بتاريخ في المستقبل.');
    const entry = normaliseTx(tx);
    return { state: withChange(state, s => { s.transactions.push(entry); }), transaction: entry };
  }
  function updateTransaction(state, id, changes, { today = F.today() } = {}) {
    const index = state.transactions.findIndex(t => t.id === id);
    if (index < 0) fail('الحركة غير موجودة.');
    const merged = normaliseTx({ ...state.transactions[index], ...changes, id });
    if (merged.date > today) fail('لا يمكن تسجيل حركة بتاريخ في المستقبل.');
    return withChange(state, s => { s.transactions[index] = merged; });
  }
  function removeTransaction(state, id) {
    if (!state.transactions.some(t => t.id === id)) fail('الحركة غير موجودة.');
    return withChange(state, s => { s.transactions = s.transactions.filter(t => t.id !== id); });
  }
  function upsert(listKey, label) {
    return (state, item) => withChange(state, s => {
      const list = s[listKey], index = list.findIndex(x => x.id === item.id);
      if (index >= 0) list[index] = { ...list[index], ...item };
      else list.push({ archived: false, ...item, id: item.id || uid() });
    });
  }
  const saveCategory = upsert('categories', 'الفئة');
  const saveAccount = upsert('accounts', 'الحساب');
  const saveIncomeSource = upsert('incomeSources', 'مصدر الدخل');
  function ensureWallet(state, opening = 0) {
    const account = state.accounts.find(a => a.pooled === true);
    if (account) return { state, accountId: account.id };
    const accountId = uid();
    return { state: saveAccount(state, { id: accountId, name: 'فلوسي', opening, pooled: true }), accountId };
  }
  function removeCategory(state, id) {
    // Used categories are archived so their history keeps its label; unused ones are deleted.
    if (state.transactions.some(t => t.categoryId === id)) return withChange(state, s => { s.categories.find(c => c.id === id).archived = true; });
    return withChange(state, s => { s.categories = s.categories.filter(c => c.id !== id); });
  }
  function removeIncomeSource(state, id) {
    if (state.transactions.some(t => t.sourceId === id)) return withChange(state, s => { s.incomeSources.find(x => x.id === id).archived = true; });
    return withChange(state, s => { s.incomeSources = s.incomeSources.filter(x => x.id !== id); });
  }
  function removeAccount(state, id) {
    const account = state.accounts.find(a => a.id === id);
    if (account?.pooled === true) fail('حساب فلوسي مطلوب للحركات بدون طريقة دفع.');
    if (account?.reserveTarget !== undefined && balances(state).accounts[id]) {
      fail(`رجّع أو سدّد الرصيد المعزول في «${account.name}» قبل الأرشفة.`);
    }
    const used = state.transactions.some(t => t.accountId === id || t.toAccountId === id) || state.incomeSources.some(x => x.accountId === id && !x.archived);
    if (used) return withChange(state, s => { s.accounts.find(a => a.id === id).archived = true; });
    return withChange(state, s => { s.accounts = s.accounts.filter(a => a.id !== id); });
  }
  const updateSettings = (state, settings) => withChange(state, s => { s.settings = { ...s.settings, ...settings, monthStartDay: F.clampDay(settings.monthStartDay ?? s.settings.monthStartDay) }; });

  // ---------------------------------------------------------------- queries
  function balances(state, asOf) {
    const accounts = Object.fromEntries(state.accounts.map(a => [a.id, a.opening]));
    for (const t of state.transactions) {
      if (asOf && t.date > asOf) continue;
      if (t.type === 'income') accounts[t.accountId] += t.amount;
      else if (t.type === 'expense') accounts[t.accountId] -= t.amount;
      else { accounts[t.accountId] -= t.amount; accounts[t.toAccountId] += t.amount; }
    }
    return { accounts, total: Object.values(accounts).reduce((n, v) => n + v, 0) };
  }
  function walletTotals(state, totals = balances(state)) {
    const reserved = state.accounts.filter(a => a.reserveTarget !== undefined)
      .reduce((sum, a) => sum + totals.accounts[a.id], 0);
    return { total: totals.total, reserved, available: totals.total - reserved };
  }

  function moveReserve(state, id, mode, amount, { accountId, today = F.today() } = {}) {
    const reserve = state.accounts.find(a => a.id === id && !a.archived && a.reserveTarget !== undefined);
    if (!reserve) fail('هذا المبلغ المعزول غير متاح.');
    if (!money(amount)) fail('اكتب مبلغاً أكبر من صفر.');
    const totals = balances(state);
    if (mode === 'pay') {
      let category = state.categories.find(c => !c.archived && c.name === reserve.name);
      if (!category) {
        category = { id: uid(), name: reserve.name, budget: 0, icon: 'wallet', color: COLORS[state.categories.length % COLORS.length] };
        state = saveCategory(state, category);
      }
      return addTransaction(state, { type: 'expense', date: today, amount, accountId: id, categoryId: category.id }, { today }).state;
    }
    if (!['fund', 'withdraw'].includes(mode)) fail('عملية العزل غير صالحة.');
    const unified = unifiedWallet(state);
    if (unified) ({ state, accountId } = ensureWallet(state));
    else if (!state.accounts.some(a => a.id === accountId && !a.archived && a.reserveTarget === undefined)) fail('اختر الحساب.');
    const available = unified ? walletTotals(state, totals).available : totals.accounts[accountId];
    if (mode === 'fund' && amount > available) fail('المبلغ أكبر من المتاح للصرف.');
    const from = mode === 'fund' ? accountId : id;
    const to = mode === 'fund' ? id : accountId;
    return addTransaction(state, { type: 'transfer', date: today, amount, accountId: from, toAccountId: to }, { today }).state;
  }
  const startDay = state => state.settings.monthStartDay;
  const currentKey = (state, today = F.today()) => F.periodFor(today, startDay(state)).key;
  const inPeriod = (t, p) => t.date >= p.start && t.date <= p.end;
  /** Recorded order, newest first: by date, then by insertion. */
  function sortNewest(list) {
    return list.map((t, i) => [t, i]).sort((a, b) => b[0].date.localeCompare(a[0].date) || b[1] - a[1]).map(x => x[0]);
  }
  function transactionsIn(state, key) {
    const p = F.periodByKey(key, startDay(state));
    return state.transactions.filter(t => inPeriod(t, p));
  }
  function reserves(state, key) {
    const active = state.accounts.filter(a => !a.archived && a.reserveTarget !== undefined);
    if (!active.length) return [];
    const held = balances(state).accounts;
    const paid = new Map();
    for (const t of transactionsIn(state, key)) {
      if (t.type === 'expense') paid.set(t.accountId, (paid.get(t.accountId) || 0) + t.amount);
    }
    return active.map(account => {
      const balance = held[account.id], paidThisMonth = paid.get(account.id) || 0;
      return { account, balance, paidThisMonth, needed: Math.max(0, account.reserveTarget - paidThisMonth - balance) };
    });
  }
  function budgetLevel(spent, budget) {
    if (!budget) return spent ? 'unplanned' : 'empty';
    if (spent > budget) return 'over';
    return spent / budget >= 0.8 ? 'warn' : 'ok';
  }
  function monthSummary(state, key, { today = F.today() } = {}) {
    const period = F.periodByKey(key, startDay(state)), list = transactionsIn(state, key);
    const sum = type => list.filter(t => t.type === type).reduce((n, t) => n + t.amount, 0);
    const income = sum('income'), expense = sum('expense');
    const spentBy = new Map();
    for (const t of list) if (t.type === 'expense') spentBy.set(t.categoryId, (spentBy.get(t.categoryId) || 0) + t.amount);
    const categories = state.categories
      .filter(c => !c.archived || spentBy.has(c.id))
      .map(c => {
        const spent = spentBy.get(c.id) || 0;
        return { id: c.id, name: c.name, icon: c.icon, color: c.color, archived: c.archived, budget: c.budget, spent,
          remaining: c.budget - spent, share: expense ? spent / expense : 0, level: budgetLevel(spent, c.budget) };
      });
    const budgetTotal = categories.reduce((n, c) => n + c.budget, 0);
    const budgetedSpent = categories.filter(c => c.budget).reduce((n, c) => n + c.spent, 0);
    // Pace: share of the month elapsed vs share of the total budget spent, and a daily allowance for the rest.
    const elapsedDays = today < period.start ? 0 : today > period.end ? period.days : F.daysBetween(period.start, today) + 1;
    const daysLeft = Math.max(1, period.days - elapsedDays + (today >= period.start && today <= period.end ? 1 : 0));
    const remainingBudget = Math.max(0, budgetTotal - budgetedSpent);
    return {
      period, income, expense, net: income - expense, count: list.length,
      categories, ranked: categories.filter(c => c.spent).sort((a, b) => b.spent - a.spent),
      budgetTotal, budgetedSpent, remainingBudget,
      pace: { elapsed: Math.round(elapsedDays / period.days * 100), used: budgetTotal ? Math.round(budgetedSpent / budgetTotal * 100) : 0,
        daysLeft, daily: Math.floor(remainingBudget / daysLeft),
        status: !budgetTotal ? 'none' : budgetedSpent > budgetTotal ? 'over' : (budgetedSpent / budgetTotal * 100) > (elapsedDays / period.days * 100) + 10 ? 'fast' : 'ok' }
    };
  }
  /** Expected income for the month: each active source on its day, and whether it has been recorded. */
  function incomeStatus(state, key, { today = F.today() } = {}) {
    const period = F.periodByKey(key, startDay(state)), list = transactionsIn(state, key);
    return state.incomeSources.filter(s => !s.archived && s.day !== null).map(source => {
      // The source's day inside this period (a day before the start day falls in the next calendar month).
      const [y, m] = period.start.split('-').map(Number), startD = Number(period.start.slice(8));
      let year = y, month = m;
      if (source.day < startD) { month += 1; if (month > 12) { month = 1; year += 1; } }
      const day = Math.min(source.day, F.monthLength(year, month));
      const expected = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const received = list.filter(t => t.type === 'income' && t.sourceId === source.id);
      const amount = received.reduce((n, t) => n + t.amount, 0);
      const status = received.length ? 'received' : today > expected ? 'late' : today === expected ? 'due' : 'upcoming';
      return { source, expected, received, amount, status };
    });
  }
  function incomeBySource(state, key) {
    const names = new Map(state.incomeSources.map(s => [s.id, s.name]));
    const amounts = new Map();
    for (const t of transactionsIn(state, key)) {
      if (t.type !== 'income') continue;
      const name = names.get(t.sourceId) || 'دخل آخر';
      amounts.set(name, (amounts.get(name) || 0) + t.amount);
    }
    return [...amounts].sort((a, b) => b[1] - a[1]).map(([name, amount]) => ({ name, amount }));
  }
  function trend(state, key, months = 6) {
    const out = [];
    for (let i = months - 1; i >= 0; i--) {
      const k = F.shiftKey(key, -i), list = transactionsIn(state, k);
      out.push({ key: k, income: list.filter(t => t.type === 'income').reduce((n, t) => n + t.amount, 0),
        expense: list.filter(t => t.type === 'expense').reduce((n, t) => n + t.amount, 0) });
    }
    return out;
  }
  function dailyExpense(state, key) {
    const p = F.periodByKey(key, startDay(state)), days = [];
    for (let i = 0; i < p.days; i++) days.push({ date: F.addDays(p.start, i), amount: 0 });
    for (const t of transactionsIn(state, key)) if (t.type === 'expense') days[F.daysBetween(p.start, t.date)].amount += t.amount;
    return days;
  }
  /** Category changes against the previous month (only categories with spending in either month). */
  function compare(state, key) {
    const now = monthSummary(state, key), before = monthSummary(state, F.shiftKey(key, -1));
    const prev = new Map(before.categories.map(c => [c.id, c.spent]));
    return now.categories.map(c => ({ ...c, previous: prev.get(c.id) || 0, delta: c.spent - (prev.get(c.id) || 0) }))
      .filter(c => c.spent || c.previous).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }

  return { VERSION, TYPES, COLORS, ICONS, DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS, uid, clone, createState, validate,
    addTransaction, updateTransaction, removeTransaction, saveCategory, saveAccount, saveIncomeSource,
    removeCategory, removeIncomeSource, removeAccount, updateSettings,
    unifiedWallet, ensureWallet, walletTotals, moveReserve, balances, currentKey, transactionsIn, reserves, sortNewest,
    monthSummary, incomeStatus, incomeBySource, trend, dailyExpense, compare, budgetLevel };
});
