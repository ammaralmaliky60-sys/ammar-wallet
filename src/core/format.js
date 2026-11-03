/* وين راحت؟ — format.js
 * Pure helpers: currencies, money parsing/formatting (integer minor units), ISO dates,
 * and the "financial month" that starts on a chosen day (1–28).
 * Works in the browser (window.WRFormat) and in Node (module.exports) for tests.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.WRFormat = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const CURRENCIES = Object.freeze({
    IQD: { label: 'دينار عراقي', unit: 'د.ع', dec: 0 },
    USD: { label: 'دولار أمريكي', unit: '$', dec: 2 },
    SAR: { label: 'ريال سعودي', unit: 'ر.س', dec: 2 },
    AED: { label: 'درهم إماراتي', unit: 'د.إ', dec: 2 },
    EUR: { label: 'يورو', unit: '€', dec: 2 }
  });
  const currency = code => CURRENCIES[code] || CURRENCIES.IQD;

  const ARABIC = '٠١٢٣٤٥٦٧٨٩', PERSIAN = '۰۱۲۳۴۵۶۷۸۹';
  function latinDigits(text) {
    return String(text)
      .replace(/[٠-٩]/g, c => String(ARABIC.indexOf(c)))
      .replace(/[۰-۹]/g, c => String(PERSIAN.indexOf(c)))
      .replace(/٫/g, '.').replace(/٬/g, ',');
  }

  /** "35,890" / "٣٥٨٩٠" / "12.5" -> integer minor units. Throws an Arabic message on bad input. */
  function parseAmount(text, dec = 0, { allowZero = false } = {}) {
    const clean = latinDigits(text).trim().replace(/\s/g, '');
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(clean)) throw new Error('أدخل مبلغاً صحيحاً، مثل 35,000 أو 35000.');
    const [whole, fraction = ''] = clean.replace(/,/g, '').split('.');
    if (fraction.length > dec) throw new Error(dec ? `العملة تقبل ${dec} منازل عشرية فقط.` : 'هذه العملة لا تقبل كسوراً.');
    const value = Number(BigInt(whole) * 10n ** BigInt(dec) + BigInt(fraction.padEnd(dec, '0') || '0'));
    if (!Number.isSafeInteger(value)) throw new Error('المبلغ أكبر من المسموح.');
    if (value === 0 && !allowZero) throw new Error('أدخل مبلغاً أكبر من صفر.');
    return value;
  }

  /** Integer minor units -> grouped text, without the unit ("1,250,000" or "١٬٢٥٠٬٠٠٠"). */
  function formatAmount(minor, dec = 0, digits = 'en') {
    const negative = minor < 0, abs = Math.abs(minor), base = 10 ** dec;
    const whole = Math.trunc(abs / base), frac = abs % base;
    const locale = digits === 'ar' ? 'ar-IQ' : 'en-US';
    let text = new Intl.NumberFormat(locale).format(whole);
    if (dec && frac) text += (digits === 'ar' ? '٫' : '.') + new Intl.NumberFormat(locale, { minimumIntegerDigits: dec, useGrouping: false }).format(frac).replace(/0+$/, '');
    return (negative ? '−' : '') + text;
  }
  /** Value suitable for an <input> (no grouping, Latin digits). */
  function amountInputValue(minor, dec = 0) {
    if (!minor) return '';
    const base = 10 ** dec, whole = Math.trunc(minor / base), frac = minor % base;
    return dec && frac ? `${whole}.${String(frac).padStart(dec, '0').replace(/0+$/, '')}` : String(whole);
  }

  // ---- dates (local calendar days as "YYYY-MM-DD") ----
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => iso(new Date());
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  function isDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    return iso(parse(value)) === value;
  }
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
  const monthLength = (y, m) => new Date(y, m, 0).getDate(); // m is 1-12

  // ---- financial month ----
  // A month is identified by the calendar month in which it starts ("2026-10" starts on Oct <startDay>).
  const clampDay = startDay => Math.min(28, Math.max(1, Math.trunc(Number(startDay) || 1)));
  function periodByKey(key, startDay = 1) {
    const sd = clampDay(startDay);
    const [y, m] = key.split('-').map(Number);
    const start = `${y}-${pad(m)}-${pad(sd)}`;
    const next = m === 12 ? `${y + 1}-01-${pad(sd)}` : `${y}-${pad(m + 1)}-${pad(sd)}`;
    const end = addDays(next, -1);
    return { key, start, end, days: daysBetween(start, end) + 1 };
  }
  function periodFor(date, startDay = 1) {
    const sd = clampDay(startDay);
    const [y, m, d] = date.split('-').map(Number);
    const key = d >= sd ? `${y}-${pad(m)}` : (m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`);
    return periodByKey(key, sd);
  }
  function shiftKey(key, delta) {
    const [y, m] = key.split('-').map(Number), total = y * 12 + (m - 1) + delta;
    return `${Math.floor(total / 12)}-${pad(total % 12 + 1)}`;
  }

  const AR_MONTHS = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
  const num = (n, digits) => digits === 'ar' ? new Intl.NumberFormat('ar-IQ', { useGrouping: false }).format(n) : String(n);
  /** "تشرين الثاني 2026" for calendar months, or "23 تشرين الأول – 22 تشرين الثاني" otherwise. */
  function periodLabel(key, startDay = 1, digits = 'en') {
    const p = periodByKey(key, startDay), [sy, sm, sd] = p.start.split('-').map(Number), [ey, em, ed] = p.end.split('-').map(Number);
    if (clampDay(startDay) === 1) return `${AR_MONTHS[sm - 1]} ${num(sy, digits)}`;
    const year = sy === ey ? '' : ` ${num(sy, digits)}`;
    return `${num(sd, digits)} ${AR_MONTHS[sm - 1]}${year} – ${num(ed, digits)} ${AR_MONTHS[em - 1]} ${num(ey, digits)}`;
  }
  /** Short title for a period: the month in which most of its days fall. */
  function periodTitle(key, startDay = 1, digits = 'en') {
    const p = periodByKey(key, startDay), mid = addDays(p.start, Math.floor(p.days / 2));
    const [y, m] = mid.split('-').map(Number);
    return `${AR_MONTHS[m - 1]} ${num(y, digits)}`;
  }
  function dateLabel(date, { long = false, digits = 'en', relativeTo } = {}) {
    if (relativeTo) {
      if (date === relativeTo) return 'اليوم';
      if (date === addDays(relativeTo, -1)) return 'أمس';
    }
    const [y, m, d] = date.split('-').map(Number);
    return `${num(d, digits)} ${AR_MONTHS[m - 1]}${long ? ' ' + num(y, digits) : ''}`;
  }

  return { CURRENCIES, currency, latinDigits, parseAmount, formatAmount, amountInputValue,
    today, isDate, addDays, daysBetween, monthLength, clampDay,
    periodByKey, periodFor, shiftKey, periodLabel, periodTitle, dateLabel, AR_MONTHS };
});
