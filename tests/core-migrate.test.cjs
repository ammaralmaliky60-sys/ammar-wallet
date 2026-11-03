'use strict';
// Version 2 (envelope accounting) -> version 3 (direct household ledger).
// The fixture was produced by the original v2 engine and covers every v2 transaction type.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('../src/core/migrate.js'),L=require('../src/core/ledger.js');
const v2=()=>JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','v2-household.json'),'utf8'));
const run=()=>M.fromV2(v2(),{today:'2026-11-03'});

test('the migrated ledger is valid and the money is exactly where it was',()=>{
 const {state,report}=run();
 assert.ok(L.validate(state));
 const b=L.balances(state).accounts;
 assert.deepEqual({cash:b.cash,card:b.card},{cash:349500,card:1570000},'values printed by the original engine');
 assert.deepEqual(report.balances,{cash:349500,card:1570000});
});

test('the input data is not modified',()=>{
 const original=v2(),copy=JSON.stringify(original);
 M.fromV2(original,{today:'2026-11-03'});
 assert.equal(JSON.stringify(original),copy);
});

test('opening-balance entries become account opening balances, not income',()=>{
 const {state}=run();
 assert.deepEqual(state.accounts.map(a=>[a.id,a.opening]),[['cash',150000],['card',400000]]);
 assert.ok(!state.transactions.some(t=>/رصيد البداية/.test(t.note)));
 assert.equal(L.monthSummary(state,'2026-09',{today:'2026-11-03'}).income,850000,'September income is the salary only');
});

test('only money movements are kept; earmarking steps are dropped and counted',()=>{
 const {state,report}=run();
 const types=state.transactions.reduce((m,t)=>(m[t.type]=(m[t.type]||0)+1,m),{});
 assert.deepEqual(types,{income:4,expense:7,transfer:1});
 assert.deepEqual(report.skipped,{opening:2,allocate:5,reserve:2,unreserve:1,withheld:1,transfer:1,release:1});
});

test('commitment payments become expenses in «التزامات وأقساط» named after the commitment',()=>{
 const {state}=run(),rent=state.transactions.find(t=>t.id==='v2tx12');
 assert.equal(rent.type,'expense');assert.equal(rent.categoryId,'bills');assert.equal(rent.note,'الإيجار');
 assert.equal(state.categories.find(c=>c.id==='bills').name,'التزامات وأقساط');
});

test('categories keep their names, colours and the latest monthly budgets',()=>{
 const {state}=run(),c=Object.fromEntries(state.categories.map(x=>[x.id,x]));
 assert.deepEqual(state.categories.map(x=>x.id),['home','vegetables','kids','emergency','personal','dining','bills','other']);
 assert.equal(c.home.budget,250000);assert.equal(c.kids.budget,80000);assert.equal(c.vegetables.budget,60000);
 assert.equal(c.vegetables.color,'#54A981');assert.equal(c.vegetables.icon,'cart');
 assert.equal(c.home.icon,'home');assert.equal(c.kids.icon,'kids');
 assert.equal(c.dining.archived,false,'a wallet that was spent from stays visible');
 assert.equal(c.emergency.name,'الطوارئ','kept because money was spent from it');
});

test('expenses keep their category, account, date and note',()=>{
 const {state}=run(),t=state.transactions.find(x=>x.id==='v2tx25');
 assert.deepEqual({type:t.type,date:t.date,amount:t.amount,accountId:t.accountId,categoryId:t.categoryId,note:t.note},
  {type:'expense',date:'2026-11-01',amount:15000,accountId:'cash',categoryId:'dining',note:'غداء'});
});

test('income sources keep their expected day with the last received amount and account',()=>{
 const {state}=run(),s=Object.fromEntries(state.incomeSources.map(x=>[x.id,x]));
 assert.deepEqual(s.salary,{id:'salary',name:'الراتب الشهري',day:22,amount:850000,accountId:'card',archived:false});
 assert.deepEqual(s.incentives,{id:'incentives',name:'الحوافز الشهرية',day:10,amount:150000,accountId:'cash',archived:false});
 const other=state.transactions.find(t=>t.id==='v2tx18');
 assert.equal(other.sourceId,null);assert.equal(other.note,'أخرى');
});

test('the cash withdrawal becomes a transfer between accounts',()=>{
 const {state}=run(),t=state.transactions.find(x=>x.id==='v2tx16');
 assert.deepEqual({type:t.type,accountId:t.accountId,toAccountId:t.toAccountId,amount:t.amount},{type:'transfer',accountId:'card',toAccountId:'cash',amount:100000});
});

test('settings carry over; the month starts on day 1 until the user changes it',()=>{
 const {state}=run();
 assert.deepEqual(state.settings,{name:'عمار',currency:'IQD',digits:'en',monthStartDay:1});
 assert.equal(state.meta.migratedFrom.version,2);
});

test('a mismatch between old and new balances stops the migration',()=>{
 const bad=v2();bad.transactions.push({id:'odd',type:'expense',date:'2026-10-01',amount:1,walletId:'home',method:'wallet'});
 assert.throws(()=>M.fromV2(bad,{today:'2026-11-03'}));
});

test('files that are not version 2 are refused',()=>{
 assert.throws(()=>M.fromV2({version:3,transactions:[],wallets:[]}),/الإصدار السابق/);
 assert.throws(()=>M.fromV2(null),/الإصدار السابق/);
 assert.equal(M.isV2(v2()),true);
});
