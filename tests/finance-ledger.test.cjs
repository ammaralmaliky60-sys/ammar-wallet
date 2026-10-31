'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const E=require('../engine.js');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const today=E.today();
function build(){
 let s=E.initial();s.cycle.start='2026-09-01';
 s=E.commit(s,{type:'income',date:'2026-09-02',amount:100000,method:'card',sourceId:'salary',incomePeriod:'2026-09'});
 s.obligations.push({id:'loan_test',name:'اختبار القسط',amount:50000,due:today,recurring:false});
 s=E.commit(s,{type:'expense',date:'2026-09-03',walletId:'home',method:'card',amount:10000,
   note:'اختبار',...{}});return s;
}
function begin(){
 let s=E.initial();s.cycle.start='2026-09-01';
 s=E.commit(s,{type:'income',date:'2026-09-02',amount:100000,method:'card',sourceId:'salary',incomePeriod:'2026-09'});
 s=E.commit(s,{type:'allocate',date:'2026-09-02',amount:30000,walletId:'home'});
 s=E.commit(s,{type:'expense',date:'2026-09-03',amount:10000,method:'card',walletId:'home'});
 s=E.commit(s,{type:'income',date:today,amount:200000,method:'card',sourceId:'salary',incomePeriod:today.slice(0,7)});
 s.obligations.push({id:'loan_test',name:'اختبار قسط',amount:50000,due:today,recurring:false});
 return s;
}
test('September income excludes future income',()=>{
 const p=E.periodReport(begin(),'2026-09');assert.equal(p.income,100000);
 assert.equal(p.expenses,10000);assert.equal(p.closing.total,90000);
 assert.equal(p.opening.total,0);
});
test('historical snapshot does not mutate original state',()=>{
 const s=begin(),json=JSON.stringify(s);E.periodReport(s,'2026-09');assert.equal(JSON.stringify(s),json);
});
test('future month cannot be reported',()=>{
 assert.throws(()=>E.periodReport(begin(),'2030-01'),/المستقبل/);
});
test('withheld entry settles without cash debit',()=>{
 let s=begin(),before=E.stats(s);
 s=E.commit(s,{type:'withheld',date:today,amount:18000,obligationId:'loan_test',note:'خصم من الراتب قبل الإيداع'});
 const after=E.stats(s);
 assert.equal(before.card,after.card);
 assert.equal(before.total,after.total);
 assert.equal(after.paid.loan_test,18000);
 assert.equal(after.withheld,18000);
});
test('withheld cannot exceed an obligation balance',()=>{
 let s=begin();
 assert.throws(()=>E.commit(s,{type:'withheld',date:today,amount:50001,obligationId:'loan_test',note:'خصم قبل الإيداع'}));
});
test('cash payment after withholding is limited to outstanding reserved amount',()=>{
 let s=E.commit(begin(),{type:'withheld',date:today,amount:18000,obligationId:'loan_test',note:'خصم قبل الإيداع'});
 s=E.commit(s,{type:'reserve',date:today,amount:32000,obligationId:'loan_test'});
 assert.throws(()=>E.commit(s,{type:'reserve',date:today,amount:1,obligationId:'loan_test'}));
 s=E.commit(s,{type:'pay',date:today,amount:32000,obligationId:'loan_test',method:'card'});
 assert.equal(E.stats(s).paid.loan_test,50000);
 assert.equal(E.stats(s).card,258000);
});
test('new-cycle linked salary rejects re-registering same month',()=>{
 let s=begin();s.cycle.start='2026-09-01';
 const m=today.slice(0,7);
 // Build cycle with no current-month income to avoid already-present future entries.
 s=E.initial();s.cycle.start='2026-09-01';
 s=E.commit(s,{type:'income',date:'2026-09-01',method:'card',amount:1000});
 s=E.startCycle(s,{start:today,days:30,income:720000,method:'card',policy:'same',
  sourceId:'salary',incomePeriod:m});
 assert.throws(()=>E.commit(s,{type:'income',date:today,amount:720000,method:'card',sourceId:'salary',incomePeriod:m}));
});
test('previous monthly closures block new financial events',()=>{
 const s=begin(),before=E.stats(s);
 s.settings.monthClosures={'2026-09':{closedAt:today,total:90000}};
 E.validate(s);
 assert.throws(()=>E.commit(s,{type:'income',date:'2026-09-10',amount:1000,method:'card'}));
 assert.equal(E.stats(s).total,before.total);
});
test('previous monthly closures block deleting old transactions',()=>{
 const s=begin();
 s.settings.monthClosures={'2026-09':{closedAt:today,total:90000}};
 assert.throws(()=>E.remove(s,s.transactions[0].id),/مغلق/);
});
test('legacy finance data validates without closures or withheld totals',()=>{
 const s=begin();delete s.settings.monthClosures;delete s.settings.monthAudit;
 assert.equal(E.validate(s),true);
});
test('finance UI provides month close and reconciliation actions',()=>{
 assert.match(app,/function monthClose\(/);
 assert.match(app,/function monthReopen\(/);
 assert.match(app,/function financeAuditPanels\(/);
 assert.match(app,/financial-csv/);
});
test('finance backup uses local profiles and cryptographic checksum',()=>{
 assert.match(app,/ROOT_KEY='mizan-finance-v2'/);
 assert.match(app,/async function digestFinance/);
 assert.match(app,/backupIntegrity/);
 assert.match(app,/function rollingSnapshot/);
});
test('app has historical rather than current-only monthly report',()=>{
 assert.match(app,/E\.periodReport\(state,wfMonth\)/);
 assert.match(app,/const snapshot=E\.periodReport\(state,wfMonth\)/);
});
