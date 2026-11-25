'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('appearance polish loads last, and is available offline', () => {
  const html = read('index.html'), sw = read('sw.js');
  const asset = html.match(/href="(\.\/ui-polish\.css[^"]*)"/);
  assert.ok(asset && html.indexOf('./neo-finance.css?') < asset.index);
  assert.ok(sw.includes("'" + asset[1] + "'"));
});

test('desktop has a sidebar and mobile has floating tabs with a safe-area inset', () => {
  const css = read('ui-polish.css');
  assert.match(css, /@media \(min-width: 900px\)/);
  assert.match(css, /\.shell \{ grid-template-columns: 232px minmax\(0, 1fr\)/);
  assert.match(css, /\.filters > \.scroll-chips \{ grid-column: 1 \/ -1/);
  assert.match(css, /@media \(max-width: 899px\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.tabbar > \.liquid-indicator/);
});

test('dates, placeholders, focus and selected controls use theme tokens', () => {
  const css = read('ui-polish.css');
  assert.match(css, /::placeholder \{ color: var\(--text-muted\)/);
  assert.match(css, /input\[type="date"\]/);
  assert.match(css, /focus-visible/);
  assert.match(css, /background: var\(--selected\)/);
  assert.match(css, /prefers-reduced-motion: no-preference/);
  assert.doesNotMatch(css, /localStorage|indexedDB|WRLedger|transactionsIn/);
});

test('page context is a breadcrumb, but page heading remains the only H1', () => {
  const html = read('index.html'), main = read('src/app/main.js');
  assert.match(main, /دبّرها \/ /);
  assert.match(main, /<h1>\$\{title\}<\/h1>/);
  assert.match(html, /<span id="pageTitle" class="page-title"><\/span>/);
});

test('site-wide forced bold styling has been reverted', () => {
 const css = read('ui-polish.css');
 assert.doesNotMatch(css, /body,\s*body \*,\s*body input::placeholder/);
});

test('every element suppresses the native blue tap flash, site-wide', () => {
  const html = read('index.html'), sw = read('sw.js'), css = read('touch.css');
  const links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m => m[1]);
  assert.match(links.at(-1), /^\.\/touch\.css\?/, 'touch.css must load last so nothing overrides it');
  assert.ok(sw.includes("'" + links.at(-1) + "'"), 'touch.css must be cached offline');
  assert.match(css, /html, \*, \*::before, \*::after \{ -webkit-tap-highlight-color: transparent; \}/);
  assert.match(css, /:where\(input, textarea[^)]*\) \{[^}]*user-select: text/s, 'typed text must stay selectable');
  assert.match(css, /:focus:not\(:focus-visible\)/);
});

test('report controls suppress the native blue tap flash and keep keyboard focus visible', () => {
 const css = read('ui-polish.css');
 assert.match(css, /body\[data-page="reports"\][^{]+\{[^}]*-webkit-tap-highlight-color: transparent/s);
 assert.match(css, /:focus-visible/);
});
