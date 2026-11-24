'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const backup = read('android/app/src/main/java/com/ammaralmaliky/wainrahat/BackupControls.kt');
const activity = read('android/app/src/main/java/com/ammaralmaliky/wainrahat/MainActivity.kt');
const settings = read('src/app/views/settings.js');
const onboarding = read('src/app/views/onboarding.js');
const mainActivity = read('android/app/src/main/java/com/ammaralmaliky/wainrahat/MainActivity.kt');
const html = read('index.html');
const polish = read('ui-polish.css');

test('WebView file inputs route to the Android SAF picker on the app origin', () => {
  assert.match(activity, /onShowFileChooser/);
  assert.match(activity, /backup\.handleWebFileChooser/);
  assert.match(backup, /ActivityResultContracts\.OpenDocument/);
  assert.match(backup, /params\.isCaptureEnabled/);
  assert.match(backup, /appassets\.androidplatform\.net/);
  assert.match(onboarding, /data-action="restore"/);
  assert.match(settings, /input\.click\(\)/); // Safari/web fallback remains intact.
});

test('restore distinguishes empty storage from malformed or unreadable current data', () => {
  assert.match(backup, /raw===null\) return 'EMPTY'/);
  assert.match(backup, /catch\(e\) \{ return 'CORRUPT'; \}/);
  assert.match(backup, /text == "EMPTY" && beforeImport/);
  assert.match(backup, /text == "CORRUPT" \|\| text == null/);
});

test('existing records require a verified safety copy; cancellation aborts import', () => {
  assert.match(backup, /actual\.contentEquals\(text\.toByteArray\(Charsets\.UTF_8\)\)/);
  assert.match(backup, /else if \(incoming != null\) confirmImport\(\)/);
  assert.match(backup, /uri == null \|\| text == null\) \{ reset\(\); finishWebPicker\(\)/);
  assert.match(backup, /save\.launch\("wain-rahat-before-restore-/);
  assert.match(backup, /if\(\$expectedEmpty \? raw!==null : raw===null\) return 'changed'/);
});

test('Android root applies system, cutout, and keyboard insets once', () => {
  assert.ok(mainActivity.includes('WindowCompat.setDecorFitsSystemWindows(window, false)'));
  assert.ok(mainActivity.includes('WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()'));
  assert.ok(mainActivity.includes('max(safe.bottom, ime.bottom)'));
  assert.ok(mainActivity.includes('setPadding(safe.left, safe.top, safe.right,'));
  assert.ok(mainActivity.includes('SOFT_INPUT_ADJUST_RESIZE'));
  assert.ok(mainActivity.includes('LAYOUT_DIRECTION_RTL'));
  assert.ok(mainActivity.includes('WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE'));
  assert.ok(mainActivity.includes('hide(WindowInsetsCompat.Type.systemBars())'));
  assert.ok(mainActivity.includes('LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES'));
  assert.ok(mainActivity.includes('onWindowFocusChanged'));
  assert.doesNotMatch(mainActivity, /addView\(backup\.view\(\)\)/);
});

test('Android backup export channel is restricted to trusted top-level app page', () => {
  assert.match(mainActivity, /WebViewCompat\.addWebMessageListener/);
  assert.match(mainActivity, /setOf\(appOrigin\)/);
  assert.match(mainActivity, /handleAppMessage\(backup, message\.data, origin, isMainFrame\)/);
  assert.match(mainActivity, /"save" -> backup\.handleBackupMessage\(data, origin, isMainFrame\)/);
  assert.match(backup, /!isMainFrame/);
  assert.match(backup, /origin\.host != "appassets\.androidplatform\.net"/);
  assert.match(backup, /!isAppPage\(\)/);
  assert.match(backup, /request\.optString\("action"\) != "save"/);
  assert.match(backup, /JSONTokener\(content\)/);
});

test('Android safe-area space keeps the current theme background and avoids double top inset', () => {
  assert.match(mainActivity, /window\.setBackgroundDrawable\(ColorDrawable\(startupBackground\)\)/);
  assert.match(mainActivity, /rootLayout\.setBackgroundColor\(color\)/);
  assert.match(mainActivity, /getPropertyValue\('--bg'\)/);
  assert.match(mainActivity, /action:'theme',color:c/);
  assert.match(mainActivity, /uri\.path == "\/assets\/index\.html"/);
  assert.match(html, /dataset\.nativeShell = 'android'/);
  assert.match(mainActivity, /assets\/index\.html\?shell=android/);
  assert.match(polish, /html\[data-native-shell="android"\] \.topbar\s*\{\s*min-height: 61px;\s*padding: 7px 16px;/);
  assert.match(polish, /padding: calc\(7px \+ env\(safe-area-inset-top\)\)/);
});
