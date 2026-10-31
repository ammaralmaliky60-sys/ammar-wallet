'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const E=require('../engine.js');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const day='2026-10-31',month='2026-10';
const copy=x=>JSON.parse(JSON.stringify(x));
const categories=[
 {id:'home',label:'المنزل',kind:'spend',color:'#aabbcc'},
 {id:'vegetables',label:'الخضروات',kind:'spend',color:'#99bb88'},
 {id:'kids',label:'الأطفال',kind:'spend',color:'#bbaa99'},
 {id:'emergency',label:'الطوارئ',kind:'emergency',color:'#999999'}
];
const quickSource=app.slice(app.indexOf('function quickExpenseBuild('),app.indexOf('function wfLivingQuick(){'));
const livingSource=app.slice(app.indexOf('function livingBudgetSummary('),app.indexOf('function livingNeeds('));
const projectionSource=app.slice(app.indexOf('function monthlyCommitmentProjection('),app.indexOf('function workflowPage(){'));
const dup=(st,op)=>st.transactions.some(t=>t.type==='expense'&&t.walletId===op.walletId&&t.date===op.date&&
 t.amount===op.amount&&t.method===op.method&&(t.note||'')===(op.note||''));
const base=()=>{
 const st=E.initial();st.demo=false;st.cycle.start=month+'-01';return st;
};
const income=(st,money,method='card')=>E.commit(st,{id:E.uid(),type:'income',date:day,amount:money,method});
const item=(walletId,amount,note='')=>({walletId,amount,note});
const draft=(st,items,opts={})=>({base:JSON.stringify(st),date:day,method:'card',items,
 duplicateApproved:false,...opts});
const run=(state,d)=>{
 const env={E,structuredClone:copy,today:()=>day,livingCategories:()=>categories,duplicateExpense:dup,
  event:(st,t)=>E.commit(st,{id:E.uid(),date:day,...t})};
 return new Function('env','with(env){'+quickSource+';return quickExpenseBuild}')(env)(state,d);
};
const budget=(st)=>{
 const env={state:st,wfMonth:month,livingTargets:(m,x)=>x.settings.livingTargets?.[m]||{},
  livingAllCategories:()=>categories};
 return new Function('env','with(env){'+livingSource+';return livingBudgetSummary}')(env)(month,st);
};
const project=(st)=>{
 const wfData=st=>st.settings.twoStageWorkflow||{plans:{},completed:{}};
 const fields=[{key:'bankLoan',label:'سلفة المصرف'}, {key:'housing',label:'الإسكان'}];
 const env={state:st,wfMonth:month,E,wfData,monthlyAllFields:()=>fields,
  livingBudgetSummary:()=>budget(st),wfObId:(m,k)=>'wf_'+k+'_'+m.replace('-','_')};
 return new Function('env','with(env){'+projectionSource+';return monthlyCommitmentProjection}')(env)(st,month);
};
test('multi-item quick spend records separate expenses but exactly one confirmation batch',()=>{
 const st=income(base(),200000),raw=JSON.stringify(st);
 const result=run(st,draft(st,[item('home',35000,'أكل'),item('vegetables',55000,'خضروات')]));
 assert.equal(result.total,90000);
 assert.equal(result.funded,90000);
 assert.equal(result.next.transactions.filter(t=>t.type==='expense').length,2);
 assert.equal(result.next.transactions.filter(t=>t.type==='allocate').length,2);
 assert.equal(E.stats(result.next).total,110000);
 assert.equal(E.stats(result.next).unallocated,110000);
 assert.equal(JSON.stringify(st),raw);
});
test('shortfall allocations use existing category balance once across repeated items',()=>{
 let st=income(base(),200000);
 st=E.commit(st,{id:E.uid(),type:'allocate',walletId:'home',date:day,amount:35000});
 const result=run(st,draft(st,[item('home',30000,'أ'),item('home',20000,'ب')]));
 assert.equal(result.total,50000);assert.equal(result.funded,15000);
 assert.equal(result.next.transactions.filter(t=>t.type==='expense').length,2);
 assert.equal(E.stats(result.next).wallets.home,0);
 assert.equal(E.stats(result.next).unallocated,150000);
});
test('one failed item causes zero partial saves and preserves original state',()=>{
 const st=income(base(),50000),raw=JSON.stringify(st);
 assert.throws(()=>run(st,draft(st,[item('home',20000,'أ'),item('vegetables',40000,'ب')])),/رصيد|أكبر/);
 assert.equal(JSON.stringify(st),raw);
 assert.equal(E.stats(st).total,50000);
});
test('cash-only payment cannot silently use a card balance',()=>{
 const st=income(base(),100000),raw=JSON.stringify(st);
 assert.throws(()=>run(st,draft(st,[item('home',10000,'أ')],{method:'cash'})),/النقد/);
 assert.equal(JSON.stringify(st),raw);
});
test('emergency stays protected when user tries it as a quick item',()=>{
 const st=income(base(),90000);
 assert.throws(()=>run(st,draft(st,[item('emergency',1000,'أ')])),/محمي/);
});
test('an identical pair inside the same basket requires explicit confirmation',()=>{
 const st=income(base(),100000);
 const duplicate=[item('home',10000,'بقالة'),item('home',10000,'بقالة')];
 assert.throws(()=>run(st,draft(st,duplicate)),/مطابق/);
 const accepted=run(st,draft(st,duplicate,{duplicateApproved:true}));
 assert.equal(accepted.duplicates,1);
 assert.equal(accepted.next.transactions.filter(t=>t.type==='expense').length,2);
 assert.equal(E.stats(accepted.next).total,80000);
});
test('an existing expense cannot be recorded again without approving independence',()=>{
 let st=income(base(),100000);
 st=E.commit(st,{id:E.uid(),type:'allocate',walletId:'home',date:day,amount:12000});
 st=E.commit(st,{id:E.uid(),type:'expense',walletId:'home',date:day,amount:12000,method:'card',note:'سوق'});
 assert.throws(()=>run(st,draft(st,[item('home',12000,'سوق')])),/مطابق/);
});
test('draft is rejected after underlying ledger changes',()=>{
 let st=income(base(),200000);
 const saved=draft(st,[item('home',10000,'أ')]);
 st=income(st,20000);
 assert.throws(()=>run(st,saved),/تغيّرت/);
});
test('quick spend rejects a closed month or invalid number of items',()=>{
 const st=income(base(),100000),old=draft(st,[item('home',10000)]);
 st.settings.closedMonths={[month]:{closedAt:day}};
 assert.throws(()=>run(st,old),/تغيّرت|مفتوحة/);
 const open=income(base(),100000);
 assert.throws(()=>run(open,draft(open,[])),/بين 1 و20/);
 assert.throws(()=>run(open,draft(open,[item('home',0)])),/موجب/);
});
test('budget summary totals saved living targets, including hidden categories, not real cash',()=>{
 const st=base();
 st.settings.livingTargets={[month]:{home:75000,vegetables:125000,kids:60000,emergency:0}};
 const b=budget(st);assert.equal(b.total,260000);assert.equal(b.rows.length,3);assert.equal(b.hasPlan,true);
 assert.equal(E.stats(st).total,0);
});
test('gross total subtracts fixed commitments and the configured monthly living budget',()=>{
 let st=income(base(),1663000);
 st.settings.twoStageWorkflow={plans:{[month]:{bankLoan:385000,housing:320000}},completed:{}};
 st.settings.livingTargets={[month]:{home:75000,vegetables:125000,kids:60000}};
 const before=JSON.stringify(st),p=project(st);
 assert.equal(p.plannedTotal,705000);
 assert.equal(p.livingTotal,260000);
 assert.equal(p.combinedTotal,965000);
 assert.equal(p.grossAfterAll,698000);
 assert.equal(JSON.stringify(st),before);
});
test('monthly living budget is never added as a new obligation or a financial movement',()=>{
 let st=income(base(),720000);
 st.settings.livingTargets={[month]:{home:385000}};
 const p=project(st);
 assert.equal(p.plannedTotal,0);assert.equal(p.livingTotal,385000);
 assert.equal(p.combinedTotal,385000);assert.equal(p.grossAfterAll,335000);
 assert.equal(st.obligations.length,0);
 assert.equal(E.stats(st).total,720000);
});
test('multi-item UI and monthly budget totals remain visible in app',()=>{
 for(const text of ['function quickExpenseEditor(', 'function quickExpenseBuild(', 'مراجعة مجموع الصرف',
  'إضافة بند آخر','تفاصيل ميزانية المعيشة','مجموع المطلوب للشهر',
  'إجمالي ميزانية المعيشة لهذا الشهر'])assert.ok(app.includes(text));
});
