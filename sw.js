/*
 * فِرزة — Service Worker
 *
 * Strategy: network-first for the app's own static assets, falling back to the
 * offline cache. Financial data never passes through here; it lives only in
 * the browser's localStorage.
 *
 * IMPORTANT: every stylesheet/script URL in index.html (including its ?v=
 * query) must appear in ASSETS. tests/assets.test.cjs enforces this.
 * Bump CACHE whenever ASSETS changes.
 */
'use strict';

const CACHE = 'firza-static-v1.1.0-20261102';
const CACHE_PREFIXES = ['mizan-static-', 'thukhr-static-', 'firza-static-'];

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './apple-touch-icon.png',
  './firza-192.png',
  './firza-512.png',

  // Scripts
  './schedule.js',
  './engine.js?v=thukhr-finance-20261031-zero-defaults-r1',
  './migration.js',
  './thukhr-family.js?v=thukhr-finance-20261031-r1',
  './report-pdf.js?v=thukhr-finance-20261031-r2',
  './app.js?v=20261102-audit-r1',

  // Stylesheets
  './style.css?v=gold-20261031-r2',
  './fonts.css?v=money-groups-20261031-r1',
  './modern-ui.css?v=20261031-v3',
  './overview-motion.css?v=20261031-r1',
  './mizan-neo.css?v=20261031-r1',
  './mizan-neo-compact.css?v=20261031-r1',
  './two-stage.css?v=monthly-items-20261031-r1',
  './thukhr-themes.css?v=thukhr-20261031-r1',
  './quick-expense.css?v=20261031-multi-r1',
  './emergency-vault.css?v=20261031-r1',
  './thukhr-design-system.css?v=20261031-reset-r1',
  './firza-identity.css?v=20261031-firza-r1',
  './firza-dashboard.css?v=20261031-firza-dashboard-r3',
  './firza-lite.css?v=20261031-lite-r1',

  // Fonts
  './arabic-regular.ttf',
  './arabic-bold.ttf',
  './fonts/Alexandria%5Bwght%5D.ttf',
  './fonts/IBMPlexSansArabic-Regular.ttf',
  './fonts/IBMPlexSansArabic-Medium.ttf',
  './fonts/IBMPlexSansArabic-Bold.ttf'
];

const isOwnCache = key => CACHE_PREFIXES.some(prefix => key.startsWith(prefix));
const assetPaths = () => new Set(ASSETS.map(p => new URL(p, self.registration.scope).pathname));

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => isOwnCache(k) && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok && assetPaths().has(url.pathname)) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
        }
        return response;
      })
      .catch(() => caches.match(request).then(cached => {
        if (cached) return cached;
        if (request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      }))
  );
});
