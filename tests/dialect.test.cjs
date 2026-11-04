'use strict';
// Arabic (Iraqi) feedback copy: brief, accurate and separate from ledger logic.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const home = read('src/app/views/home.js');
const reports = read('src/app/views/reports.js');
const budget = read('src/app/views/budget.js');

test('approved short income-overrun message is used in dashboard and reports', () => {
  for (const view of [home, reports]) {
    assert.match(view, /صرفك زايد هالشهر!/);
    assert.doesNotMatch(view, /صرفت أكثر من دخلك/);
  }
});

test('no recorded income is not mislabeled as overspending income', () => {
  assert.match(home, /m\.income \? `<span>/);
  assert.match(reports, /!m\.income \? 'بعدك ما سجّلت دخل'/);
  assert.match(reports, /!m\.income \? 'muted'/);
});

test('budget-limit language stays distinct from income overrun', () => {
  assert.match(budget, /قربت توصل للسقف!/);
  assert.match(budget, /فاتك السقف!/);
  assert.doesNotMatch(budget, /صرفك زايد هالشهر!/);
});

test('no storage or calculation code is altered in this wording change', () => {
  assert.match(read('src/app/store.js'), /const KEY = 'weenrahat-v3'/);
  assert.match(read('sw.js'), /weenrahat-static-v3\.1\.0/);
});
