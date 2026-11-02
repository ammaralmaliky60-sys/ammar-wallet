'use strict';
// Read-only insights behind the Lite home, commitments and report pages.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../engine.js');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const living=read('app/living.js'),lite=read('app/lite.js');
const insights=living.slice(living.indexOf('/* Read-only insights'));
const month='2026-10',day='2026-10-20';

function api(state){
 const txLabel=t=>({income:['دخل مستلم','راتب','income'],expense:[t.note||'مصروف','','wallet'],pay:['سداد التزام','الإيجار','check']})[t.type]||['حركة','','ledger'];
 return new Function('env','with(env){'+living+';return {categoryInfo,categoryColor,spendingByCategory,recentActivity,spendingPace,monthDays}}')(
  {state,wfMonth:month,txLabel});
}
function ledger(){
 let st=E.initial();st.demo=false;st.cycle.start='2026-10-01';
 const c=(t,date=day)=>{st=E.commit(st,{id:E.uid(),date,...t})};
 c({type:'income',amount:500000,method:'card',sourceId:'salary',incomePeriod:month},'2026-10-01');
 c({type:'allocate',amount:200000,walletId:'home'},'2026-10-01');
 c({type:'allocate',amount:100000,walletId:'kids'},'2026-10-01');
 c({type:'expense',amount:30000,walletId:'home',method:'card',note:'خضار'},'2026-10-05');
 c({type:'expense',amount:70000,walletId:'kids',method:'card',note:'ملابس'},'2026-10-06');
 c({type:'expense',amount:20000,walletId:'home',method:'card',note:'خبز'},'2026-10-06');
 return st;
}

test('spending is grouped per category, largest first, with shares that add up',()=>{
 const st=ledger(),{spendingByCategory}=api(st),{total,rows}=spendingByCategory(st,month);
 assert.equal(total,120000);
 assert.deepEqual(rows.map(r=>[r.id,r.amount]),[['kids',70000],['home',50000]]);
 assert.ok(Math.abs(rows.reduce((s,r)=>s+r.share,0)-1)<1e-9);
 assert.equal(rows[0].label,'الأطفال','labels come from the living categories');
 assert.match(rows[0].color,/^#[0-9a-f]{6}$/i);
 assert.deepEqual(spendingByCategory(st,'2026-09'),{total:0,rows:[]});
});

test('unknown categories get a neutral label and no colour',()=>{
 const st=ledger(),{categoryInfo}=api(st);
 assert.deepEqual(categoryInfo('missing',st),{id:'missing',label:'قسم محفوظ سابقاً',color:''});
});

test('recent activity lists income, expenses and payments newest first, limited',()=>{
 const st=ledger(),{recentActivity}=api(st),items=recentActivity(st,month,3);
 assert.equal(items.length,3);
 assert.deepEqual(items.map(i=>i.date),['2026-10-06','2026-10-06','2026-10-05']);
 assert.equal(items[0].label,'خبز','same-day entries keep their recorded order (latest first)');
 assert.equal(items[0].detail,'المنزل');
 assert.equal(items[0].sign,-1);
 assert.ok(recentActivity(st,month,10).every(i=>['income','expense','pay'].includes(i.type)),'allocations are not activity');
 assert.equal(recentActivity(st,month,10).find(i=>i.type==='income').sign,1);
});

test('spending pace compares the month elapsed with the budget used',()=>{
 const {spendingPace,monthDays}=api(ledger());
 assert.equal(monthDays('2026-02'),28);assert.equal(monthDays('2028-02'),29);
 const ok=spendingPace(310000,100000,'2026-10','2026-10-16');
 assert.equal(ok.status,'ok');assert.equal(ok.daysLeft,16);assert.equal(ok.daily,13125);
 assert.equal(spendingPace(310000,200000,'2026-10','2026-10-05').status,'fast');
 const over=spendingPace(100000,130000,'2026-10','2026-10-20');
 assert.equal(over.status,'over');assert.equal(over.daily,0);assert.equal(over.remaining,0);assert.equal(over.over,30000);
 assert.equal(spendingPace(0,5000,'2026-10','2026-10-20').status,'none');
 const past=spendingPace(100000,40000,'2026-09','2026-10-20');
 assert.equal(past.elapsed,100);assert.equal(past.daysLeft,1,'a finished month never divides by zero');
});

test('insights never write to the ledger or storage',()=>{
 assert.doesNotMatch(insights,/localStorage|save\(|commitEvent\(|E\.commit\(|\.push\(/);
 const st=ledger(),before=JSON.stringify(st),a=api(st);
 a.spendingByCategory(st,month);a.recentActivity(st,month);a.categoryInfo('home',st);
 assert.equal(JSON.stringify(st),before);
});

test('the greeting escapes the saved name',()=>{
 const body=lite.slice(lite.indexOf('function greeting('),lite.indexOf('const PACE_STATUS'));
 const safe=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const greeting=new Function('state','safe',body+';return greeting')({settings:{name:'<img src=x onerror=alert(1)>'}},safe);
 assert.doesNotMatch(greeting(),/<img/);
 assert.match(greeting(),/&lt;img/);
});

test('signed amounts put the sign after the number in source order (renders on its left in RTL)',()=>{
 const body=lite.slice(lite.indexOf('function signedMoney('),lite.indexOf('function relativeDay('));
 const signed=new Function('fmt','unit',body+';return signedMoney')(n=>String(n),()=>'د.ع');
 assert.equal(signed(150000,'+'),'<span class="num">150000</span><span class="fz-sign">+</span> <small>د.ع</small>');
 assert.equal(signed(5,''),'<span class="num">5</span> <small>د.ع</small>');
});
