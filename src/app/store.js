/* وين راحت؟ — store.js
 * Local storage for the household ledger (version 3), the one-time migration from version 2,
 * daily safety snapshots, and JSON backup/restore. Data never leaves the device.
 */
(function (WR) {
  'use strict';
  const L = window.WRLedger, M = window.WRMigrate, F = window.WRFormat;
  const KEY = 'weenrahat-v3';
  const SNAPSHOT_KEY = 'weenrahat-v3-snapshot';
  const THEME_KEY = 'thukhr-appearance-v1'; // kept from earlier versions so the chosen appearance survives
  const LEGACY_BASE = 'mizan-finance-v2';

  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  function write(key, value) {
    try { localStorage.setItem(key, value); }
    catch (e) { throw new Error(e && e.name === 'QuotaExceededError' ? 'مساحة التخزين في المتصفح ممتلئة. نزّل نسخة احتياطية ثم احذف بيانات قديمة.' : 'تعذر الحفظ في هذا المتصفح.'); }
  }

  /** The version-2 ledger of the profile that was active in the old app. */
  function legacyKey() {
    let profile = 'default';
    try {
      const id = localStorage.getItem('thukhr-active-profile-v1');
      const list = JSON.parse(localStorage.getItem('thukhr-local-profiles-v1') || '[]');
      if (id && Array.isArray(list) && list.some(p => p && p.id === id)) profile = id;
    } catch { /* fall back to the default profile */ }
    return profile === 'default' ? LEGACY_BASE : `${LEGACY_BASE}-profile-${profile}`;
  }
  const legacyRaw = () => read(legacyKey());

  function load() {
    const raw = read(KEY);
    if (raw) {
      try { const state = JSON.parse(raw); L.validate(state); return { status: 'ok', state }; }
      catch (e) { return { status: 'error', raw, error: 'تعذر قراءة البيانات المحفوظة: ' + e.message }; }
    }
    const old = legacyRaw();
    if (old) {
      try {
        const { state, report } = M.fromV2(JSON.parse(old));
        state.meta.migratedFrom.key = legacyKey();
        write(KEY, JSON.stringify(state)); // the version-2 data stays untouched under its own key
        return { status: 'migrated', state, report };
      } catch (e) { return { status: 'migration-failed', error: e.message }; }
    }
    return { status: 'new' };
  }

  /** Saves, keeping one snapshot of the previous day's data as a safety net. */
  function save(state) {
    L.validate(state);
    const previous = read(KEY), today = F.today();
    try {
      const snap = JSON.parse(read(SNAPSHOT_KEY) || 'null');
      if (previous && (!snap || snap.date !== today)) write(SNAPSHOT_KEY, JSON.stringify({ date: today, data: previous }));
    } catch { /* a missing snapshot must never block saving */ }
    write(KEY, JSON.stringify(state));
  }
  const snapshot = () => { try { return JSON.parse(read(SNAPSHOT_KEY) || 'null'); } catch { return null; } };
  function clear() { try { localStorage.removeItem(KEY); localStorage.removeItem(SNAPSHOT_KEY); } catch { /* ignore */ } }

  function backupText(state) {
    return JSON.stringify({ app: 'weenrahat', format: 3, exportedAt: new Date().toISOString(), data: state }, null, 1);
  }
  /** Accepts a backup from this version (wrapped or bare) or from the previous version (migrated). */
  function parseBackup(text) {
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('الملف ليس نسخة احتياطية صالحة (JSON).'); }
    if (data && data.app === 'weenrahat' && data.data) data = data.data;
    if (M.isV2(data)) return { state: M.fromV2(data).state, migrated: true };
    L.validate(data);
    return { state: data, migrated: false };
  }

  const theme = () => { const v = read(THEME_KEY); return v === 'classic' || v === 'night' ? v : null; };
  function setTheme(value) { try { value ? localStorage.setItem(THEME_KEY, value) : localStorage.removeItem(THEME_KEY); } catch { /* ignore */ } }

  WR.store = { KEY, load, save, snapshot, clear, backupText, parseBackup, legacyKey, legacyRaw, theme, setTheme };
})(window.WR = window.WR || {});
