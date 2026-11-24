/*
 * دبّرها — Service Worker
 *
 * Strategy: network-first for the app's own static assets, falling back to the
 * offline cache. Financial data never passes through here; it lives only in
 * the browser's localStorage.
 *
 * IMPORTANT: every stylesheet/script URL in index.html (including its ?v=
 * query) must appear in ASSETS. tests/assets.test.cjs enforces this.
 * Bump the web release in src/app/version.js when publishing changes.
 */
'use strict';

importScripts('./src/app/version.js');
const CACHE = 'dabburha-static-' + self.WR.version;
// Older prefixes stay listed so their caches are removed after the update.
const CACHE_PREFIXES = ['mizan-static-', 'thukhr-static-', 'firza-static-', 'weenrahat-static-', 'dabburha-static-'];

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './dabburha-icon-maskable.svg',
  './apple-touch-icon.png',
  './icon-16.png',
  './icon-32.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',

  // Styles and self-hosted fonts
  './dabburha-tokens.css?v=0.047',
  './styles.css?v=3.0.3',
  './neo-finance.css?v=3.2.0',
  './ui-polish.css?v=3.2.10',
  './dabburha-theme.css?v=0.047',
  './fonts/dabburha/marhey-400-arabic.woff2',
  './fonts/dabburha/marhey-400-latin.woff2',
  './fonts/dabburha/rubik-400-arabic.woff2',
  './fonts/dabburha/rubik-400-latin.woff2',
  './fonts/dabburha/rubik-600-arabic.woff2',
  './fonts/dabburha/rubik-600-latin.woff2',
  './fonts/dabburha/rubik-800-arabic.woff2',
  './fonts/dabburha/rubik-800-latin.woff2',

  // Core (order mirrors index.html)
  './src/core/format.js?v=3.0.0',
  './src/core/ledger.js?v=3.2.4',
  './src/core/migrate.js?v=3.0.0',
  './report-pdf.js?v=3.2.4',

  // App
  './src/app/version.js',
  './src/app/icons.js?v=3.0.5',
  './src/app/ui.js?v=3.0.0',
  './src/app/store.js?v=3.2.0',
  './src/app/main.js?v=0.047',
  './src/app/views/entry.js?v=3.2.4',
  './src/app/views/home.js?v=3.2.6',
  './src/app/views/transactions.js?v=3.2.4',
  './src/app/views/budget.js?v=3.2.2',
  './src/app/views/reports.js?v=3.2.5',
  './src/app/views/settings.js?v=3.2.8',
  './src/app/views/onboarding.js?v=3.2.4',
  './src/app/effects.js?v=3.2.0',
  './src/app/motion.js?v=3.0.3',
  './src/app/start.js?v=3.0.0'
];

const isOwnCache = key => CACHE_PREFIXES.some(prefix => key.startsWith(prefix));
const assetPaths = () => new Set(ASSETS.map(p => new URL(p, self.registration.scope).pathname));

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS.map(path => new Request(path, { cache: 'reload' }))))
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
