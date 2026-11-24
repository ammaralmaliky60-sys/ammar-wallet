'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('home renders compact month and available balance before the monthly spend hero', () => {
  const WR = {
    app: { state: { settings: { name: 'مستخدم', digits: 'en' }, accounts: [], transactions: [] }, monthKey: '2026-11',
      today: () => '2026-11-24', currentKey: () => '2026-11' },
    views: {}, actions: {}, icon: () => '', safe: value => String(value), money: value => String(value),
    moneyText: value => String(value), pageHead: title => `<header>${title}</header>`, monthBar: () => '<div class="monthbar">الشهر</div>',
    progressRing: () => '', categoryBars: () => '', empty: (icon, title) => `<div>${title}</div>`, txRow: () => '',
  };
  const L = {
    monthSummary: () => ({ expense: 24000, income: 0, net: -24000, budgetTotal: 0, ranked: [] }),
    balances: () => ({ total: 100000, accounts: {} }), sortNewest: rows => rows,
    transactionsIn: () => [], incomeStatus: () => [], additionalIncome: () => ({ total: 0, groups: [] }),
    unifiedWallet: () => true, walletTotals: () => ({ available: 76000, reserved: 24000 }),
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/app/views/home.js'), 'utf8'), {
    window: { WR, WRLedger: L, WRFormat: { dateLabel: () => '' } }, Date, Math,
  });
  const markup = WR.views.home.render(WR.app);
  const location = needle => markup.indexOf(needle);
  assert.ok(location('home-greeting') < location('home-overview'));
  assert.ok(location('monthbar') < location('فلوسي المتاحة'));
  assert.ok(location('فلوسي المتاحة') < location('صرفت هذا الشهر'));
  assert.ok(location('صرفت هذا الشهر') < location('الدخل الإضافي'));
  assert.ok(location('الدخل الإضافي') < location('آخر الحركات'));
  assert.ok(location('آخر الحركات') < location('وين راحت فلوسك؟'));
  assert.match(markup, /تفاصيل الحسابات/);
  assert.doesNotMatch(markup, /class="balance total/);
});

test('home summary sizing adapts to narrow screens and preserves keyboard/accessibility styling', () => {
  const css = fs.readFileSync(path.join(__dirname, '../ui-polish.css'), 'utf8');
  assert.match(css, /\.home-overview\s*\{[\s\S]*?grid-template-columns/);
  assert.match(css, /\.available-strip\s*>\s*strong[\s\S]*?overflow-wrap:\s*anywhere/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.hero-amount\s*\{[\s\S]*?font-size:\s*clamp\(40px/);
});
