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

test('setting aside and withdrawing money leaves spending unchanged until the installment is paid', () => {
 let s = L.saveAccount(L.createState(), { id: 'cash', opening: 300000 });
 s = L.saveAccount(s, { id: 'advance', name: 'سلفة الدوام', opening: 0, reserveTarget: 500000 });
 s = L.saveCategory(s, { id: 'advance-payment', name: 'سلفة الدوام', icon: 'wallet', color: L.COLORS[0], budget: 500000 });
 const add = tx => { s = L.addTransaction(s, { date: today, ...tx }, opts).state; };
 const reserve = () => {
   const { balance, needed, paidThisMonth } = L.reserves(s, '2026-11')[0];
   return [balance, needed, paidThisMonth];
 };

 add({ type: 'transfer', accountId: 'cash', toAccountId: 'advance', amount: 250000 });
 assert.deepEqual(reserve(), [250000, 250000, 0]);
 add({ type: 'transfer', accountId: 'advance', toAccountId: 'cash', amount: 50000 });
 assert.deepEqual(reserve(), [200000, 300000, 0]);
 assert.equal(L.balances(s).total, 300000);
 assert.equal(L.monthSummary(s, '2026-11', opts).expense, 0);
 add({ type: 'income', accountId: 'card', amount: 300000 });
 add({ type: 'transfer', accountId: 'card', toAccountId: 'advance', amount: 250000 });
 assert.deepEqual(reserve(), [450000, 50000, 0]);
 add({ type: 'transfer', accountId: 'cash', toAccountId: 'advance', amount: 50000 });
 assert.deepEqual(reserve(), [500000, 0, 0]);
 add({ type: 'expense', accountId: 'advance', categoryId: 'advance-payment', amount: 500000 });
 assert.deepEqual(reserve(), [0, 0, 500000]);
 assert.equal(L.reserves(s, '2026-12')[0].needed, 500000);
 assert.equal(L.monthSummary(s, '2026-11', opts).expense, 500000);
 assert.equal(L.balances(s).total, 100000);
});

test('the reserved balance is protected when withdrawing, editing a transfer, or removing the reserve', () => {
 const s = L.saveAccount(L.createState(), { id: 'advance', name: 'سلفة الدوام', opening: 0, reserveTarget: 500000 });
 const funded = L.addTransaction(s, { type: 'transfer', date: today, accountId: 'cash', toAccountId: 'advance', amount: 250000 }, opts);
 const withdrawal = amount => ({ type: 'transfer', date: today, accountId: 'advance', toAccountId: 'cash', amount });
 assert.throws(() => L.removeAccount(funded.state, 'advance'), /قبل الأرشفة/);
 assert.throws(() => L.addTransaction(funded.state, withdrawal(260000), opts), /أكبر من الرصيد المعزول/);
 const used = L.addTransaction(funded.state, withdrawal(200000), opts).state;
 assert.throws(() => L.updateTransaction(used, funded.transaction.id, { amount: 190000 }, opts), /أكبر من الرصيد المعزول/);
 assert.throws(() => L.removeTransaction(used, funded.transaction.id), /أكبر من الرصيد المعزول/);
 assert.equal(L.balances(used).accounts.advance, 50000);
});

test('an open category tracks its monthly spending outside the capped totals', () => {
 let s = L.saveCategory(sample(), { id: 'health', budget: 25000 });
 s = L.addTransaction(s, { type: 'expense', date: today, accountId: 'cash', categoryId: 'health', amount: 40000 }, opts).state;
 s = L.saveCategory(s, { id: 'health', budget: 0 });
 const summary = L.monthSummary(s, '2026-11', opts);
 const medicine = summary.categories.find(c => c.id === 'health');
 assert.equal(medicine.spent, 40000);
 assert.equal(medicine.budget, 0);
 assert.equal(summary.expense, 220000);
 assert.equal(summary.budgetedSpent, 180000);
});

test('فلوسي combines existing balances and keeps account history intact when switching views', () => {
 const original = sample();
 assert.equal(L.unifiedWallet(original), true);
 const wallet = L.ensureWallet(original);
 const updated = L.addTransaction(wallet.state, { type: 'expense', date: today, amount: 17000, accountId: wallet.accountId, categoryId: 'health' }, opts).state;
 assert.equal(L.walletTotals(updated).available, L.balances(original).total - 17000);
 assert.deepEqual(updated.transactions.slice(0, -1), original.transactions);
 assert.equal(L.ensureWallet(updated).accountId, wallet.accountId);
 assert.equal(L.ensureWallet(updated).state, updated);
 const split = L.updateSettings(updated, { accountMode: 'split' });
 assert.equal(L.unifiedWallet(split), false);
 assert.deepEqual(L.balances(split), L.balances(updated));
 for (const id of ['cash', 'card']) assert.equal(L.balances(split).accounts[id], L.balances(original).accounts[id]);
});

test('simple reserves draw from فلوسي and leave transaction totals correct', () => {
 let s = L.saveAccount(L.createState(), { id: 'cash', opening: 750000 });
 s = L.saveAccount(s, { id: 'advance', name: 'سلفة الدوام', opening: 0, reserveTarget: 500000 });
 const fund = () => { s = L.moveReserve(s, 'advance', 'fund', 250000, opts); };
 fund();
 assert.deepEqual(L.walletTotals(s), { total: 750000, reserved: 250000, available: 500000 });
 s = L.moveReserve(s, 'advance', 'withdraw', 50000, opts);
 assert.equal(L.walletTotals(s).available, 550000);
 fund();
 assert.equal(L.reserves(s, '2026-11')[0].needed, 50000);
 assert.throws(() => L.moveReserve(s, 'advance', 'pay', 500000, opts), /أكبر من الرصيد المعزول/);
 assert.equal(s.categories.some(c => c.name === 'سلفة الدوام'), false);
 s = L.moveReserve(s, 'advance', 'fund', 50000, opts);
 s = L.moveReserve(s, 'advance', 'pay', 500000, opts);
 assert.deepEqual(L.walletTotals(s), { total: 250000, reserved: 0, available: 250000 });
 assert.equal(L.monthSummary(s, '2026-11', opts).expense, 500000);
 assert.equal(L.reserves(s, '2026-11')[0].paidThisMonth, 500000);
 assert.equal(s.accounts.filter(a => a.pooled).length, 1);
});

test('targetless reserves and split accounts use the chosen balance when funding', () => {
 let s = L.updateSettings(L.createState(), { accountMode: 'split' });
 s = L.saveAccount(s, { id: 'cash', opening: 50000 });
 s = L.saveAccount(s, { id: 'card', opening: 100000 });
 s = L.saveAccount(s, { id: 'advance', name: 'دفعة', opening: 0, reserveTarget: 0 });
 assert.throws(() => L.moveReserve(s, 'advance', 'fund', 80000, { ...opts, accountId: 'cash' }), /أكبر من المتاح/);
 s = L.moveReserve(s, 'advance', 'fund', 80000, { ...opts, accountId: 'card' });
 s = L.moveReserve(s, 'advance', 'withdraw', 15000, { ...opts, accountId: 'cash' });
 assert.deepEqual(L.balances(s).accounts, { cash: 65000, card: 20000, advance: 65000 });
 assert.equal(L.reserves(s, '2026-11')[0].needed, 0);
});

test('irregular contributions total by source and month without creating a reminder', () => {
 let s = L.saveIncomeSource(L.createState(), { id: 'spouse', name: 'مساهمة الزوجة', day: null, amount: 0, accountId: 'cash' });
 for (const [date, amount] of [['2026-10-31', 30000], ['2026-11-01', 50000], ['2026-11-03', 25000]]) {
   s = L.addTransaction(s, { type: 'income', accountId: 'cash', sourceId: 'spouse', date, amount }, opts).state;
 }
 assert.deepEqual(L.incomeStatus(s, '2026-11', opts), []);
 assert.deepEqual(L.incomeBySource(s, '2026-11'), [{ name: 'مساهمة الزوجة', amount: 75000 }]);
 assert.deepEqual(L.incomeBySource(s, '2026-10'), [{ name: 'مساهمة الزوجة', amount: 30000 }]);
 s = L.removeIncomeSource(s, 'spouse');
 assert.deepEqual(L.incomeBySource(s, '2026-11'), [{ name: 'مساهمة الزوجة', amount: 75000 }]);
});
