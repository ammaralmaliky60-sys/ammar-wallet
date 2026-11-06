'use strict';
// Icon motion must remain presentation-only and compatible with the offline PWA.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const html = read('index.html');
const sw = read('sw.js');
const css = read('styles.css');
const motion = read('src/app/motion.js');
const main = read('src/app/main.js');
const home = read('src/app/views/home.js');

test('motion script loads after effects and before start, and is cached offline', () => {
  const effects = html.indexOf('src/app/effects.js?v=3.0.2');
  const animations = html.indexOf('src/app/motion.js?v=3.0.3');
  const start = html.indexOf('src/app/start.js?v=3.0.0');
  assert.ok(effects >= 0 && effects < animations && animations < start);
  assert.match(sw, /'\.\/src\/app\/motion\.js\?v=3\.0\.3'/);
  assert.match(sw, /weenrahat-static-v3\.1\.1/);
});

test('animated navigation retains its indicator between page renders', () => {
  assert.match(main, /querySelector\('\.liquid-indicator'\)/);
  assert.match(main, /syncTabIndicator/);
  assert.match(motion, /getBoundingClientRect/);
  assert.match(css, /\.tabbar>\.liquid-indicator/);
});

test('all eight motion styles are present and reduced motion is respected', () => {
  for (const feature of ['micro-spring', 'micro-draw', 'micro-rotate', 'micro-pulse',
    'micro-wiggle', 'micro-ring-fill', 'micro-plus-out', 'liquid-indicator'])
    assert.ok(css.includes(feature), feature);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(motion, /prefers-reduced-motion: reduce/);
});

test('budget progress keeps the original accessible meter', () => {
  assert.match(home, /WR\.progressRing\(usedPct\)/);
  assert.match(home, /role="progressbar"/);
  assert.match(motion, /aria-hidden="true"/);
});

test('microinteraction module cannot modify or migrate money records', () => {
  assert.doesNotMatch(motion, /localStorage|sessionStorage|WR\.store|WR\.app\.state|\.commit\(/);
  assert.match(read('src/app/store.js'), /const KEY = 'weenrahat-v3'/);
});
