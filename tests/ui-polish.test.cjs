'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('appearance polish loads last, and is available offline', () => {
  const html = read('index.html'), sw = read('sw.js');
  assert.ok(html.indexOf('neo-finance.css?v=3.0.4') < html.indexOf('ui-polish.css?v=3.1.3'));
  assert.match(sw, /\.\/ui-polish\.css\?v=3\.1\.3/);
  assert.match(sw, /weenrahat-static-v3\.1\.3/);
});

test('desktop filters and sidebar are responsive while mobile tabs remain untouched', () => {
  const css = read('ui-polish.css');
  assert.match(css, /@media \(min-width:900px\)/);
  assert.match(css, /grid-template-columns:17rem minmax\(0,1fr\)/);
  assert.match(css, /\.filters>\.scroll-chips\{grid-column:1 \/ -1/);
  assert.match(css, /@media \(min-width:1280px\)/);
  assert.doesNotMatch(css, /\.tabbar\s*\{\s*display:none/);
});

test('improved dark contrast, dates, placeholders and keyboard focus', () => {
  const css = read('ui-polish.css');
  assert.match(css, /--text-muted:#CBD5E1/);
  assert.match(css, /--border:#425877/);
  assert.match(css, /::placeholder/);
  assert.match(css, /input\[type="date"\]/);
  assert.match(css, /focus-visible/);
  assert.doesNotMatch(css, /localStorage|indexedDB|WRLedger|transactionsIn/);
});

test('page context is a breadcrumb, but page heading remains the only H1', () => {
  const html = read('index.html'), main = read('src/app/main.js');
  assert.match(main, /وين راحت؟ \/ /);
  assert.match(main, /<h1>\$\{title\}<\/h1>/);
  assert.match(html, /<span id="pageTitle" class="page-title"><\/span>/);
});

test('site-wide forced bold styling has been reverted', () => {
 const css = read('ui-polish.css');
 assert.doesNotMatch(css, /body,\s*body \*,\s*body input::placeholder/);
});
