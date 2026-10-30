(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.IncomeSchedule = api;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DEFAULTS = Object.freeze([
    Object.freeze({ id: 'incentives', name: 'الحوافز الشهرية', fromDay: 10, toDay: 12 }),
    Object.freeze({ id: 'salary', name: 'الراتب الشهري', fromDay: 22, toDay: 24 })
  ]);
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const fail = message => { throw new Error(message); };
  function defaults() { return DEFAULTS.map(source => ({ ...source })); }
  function validPeriod(value) {
    return typeof value === 'string' && /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value);
  }
  function validDate(value) {
    if (typeof value !== 'string' || !/^(?!0000)\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(value)) return false;
    const d = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
  }
  function checkDate(value) {
    if (!validDate(value)) fail('التاريخ غير صالح لجدول الدخل.');
  }
  function validateSources(array) {
    if (!Array.isArray(array)) fail('جدول مصادر الدخل غير صالح.');
    const ids = new Set();
    for (const source of array) {
      if (!record(source) || typeof source.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/.test(source.id) || ['constructor', 'prototype', '__proto__'].includes(source.id)) fail('معرّف مصدر الدخل غير صالح.');
      if (ids.has(source.id)) fail('معرّفات مصادر الدخل مكررة.');
      ids.add(source.id);
      if (typeof source.name !== 'string' || !source.name.trim() || source.name.length > 100) fail('اسم مصدر الدخل غير صالح.');
      if (!Number.isInteger(source.fromDay) || !Number.isInteger(source.toDay) || source.fromDay < 1 || source.toDay > 31 || source.fromDay > source.toDay) fail('أيام الاستلام يجب أن تكون بين 1 و31 وبترتيب صحيح.');
    }
    return true;
  }
  function sources(state) {
    if (!record(state) || !record(state.settings)) fail('إعدادات جدول الدخل غير صالحة.');
    const list = own(state.settings, 'incomeSources') && state.settings.incomeSources !== undefined ? state.settings.incomeSources : defaults();
    validateSources(list);
    return list.map(({ id, name, fromDay, toDay }) => ({ id, name, fromDay, toDay }));
  }
  function period(date) { checkDate(date); return date.slice(0, 7); }
  function windowFor(source, monthPeriod) {
    validateSources([source]);
    if (!validPeriod(monthPeriod)) fail('اختر شهراً صحيحاً بصيغة سنة-شهر.');
    const d = new Date(`${monthPeriod}-01T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + 1);
    d.setUTCDate(0);
    const last = d.getUTCDate();
    const day = n => `${monthPeriod}-${String(Math.min(n, last)).padStart(2, '0')}`;
    return { start: day(source.fromDay), end: day(source.toDay), period: monthPeriod };
  }
  function receipts(state, sourceId, monthPeriod) {
    if (!record(state) || !Array.isArray(state.transactions)) fail('سجل الدخل غير صالح.');
    if (!validPeriod(monthPeriod)) fail('فترة استلام الدخل غير صالحة.');
    return state.transactions.filter(event => event && event.type === 'income' && event.sourceId === sourceId && event.incomePeriod === monthPeriod).map(event => ({ ...event }));
  }
  function entry(state, source, monthPeriod, asOf) {
    const range = windowFor(source, monthPeriod);
    const actual = receipts(state, source.id, monthPeriod);
    let receivedAmount = 0;
    for (const event of actual) {
      if (!Number.isSafeInteger(event.amount) || event.amount <= 0 || !Number.isSafeInteger(receivedAmount + event.amount)) fail('مبلغ الدخل المستلم غير صالح.');
      receivedAmount += event.amount;
    }
    return {
      ...source, ...range,
      status: actual.length ? 'received' : asOf < range.start ? 'upcoming' : asOf <= range.end ? 'due' : 'late',
      receivedAmount,
      receiptIds: actual.map(event => event.id)
    };
  }
  function month(state, asOf) {
    checkDate(asOf);
    const monthPeriod = period(asOf);
    return sources(state).map(source => entry(state, source, monthPeriod, asOf));
  }
  function nextPeriod(monthPeriod) {
    const year = Number(monthPeriod.slice(0, 4));
    const m = Number(monthPeriod.slice(5));
    const result = m === 12 ? `${String(year + 1).padStart(4, '0')}-01` : `${String(year).padStart(4, '0')}-${String(m + 1).padStart(2, '0')}`;
    if (!validPeriod(result)) fail('الشهر التالي يتجاوز نطاق التواريخ المسموح.');
    return result;
  }
  function next(state, asOf) {
    const current = month(state, asOf);
    if (!current.length) return null;
    const pending = current.filter(source => source.status !== 'received').sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
    if (pending.length) return pending[0];
    const monthPeriod = nextPeriod(period(asOf));
    const following = sources(state).map(source => entry(state, source, monthPeriod, asOf)).sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
    return following[0] || null;
  }
  function guardReceipt(state, event) {
    if (!record(event)) fail('حركة الدخل غير صالحة.');
    if (event.sourceId === undefined || event.sourceId === null || event.sourceId === '') {
      if (event.incomePeriod !== undefined && event.incomePeriod !== null && event.incomePeriod !== '') fail('اختر مصدر الدخل المرتبط بفترة الاستلام.');
      return true;
    }
    if (event.type !== 'income') fail('المصدر الشهري يرتبط بحركة دخل مستلم فقط.');
    if (!sources(state).some(source => source.id === event.sourceId)) fail('مصدر الدخل المختار غير موجود.');
    checkDate(event.date);
    const now = new Date();
    const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (event.date > localToday) fail('لا يمكن تأكيد دخل بتاريخ مستقبلي.');
    if (!validPeriod(event.incomePeriod) || event.incomePeriod > period(event.date)) fail('لا يمكن تأكيد استحقاق شهري من فترة مستقبلية.');
    if (receipts(state, event.sourceId, event.incomePeriod).length) fail('تم تسجيل استلام هذا المصدر لهذه الفترة بالفعل. سجّل أي مبلغ إضافي كدخل غير مرتبط.');
    return true;
  }
  return Object.freeze({ defaults, sources, validateSources, period, windowFor, receipts, month, next, guardReceipt });
});
