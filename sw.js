/*
 * وين راحت؟ — Service Worker
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

const CACHE = 'weenrahat-static-v3.1.0';
// Older prefixes stay listed so their caches are removed after the update.
const CACHE_PREFIXES = ['mizan-static-', 'thukhr-static-', 'firza-static-', 'weenrahat-static-'];

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',

  // Styles and font
  './fonts.css?v=3.0.0',
  './styles.css?v=3.0.3',
  './neo-finance.css?v=3.0.4',
  './fonts/readex-pro/ReadexPro-arabic.woff2',
  './fonts/readex-pro/ReadexPro-latin.woff2',
  './fonts/readex-pro/ReadexPro-latin-ext.woff2',

  // Core (order mirrors index.html)
  './src/core/format.js?v=3.0.0',
  './src/core/ledger.js?v=3.0.0',
  './src/core/migrate.js?v=3.0.0',
  './report-pdf.js?v=3.1.0',

  // App
  './src/app/icons.js?v=3.0.4',
  './src/app/ui.js?v=3.0.0',
  './src/app/store.js?v=3.0.0',
  './src/app/main.js?v=3.0.4',
  './src/app/views/entry.js?v=3.0.0',
  './src/app/views/home.js?v=3.0.4',
  './src/app/views/transactions.js?v=3.0.0',
  './src/app/views/budget.js?v=3.0.4',
  './src/app/views/reports.js?v=3.1.0',
  './src/app/views/settings.js?v=3.0.0',
  './src/app/views/onboarding.js?v=3.0.0',
  './src/app/effects.js?v=3.0.2',
  './src/app/motion.js?v=3.0.3',
  './src/app/start.js?v=3.0.0'
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
