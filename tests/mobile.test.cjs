'use strict';
// Static release guards. Full APK/AAB compilation is run on GitHub Actions.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const config = JSON.parse(read('mobile/capacitor.config.json'));
const pkg = JSON.parse(read('mobile/package.json'));

test('Android package identity and supported API 36 toolchain', () => {
  assert.match(config.appId, /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/);
  assert.equal(config.appName, 'وين راحت؟');
  assert.equal(config.webDir, 'www');
  for (const name of ['@capacitor/android', '@capacitor/core', '@capacitor/share', '@capacitor/filesystem']) {
    assert.match(pkg.dependencies[name], /^8\./);
  }
  const configNative = read('mobile/scripts/prepare-native.mjs');
  assert.match(configNative, /'targetSdkVersion', 36/);
  assert.match(configNative, /android:allowBackup="false"/);
});

test('privacy policy is public-ready HTML and linked from app', () => {
  const policy = read('privacy.html');
  assert.match(policy, /<html lang="ar" dir="rtl">/);
  assert.match(policy, /سياسة الخصوصية/);
  assert.match(read('src/app/views/settings.js'), /href="\.\/privacy.html"/);
});

test('native bridge preserves PWA and supports user-initiated exports', () => {
  assert.match(read('mobile/native-bridge.mjs'), /Share\.share/);
  assert.match(read('mobile/native-bridge.mjs'), /Directory\.Cache/);
  assert.match(read('src/app/ui.js'), /WRNative\?\.isNative/);
  assert.match(read('report-pdf.js'), /window\.WR\.downloadBlob/);
  assert.match(read('src/app/main.js'), /!window\.WRNative\?\.isNative/);
  const build = read('mobile/scripts/prepare-web.mjs');
  assert.match(build, /'privacy\.html'/);
  assert.match(build, /'native-bridge\.js'/);
  assert.doesNotMatch(build, /'tests'/);
});
