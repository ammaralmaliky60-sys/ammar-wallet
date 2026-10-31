'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const get=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=get('app.js'),html=get('index.html'),css=get('thukhr-design-system.css'),sw=get('sw.js');
test('new design is linked and cached for offline use',()=>{
 assert.match(html,/thukhr-design-system\.css\?v=20261031-smart-r1/);
 assert.match(sw,/thukhr-design-system\.css\?v=20261031-smart-r1/);
});
test('date filters have explicit visible labels and human-readable Arabic dates',()=>{
 assert.match(app,/class="thukhr-date-filter"/);
 assert.match(app,/fromFilterReadable/);
 assert.match(app,/toFilterReadable/);
 assert.match(css,/thukhr-date-filter/);
});
test('five primary mobile navigation choices',()=>{
 assert.equal((html.match(/data-neo-page=/g)||[]).length+2,5);
 assert.match(html,/id="thukhrMoreMenu"/);
 assert.match(html,/href="#emergency"/);
 assert.match(html,/href="#ledger"/);
 assert.match(html,/href="#settings"/);
});
test('ledger keeps desktop table and creates responsive cards',()=>{
 assert.match(app,/function ledgerMobileRows\(txs\)/);
 assert.match(app,/id="ledgerMobileResults"/);
 assert.match(css,/thukhr-ledger-table/);
 assert.match(css,/thukhr-ledger-mobile/);
});
test('living cards are expandable and emergency still protected',()=>{
 assert.match(app,/thukhr-living-compact/);
 assert.match(app,/emergency-open/);
 assert.match(css,/thukhr-living-summary/);
});
test('settings expose four visual categories',()=>{
 for(const tab of ['account','appearance','income','backup'])assert.ok(app.includes("['"+tab+"','")||app.includes("'"+tab+"'"));
 assert.match(app,/thukhr-settings-tabs/);
});
test('accounting key and emergency authorization remain in application',()=>{
 assert.match(app,/BASE_KEY='mizan-finance-v2'/);
 assert.match(app,/emergencyAuthorization/);
 assert.match(app,/wfIncomeMode/);
});
test('app and service worker remain syntactically valid',()=>{
 new Function(app);new Function(sw);
});
