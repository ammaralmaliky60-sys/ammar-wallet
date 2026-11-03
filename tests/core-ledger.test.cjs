'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const L=require('../src/core/ledger.js');
const today='2026-11-03';
const opts={today};

function sample(){
 let s=L.createState({name:'عمار',monthStartDay:1});
 s=L.saveAccount(s,{id:'card',opening:100000});
 s=L.saveIncomeSource(s,{id:'salary',name:'الراتب',day:1,amount:900000,accountId:'card'});
 s=L.saveCategory(s,{id:'groceries',budget:300000});
 s=L.saveCategory(s,{id:'dining',budget:50000});
 const add=tx=>{s=L.addTransaction(s,tx,opts).state};
 add({type:'income',date:'2026-11-01',amount:900000,accountId:'card',sourceId:'salary'});
 add({type:'expense',date:'2026-11-02',amount:120000,accountId:'card',categoryId:'groceries',note:'سوق'});
 add({type:'expense',date:'2026-11-03',amount:60000,accountId:'cash',categoryId:'dining'});
 add({type:'transfer',date:'2026-11-03',amount:200000,accountId:'card',toAccountId:'cash',note:'سحب'});
 add({type:'expense',date:'2026-10-20',amount:40000,accountId:'card',categoryId:'groceries'});
 return s;
}

test('a new state is valid and has household defaults',()=>{
 const s=L.createState();
 assert.ok(L.validate(s));
 assert.deepEqual(s.accounts.map(a=>a.id),['cash','card']);
 assert.ok(s.categories.length>=10);
 assert.equal(s.settings.monthStartDay,1);
});

test('expenses are recorded directly: no allocation step, and a balance may go below zero',()=>{
 let s=L.createState();
 const r=L.addTransaction(s,{type:'expense',date:today,amount:5000,accountId:'cash',categoryId:'dining'},opts);
 assert.equal(L.balances(r.state).accounts.cash,-5000,'recorded, the UI warns instead of refusing');
 assert.equal(r.transaction.note,'');
});

test('balances = opening + income − expense ± transfers, optionally as of a date',()=>{
 const s=sample(),b=L.balances(s);
 assert.equal(b.accounts.card,100000+900000-120000-200000-40000);
 assert.equal(b.accounts.cash,-60000+200000);
 assert.equal(b.total,100000+900000-120000-60000-40000);
 assert.equal(L.balances(s,'2026-10-31').total,100000-40000);
});

test('invalid transactions are rejected with a clear message and the state is unchanged',()=>{
 const s=sample(),before=JSON.stringify(s);
 assert.throws(()=>L.addTransaction(s,{type:'expense',date:today,amount:5,accountId:'cash',categoryId:'nope'},opts),/فئة المصروف/);
 assert.throws(()=>L.addTransaction(s,{type:'transfer',date:today,amount:5,accountId:'cash',toAccountId:'cash'},opts),/حسابين مختلفين/);
 assert.throws(()=>L.addTransaction(s,{type:'income',date:'2026-11-04',amount:5,accountId:'cash'},opts),/المستقبل/);
 assert.throws(()=>L.addTransaction(s,{type:'expense',date:today,amount:0,accountId:'cash',categoryId:'dining'},opts),/حركة غير صالحة/);
 assert.equal(JSON.stringify(s),before);
});

test('transactions can be edited and deleted',()=>{
 let s=sample();const id=s.transactions[1].id;
 s=L.updateTransaction(s,id,{amount:100000,note:'سوق الشهر'},opts);
 assert.equal(s.transactions[1].amount,100000);assert.equal(s.transactions[1].note,'سوق الشهر');
 s=L.removeTransaction(s,id);
 assert.ok(!s.transactions.some(t=>t.id===id));
});

test('the month summary compares spending with each category budget',()=>{
 const m=L.monthSummary(sample(),'2026-11',opts);
 assert.equal(m.income,900000);assert.equal(m.expense,180000);assert.equal(m.net,720000);
 const g=m.categories.find(c=>c.id==='groceries'),d=m.categories.find(c=>c.id==='dining');
 assert.equal(g.spent,120000);assert.equal(g.remaining,180000);assert.equal(g.level,'ok');
 assert.equal(d.spent,60000);assert.equal(d.level,'over');
 assert.deepEqual(m.ranked.map(c=>c.id),['groceries','dining']);
 assert.equal(m.budgetTotal,350000);assert.equal(m.budgetedSpent,180000);
 assert.equal(m.pace.daysLeft,28,'3 Nov: 28 days including today');
 assert.equal(m.pace.daily,Math.floor(170000/28));
 assert.equal(m.pace.status,'fast','51% of the budget after 10% of the month');
});

test('categories without a budget are flagged as unplanned only when used',()=>{
 assert.equal(L.budgetLevel(0,0),'empty');assert.equal(L.budgetLevel(10,0),'unplanned');
 assert.equal(L.budgetLevel(80,100),'warn');assert.equal(L.budgetLevel(101,100),'over');
});

test('income sources show received, due, late or upcoming for the month',()=>{
 let s=sample();
 s=L.saveIncomeSource(s,{id:'bonus',name:'الحوافز',day:10,amount:0,accountId:'card'});
 s=L.saveIncomeSource(s,{id:'rent',name:'إيجار محل',day:2,amount:0,accountId:'cash'});
 const st=Object.fromEntries(L.incomeStatus(s,'2026-11',opts).map(x=>[x.source.id,x]));
 assert.equal(st.salary.status,'received');assert.equal(st.salary.amount,900000);
 assert.equal(st.bonus.status,'upcoming');assert.equal(st.bonus.expected,'2026-11-10');
 assert.equal(st.rent.status,'late');
});

test('with a custom start day an income source falls on the right calendar date',()=>{
 let s=L.createState({monthStartDay:23});
 s=L.saveIncomeSource(s,{id:'salary',name:'الراتب',day:23,amount:0,accountId:'card'});
 s=L.saveIncomeSource(s,{id:'bonus',name:'الحوافز',day:10,amount:0,accountId:'card'});
 const st=Object.fromEntries(L.incomeStatus(s,'2026-10',{today:'2026-10-25'}).map(x=>[x.source.id,x.expected]));
 assert.deepEqual(st,{salary:'2026-10-23',bonus:'2026-11-10'});
});

test('trend, daily spending and month-over-month comparison',()=>{
 const s=sample();
 const t=L.trend(s,'2026-11',3);
 assert.deepEqual(t.map(x=>x.key),['2026-09','2026-10','2026-11']);
 assert.deepEqual(t.map(x=>x.expense),[0,40000,180000]);
 const days=L.dailyExpense(s,'2026-11');
 assert.equal(days.length,30);assert.equal(days[1].amount,120000);assert.equal(days[2].amount,60000);
 const cmp=Object.fromEntries(L.compare(s,'2026-11').map(c=>[c.id,c.delta]));
 assert.deepEqual(cmp,{groceries:80000,dining:60000});
});

test('used categories, accounts and sources are archived instead of deleted',()=>{
 let s=sample();
 s=L.removeCategory(s,'groceries');assert.equal(s.categories.find(c=>c.id==='groceries').archived,true);
 s=L.removeCategory(s,'gifts');assert.ok(!s.categories.some(c=>c.id==='gifts'));
 s=L.removeIncomeSource(s,'salary');assert.equal(s.incomeSources[0].archived,true);
 s=L.removeAccount(s,'cash');assert.equal(s.accounts.find(a=>a.id==='cash').archived,true);
 // archived categories still appear in a month where they were used
 assert.ok(L.monthSummary(s,'2026-11',opts).categories.some(c=>c.id==='groceries'));
});

test('validation rejects broken files',()=>{
 const s=sample();
 assert.throws(()=>L.validate({...s,version:2}),/الإصدار/);
 const dup=L.clone(s);dup.transactions.push({...dup.transactions[0]});
 assert.throws(()=>L.validate(dup),/مكرر/);
 const bad=L.clone(s);bad.settings.monthStartDay=30;
 assert.throws(()=>L.validate(bad),/إعدادات/);
 const proto=L.clone(s);proto.categories[0].id='__proto__';
 assert.throws(()=>L.validate(proto),/معرّف/);
});

test('settings keep the start day within 1–28',()=>{
 const s=L.updateSettings(L.createState(),{monthStartDay:31,name:'أم علي'});
 assert.equal(s.settings.monthStartDay,28);assert.equal(s.settings.name,'أم علي');
});
