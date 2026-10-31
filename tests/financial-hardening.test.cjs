'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const E=require('../engine.js');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const family=fs.readFileSync(path.join(__dirname,'..','thukhr-family.js'),'utf8');
const now=E.today(),start='2026-09-01';
function base(){const s=E.initial();s.cycle.start=start;return s}
function transaction(s,e){return E.commit(s,{date:now,...e})}
test('month-end replay excludes next month',()=>{
 let s=base();
 s=transaction(s,{type:'income',date:'2026-09-05',amount:100000,method:'card',sourceId:'salary',incomePeriod:'2026-09'});
 s=transaction(s,{type:'allocate',date:'2026-09-06',amount:10000,walletId:'home'});
 s=transaction(s,{type:'expense',date:'2026-09-08',amount:10000,method:'card',walletId:'home'});
 s=transaction(s,{type:'income',date:'2026-10-04',amount:200000,method:'card',sourceId:'salary',incomePeriod:'2026-10'});
 assert.equal(E.statsAt(s,'2026-09-30').total,90000);assert.equal(E.stats(s).total,290000);
});
test('withheld installment does not reduce net salary',()=>{
 let s=base();s=transaction(s,{type:'income',date:'2026-10-02',amount:720000,method:'card',sourceId:'salary',incomePeriod:'2026-10'});
 s.obligations.push({id:'bank',name:'سلفة المصرف',amount:218000,due:'2026-10-20',recurring:false});
 s=transaction(s,{type:'withheld',date:'2026-10-20',obligationId:'bank',amount:218000,note:'استقطع القسط قبل إيداع الراتب الصافي'});
 assert.equal(E.stats(s).total,720000);assert.equal(E.stats(s).withheld.bank,218000);
 assert.throws(()=>transaction(s,{type:'reserve',date:'2026-10-20',obligationId:'bank',amount:1}));
});
test('month closure prohibits new backdated events',()=>{
 let s=base();s=transaction(s,{type:'income',date:'2026-09-05',amount:100000,method:'card'});
 s.settings.closedMonths={'2026-09':{closedAt:now,from:'2026-09-01',to:'2026-09-30',closingTotal:100000}};
 E.validate(s);assert.equal(E.stats(s).total,100000);
 assert.throws(()=>transaction(s,{type:'expense',date:'2026-09-07',walletId:'home',method:'card',amount:1}));
});
test('legacy unlinked salary cannot be added twice as linked salary',()=>{
 let s=base();s=transaction(s,{type:'income',amount:720000,date:'2026-10-03',method:'card',note:'الدخل المستلم للدورة الجديدة'});
 assert.throws(()=>transaction(s,{type:'income',amount:720000,date:'2026-10-03',method:'card',sourceId:'salary',incomePeriod:'2026-10'}));
});
test('new cycle income is source-linked',()=>{
 const s=E.startCycle(base(),{start:'2026-10-01',days:30,income:720000,sourceId:'salary',incomePeriod:'2026-10',method:'card'});
 assert.equal(s.transactions.at(-1).sourceId,'salary');
});
test('old transaction IDs and balances survive new settings',()=>{
 let s=base();s=transaction(s,{type:'income',date:'2026-10-01',method:'card',amount:10000});
 const frozen=JSON.stringify(s.transactions),value=E.stats(s).total;
 s.settings.closedMonths={};s.settings.wfIncomeModes={'2026-10':'salary-only'};
 E.validate(s);assert.equal(JSON.stringify(s.transactions),frozen);assert.equal(E.stats(s).total,value);
});
test('app uses strict month boundaries and historical balances',()=>{
 assert.match(app,/function reportingPeriod\(month=wfMonth\)/);
 assert.match(app,/E\.statsAt\(state,previous\)/);
 assert.match(app,/t\.date>=start&&t\.date<=end/);
});
test('itemized salary settlement and CSV contain audit columns',()=>{
 assert.match(app,/function wfApply\(stage\)/);
 assert.match(app,/settle-.*key/);
 assert.match(app,/type:'withheld'/);
 assert.match(app,/function exportFinanceCsv\(\)/);
 assert.match(app,/sourceId/);
});
test('legacy default key and per-person local isolation remain available',()=>{
 assert.match(app,/BASE_KEY='mizan-finance-v2'/);
 assert.match(app,/BASE_KEY\+'-profile-'\+activeProfile/);
 assert.match(family,/family-photo-/);
});
test('backups are validated and restored with account balance preview',()=>{
 assert.match(app,/function backup\(\)\{E\.validate\(state\)/);
 assert.match(app,/E\.stats\(next\)\.total/);
});
