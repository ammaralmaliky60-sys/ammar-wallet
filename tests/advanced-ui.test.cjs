'use strict';
// Advanced-mode ledger helpers: quick periods and day grouping.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const pages=read('app/pages.js'),shell=read('app/ui-shell.js'),core=read('app/core.js');
const slice=(src,start,end)=>src.slice(src.indexOf(start),src.indexOf(end,src.indexOf(start)));
const addDays=new Function(slice(core,'const addDays=','const diff=')+';return addDays')();

test('quick periods map to inclusive date ranges',()=>{
 const range=new Function('today','addDays',slice(pages,'function ledgerPeriodRange(','function ledgerPeriod(')+';return ledgerPeriodRange')(()=>'2026-11-02',addDays);
 assert.deepEqual(range('month','2026-11-02'),{from:'2026-11-01',to:'2026-11-02'});
 assert.deepEqual(range('week','2026-11-02'),{from:'2026-10-27',to:'2026-11-02'});
 assert.deepEqual(range('last-month','2026-11-02'),{from:'2026-10-01',to:'2026-10-31'});
 assert.deepEqual(range('last-month','2026-01-15'),{from:'2025-12-01',to:'2025-12-31'},'January looks back to December of the previous year');
 assert.deepEqual(range('last-month','2026-03-31'),{from:'2026-02-01',to:'2026-02-28'});
 assert.deepEqual(range('all','2026-11-02'),{from:'',to:''});
});

test('ledger groups by day, newest first, with one header per day',()=>{
 const rows=new Function('env','with(env){'+slice(shell,'function ledgerMobileRows(','function ledgerDetail(')+';return ledgerMobileRows}')({
  empty:()=>'EMPTY',today:()=>'2026-11-02',addDays,date:d=>'D'+d,ACTIVITY_SIGNS:{income:1,expense:-1,pay:-1},
  signedMoney:(n,s)=>s+n,activityEntry:t=>({label:t.id,detail:''}),activityRow:e=>`<row ${e.label}>`
 });
 const txs=[
  {id:'a',type:'expense',amount:10,date:'2026-11-02'},
  {id:'b',type:'income',amount:100,date:'2026-10-30'},// back-dated entry recorded later
  {id:'c',type:'expense',amount:5,date:'2026-11-02'},
  {id:'d',type:'allocate',amount:50,date:'2026-11-01'}
 ];
 const html=rows(txs);
 const headers=[...html.matchAll(/<header><strong>([^<]+)<\/strong>/g)].map(m=>m[1]);
 assert.deepEqual(headers,['اليوم','أمس','D2026-10-30']);
 assert.ok(html.indexOf('<row a>')<html.indexOf('<row c>'),'same-day rows keep the given (latest first) order');
 assert.match(html,/data-sign="out">−15</,'daily net counts only income, expenses and payments');
 assert.doesNotMatch(html.slice(html.indexOf('أمس'),html.indexOf('D2026-10-30')),/data-sign/,'allocation-only days show no net');
 assert.equal(rows([]),'EMPTY');
});

test('ledger quick period chips keep the original date filters as the source of truth',()=>{
 assert.match(pages,/id="fromFilter"/);assert.match(pages,/id="toFilter"/);
 assert.match(pages,/from\.dispatchEvent\(new Event\('input'/);
 assert.match(pages,/data-choice="scroll"/);
});
