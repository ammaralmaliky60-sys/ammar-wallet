/* وين راحت؟ — migrate.js
 * Converts a version-2 ledger (envelope accounting) into the version-3 household ledger.
 * The input is never modified. The result is accepted only if every account balance equals the
 * cash/card balance of the original; otherwise an error is thrown and nothing should be saved.
 */
(function (root, factory) {
  'use strict';
  const node = typeof module === 'object' && module.exports;
  const F = node ? require('./format.js') : root.WRFormat;
  const L = node ? require('./ledger.js') : root.WRLedger;
  const api = factory(F, L);
  if (node) module.exports = api;
  if (root) root.WRMigrate = api;
})(typeof window !== 'undefined' ? window : globalThis, function (F, L) {
  'use strict';

  const OPENING_NOTE = /^رصيد البداية/;
  const BILLS = { id: 'bills', name: 'التزامات وأقساط', icon: 'receipt', color: '#5C6B73' };
  const OTHER = { id: 'other', name: 'أخرى', icon: 'dots', color: '#5C6B73' };
  const ICON_HINTS = [[/بقال|خضر|سوق|طعام|أكل/, 'cart'], [/منزل|بيت|سكن|إيجار/, 'home'], [/أطفال|عائل|مدرس|موسى/, 'kids'],
    [/شخص/, 'user'], [/طوارئ/, 'shield'], [/مطعم|مطاعم|قهوة|كافيه/, 'coffee'], [/نقل|مواصل|وقود|سيار/, 'car'],
    [/كهرب|ماء|إنترنت|فاتور|خدم/, 'bolt'], [/صح|دواء|طب/, 'health'], [/ملابس/, 'shirt'], [/هد[يا]/, 'gift'],
    [/ادخار|توفير/, 'wallet'], [/هاتف|اتصال/, 'phone'], [/تعليم|كتب/, 'book']];
  const guessIcon = name => (ICON_HINTS.find(([re]) => re.test(name)) || [null, 'dots'])[1];
  const validId = id => typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(id) && !['constructor', 'prototype', '__proto__'].includes(id);
  const hex = (c, i) => /^#[0-9A-Fa-f]{6}$/.test(c || '') ? c.toUpperCase() : L.COLORS[i % L.COLORS.length];
  const note = v => (typeof v === 'string' ? v.trim() : '').slice(0, 140);
  const isV2 = data => data && typeof data === 'object' && data.version === 2 && Array.isArray(data.transactions) && Array.isArray(data.wallets);

  /** Cash/card balances exactly as the version-2 engine computed them. */
  function v2Balances(v2) {
    const b = { card: 0, cash: 0 };
    for (const t of v2.transactions) {
      if (t.type === 'income') b[t.method] += t.amount;
      else if (t.type === 'expense' || t.type === 'pay') b[t.method] -= t.amount;
      else if (t.type === 'account') { b[t.from] -= t.amount; b[t.to] += t.amount; }
    }
    return b;
  }

  function fromV2(v2, { today = F.today() } = {}) {
    if (!isV2(v2)) throw new Error('هذا الملف ليس من الإصدار السابق للبرنامج.');
    const settings = v2.settings || {};
    const report = { transactions: 0, skipped: {}, opening: { cash: 0, card: 0 }, categories: 0, incomeSources: 0 };
    const skip = type => { report.skipped[type] = (report.skipped[type] || 0) + 1; };

    // Accounts: the two places money lived. Opening-balance "income" becomes the opening balance.
    for (const t of v2.transactions) if (t.type === 'income' && !t.sourceId && OPENING_NOTE.test(t.note || '')) report.opening[t.method] += t.amount;
    const accounts = [{ id: 'cash', name: 'النقد', opening: report.opening.cash, archived: false },
      { id: 'card', name: 'البطاقة', opening: report.opening.card, archived: false }];

    // Categories: spending wallets + living categories (same ids), keeping names and colours.
    const used = new Set(v2.transactions.filter(t => t.type === 'expense').map(t => t.walletId));
    // Without a saved list the old app used these living categories.
    const LIVING_DEFAULTS = [{ id: 'home', label: 'المنزل', kind: 'spend' }, { id: 'vegetables', label: 'الخضروات', kind: 'spend' },
      { id: 'kids', label: 'الأطفال', kind: 'spend' }, { id: 'personal', label: 'الشخصي', kind: 'spend' }, { id: 'emergency', label: 'الطوارئ', kind: 'emergency' }];
    const living = Array.isArray(settings.livingCategories) ? settings.livingCategories : LIVING_DEFAULTS;
    const hidden = Array.isArray(settings.livingHiddenCategories) ? settings.livingHiddenCategories : [];
    const targets = settings.livingTargets && typeof settings.livingTargets === 'object' ? settings.livingTargets : {};
    const latestMonth = Object.keys(targets).filter(k => /^\d{4}-\d{2}$/.test(k) && Object.values(targets[k] || {}).some(v => v > 0)).sort().pop();
    const budgetOf = id => { const v = latestMonth ? targets[latestMonth][id] : 0; return Number.isSafeInteger(v) && v > 0 ? v : 0; };
    const categories = [], byId = new Map();
    const addCategory = (id, name, color, archived) => {
      if (!validId(id) || byId.has(id)) return;
      const label = (typeof name === 'string' && name.trim() ? name.trim() : 'فئة محفوظة').slice(0, 40);
      const c = { id, name: label, icon: guessIcon(label), color: hex(color, categories.length), budget: budgetOf(id), archived };
      categories.push(c); byId.set(id, c);
    };
    // The emergency vault is not part of the new app: keep its category only if money was spent from it.
    for (const c of living) if (c.kind !== 'emergency' || used.has(c.id)) addCategory(c.id, c.label, c.color, false);
    for (const w of v2.wallets) if (w.kind === 'spend' || used.has(w.id)) addCategory(w.id, w.name, w.color, false);
    for (const c of hidden) if (used.has(c.id)) addCategory(c.id, c.label, c.color, true);
    if (v2.transactions.some(t => t.type === 'pay')) addCategory(BILLS.id, BILLS.name, BILLS.color, false);
    if (!byId.has(OTHER.id)) addCategory(OTHER.id, OTHER.name, OTHER.color, false);
    for (const c of categories) if (c.id === BILLS.id || c.id === OTHER.id) c.icon = c.id === BILLS.id ? BILLS.icon : OTHER.icon;

    // Income sources: the schedule's expected day, with the last received amount and account as defaults.
    const incomes = v2.transactions.filter(t => t.type === 'income' && t.sourceId);
    const lastOf = id => incomes.filter(t => t.sourceId === id).sort((a, b) => a.date.localeCompare(b.date)).pop();
    const sources = [], sourceIds = new Set();
    for (const s of Array.isArray(settings.incomeSources) ? settings.incomeSources : []) {
      if (!validId(s.id) || sourceIds.has(s.id)) continue;
      const last = lastOf(s.id);
      sources.push({ id: s.id, name: String(s.name || 'مصدر دخل').slice(0, 40), day: Math.min(31, Math.max(1, Number(s.fromDay) || 1)),
        amount: last ? last.amount : 0, accountId: last ? last.method : 'card', archived: false });
      sourceIds.add(s.id);
    }
    for (const t of incomes) if (validId(t.sourceId) && !sourceIds.has(t.sourceId)) {
      sources.push({ id: t.sourceId, name: String(t.sourceName || 'مصدر دخل سابق').slice(0, 40), day: 1, amount: 0, accountId: t.method, archived: true });
      sourceIds.add(t.sourceId);
    }

    // Transactions: only what moved money in or out of the cash and card accounts.
    const obligationName = id => (v2.obligations || []).find(o => o.id === id)?.name || 'التزام';
    const seen = new Set();
    const idFor = t => { const id = validId(t.id) && !seen.has(t.id) ? t.id : L.uid(); seen.add(id); return id; };
    const transactions = [];
    for (const t of v2.transactions) {
      if (t.type === 'income') {
        if (!t.sourceId && OPENING_NOTE.test(t.note || '')) { skip('opening'); continue; }
        transactions.push({ id: idFor(t), type: 'income', date: t.date, amount: t.amount, accountId: t.method,
          sourceId: validId(t.sourceId) ? t.sourceId : null, note: note(t.note) });
      } else if (t.type === 'expense') {
        const categoryId = byId.has(t.walletId) ? t.walletId : OTHER.id;
        transactions.push({ id: idFor(t), type: 'expense', date: t.date, amount: t.amount, accountId: t.method, categoryId, note: note(t.note) });
      } else if (t.type === 'pay') {
        const label = obligationName(t.obligationId), extra = note(t.note);
        transactions.push({ id: idFor(t), type: 'expense', date: t.date, amount: t.amount, accountId: t.method,
          categoryId: BILLS.id, note: note(extra && !extra.includes(label) ? `${label} · ${extra}` : label) });
      } else if (t.type === 'account') {
        transactions.push({ id: idFor(t), type: 'transfer', date: t.date, amount: t.amount, accountId: t.from, toAccountId: t.to, note: note(t.note) });
      } else skip(t.type);
    }

    const state = {
      version: L.VERSION,
      settings: { name: String(settings.name || '').slice(0, 40), currency: F.CURRENCIES[settings.currency] ? settings.currency : 'IQD',
        digits: settings.digits === 'ar' ? 'ar' : 'en', monthStartDay: 1 },
      accounts, categories, incomeSources: sources, transactions,
      meta: { createdAt: today, migratedFrom: { version: 2, at: today } }
    };
    L.validate(state);

    // Safety check: the money must be exactly where it was.
    const before = v2Balances(v2), after = L.balances(state).accounts;
    if (before.cash !== after.cash || before.card !== after.card) throw new Error('توقف النقل: الأرصدة بعد النقل لا تطابق الأرصدة الأصلية. بياناتك القديمة لم تتغير.');
    report.transactions = transactions.length; report.categories = categories.length; report.incomeSources = sources.length;
    report.balances = before;
    state.meta.migratedFrom.report = report;
    return { state, report };
  }

  return { fromV2, v2Balances, isV2 };
});
