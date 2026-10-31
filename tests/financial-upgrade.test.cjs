'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),code=n=>fs.readFileSync(path.join(root,n),'utf8');
const E=require('../engine.js'),app=code('app.js');
const today=E.today(),period=today.slice(0,7);
function journal(){let s=E.initial();s.cycle.start='2026-09-01';return s}
const entry=(type,date,amount,extra={})=>({type,date,amount,...extra});
test('salary net after prior withholding is not deducted again',()=>{
 let s=journal();s=E.commit(s,entry('income',today,720000,{method:'card',sourceId:'salary',incomePeriod:period}));
 s.obligations.push({id:'bank',name:'قسط المصرف',amount:218000,due:today,recurring:false});
 s=E.commit(s,entry('withheld',today,218000,{obligationId:'bank',
  withheldConfirmed:true,note:'مخصوم مسبقاً من راتب صافي'}));
 const a=E.stats(s);assert.equal(a.card,720000);assert.equal(a.unallocated,720000);
 assert.equal(a.paid.bank,218000);assert.equal(a.withheld.bank,218000);assert.equal(a.withheldTotal,218000);
 assert.throws(()=>E.commit(s,entry('reserve',today,218000,{obligationId:'bank'})));
 assert.throws(()=>E.commit(s,entry('pay',today,218000,{obligationId:'bank',method:'card'})));
});
test('prior withholding requires explicit confirmation and meaningful note',()=>{
 let s=journal();s.obligations.push({id:'bank',name:'قسط',amount:5000,due:today,recurring:false});
 assert.throws(()=>E.commit(s,entry('withheld',today,5000,{obligationId:'bank',note:'قصير'})));
});
test('balance as of month does not leak later income or expenses',()=>{
 let s=journal();s=E.commit(s,entry('income','2026-09-15',100000,{method:'card'}));
 s=E.commit(s,entry('allocate','2026-09-16',15000,{walletId:'home'}));
 s=E.commit(s,entry('expense','2026-09-18',10000,{walletId:'home',method:'card'}));
 s=E.commit(s,entry('income','2026-10-02',200000,{method:'card'}));
 s=E.commit(s,entry('allocate','2026-10-03',35000,{walletId:'home'}));
 s=E.commit(s,entry('expense','2026-10-04',30000,{walletId:'home',method:'card'}));
 assert.equal(E.statsAsOf(s,'2026-09-01').total,0);
 assert.equal(E.statsAsOf(s,'2026-09-30').total,90000);
 assert.equal(E.stats(s).total,260000);
});
test('locked historic month refuses append and deletion',()=>{
 let s=journal();s=E.commit(s,entry('income','2026-09-10',100000,{method:'card'}));
 const id=s.transactions[0].id;
 s=E.closeMonth(s,'2026-09','تمت مراجعة الحسابات وأرقام السجل');
 assert.throws(()=>E.commit(s,entry('income','2026-09-20',1000,{method:'card'})));
 assert.throws(()=>E.remove(s,id));
 assert.equal(E.stats(s).total,100000);
});
test('new cycle links salary source and blocks repeat salary for the same period',()=>{
 let s=journal();s=E.startCycle(s,{start:today,days:30,income:720000,method:'card',
  sourceId:'salary',incomePeriod:period});
 assert.equal(s.transactions.at(-1).sourceId,'salary');
 assert.throws(()=>E.commit(s,entry('income',today,720000,{method:'card',
  sourceId:'salary',incomePeriod:period})));
});
test('old journal stays valid and totals stay unchanged',()=>{
 let s=journal();s=E.commit(s,entry('income','2026-09-01',10000,{method:'cash'}));
 const before=JSON.stringify(s.transactions),a=E.stats(s);
 assert.equal(E.validate(s),true);
 assert.equal(JSON.stringify(s.transactions),before);
 assert.equal(E.stats(s).cash,a.cash);
 assert.equal(E.stats(s).total,a.total);
});
test('finance UI includes period controls, reconciliation and local profiles',()=>{
 assert.match(app,/function financialMonthWindow/);
 assert.match(app,/function financialCloseMonth/);
 assert.match(app,/function financialDuplicateAlerts/);
 assert.match(app,/function financialProfileCreate/);
 assert.match(app,/function financialRecoveryDialog/);
 assert.match(app,/function exportFinancialCsv/);
 assert.match(app,/withheldConfirmed:true/);
});
test('financial control assets are packaged for offline use',()=>{
 const html=code('index.html'),sw=code('sw.js');
 assert.match(html,/thukhr-recovery\.js\?v=finance-20261031-r1/);
 assert.match(sw,/thukhr-recovery\.js\?v=finance-20261031-r1/);
 assert.match(html,/thukhr-finance\.css\?v=20261031-r1/);
 assert.match(sw,/thukhr-finance\.css\?v=20261031-r1/);
});
