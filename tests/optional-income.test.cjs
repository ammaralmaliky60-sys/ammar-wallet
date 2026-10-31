'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const modeSrc=app.slice(app.indexOf('function wfIncomeMode('),app.indexOf('function wfIncomeModePicker('));
const amountSrc=app.slice(app.indexOf('function wfAmount('),app.indexOf('function wfStageSummary('));
const stageSrc=app.slice(app.indexOf('function wfStageSummary('),app.indexOf('function workflowPage('));
const copy=x=>JSON.parse(JSON.stringify(x));
const items=[
 {key:'housing',label:'السكن',stage:'incentives',reserveOnly:false},
 {key:'loan',label:'القسط',stage:'salary',reserveOnly:true},
 {key:'split',label:'مقسّم',stage:'split',reserveOnly:false}
];
function setup(st){
 const get=()=>items,hidden=()=>[];
 const wfData=x=>x.settings.twoStageWorkflow||{plans:{},completed:{}};
 return new Function('state','wfMonth','wfData','monthlyAllFields','monthlyHiddenFields',
  modeSrc+amountSrc+'return {wfIncomeMode,wfFreezeIncomeMode,wfAmount}')(st,'2026-10',wfData,get,hidden);
}
const blank=()=>({settings:{twoStageWorkflow:{plans:{'2026-09':{housing:5000}},completed:{}}},transactions:[]});
test('existing budget month remains dual income by default',()=>{
 assert.equal(setup(blank()).wfIncomeMode('2026-09'),'both');
});
test('salary-only is the default for future new months after choice',()=>{
 const s=blank();s.settings.wfDefaultIncomeMode='salary-only';s.settings.wfIncomeModeSince='2026-10';
 assert.equal(setup(s).wfIncomeMode('2026-10'),'salary-only');
 assert.equal(setup(s).wfIncomeMode('2026-09'),'both');
});
test('salary-only puts full monthly commitments on salary stage',()=>{
 const s=blank();s.settings.wfIncomeModes={'2026-10':'salary-only'};
 const a=setup(s),p={housing:10000,loan:20000,split:9001};
 assert.equal(a.wfAmount(p,'incentives').length,0);
 assert.equal(a.wfAmount(p,'salary').reduce((n,x)=>n+x.amount,0),39001);
});
test('dual income preserves half split for an odd amount',()=>{
 const a=setup(blank()),p={housing:10000,loan:20000,split:9001};
 assert.equal(a.wfAmount(p,'incentives').reduce((n,x)=>n+x.amount,0),14500);
 assert.equal(a.wfAmount(p,'salary').reduce((n,x)=>n+x.amount,0),24501);
});
test('saving month profile does not modify transactions',()=>{
 const s=blank();s.settings.wfDefaultIncomeMode='salary-only';s.settings.wfIncomeModeSince='2026-10';
 s.transactions=[{id:'tx-1',type:'income',amount:1000}];const old=copy(s.transactions);
 setup(s).wfFreezeIncomeMode(s,'2026-10');
 assert.deepEqual(s.transactions,old);assert.equal(s.settings.wfIncomeModes['2026-10'],'salary-only');
});
test('salary stage enabled without bonus; dual stage keeps existing dependency',()=>{
 const s=blank(),S={receipts:(state,kind)=>kind==='salary'?[{amount:700000}]:[]};
 const mk=mode=>new Function('state','wfMonth','S','wfPlan','wfDone','wfAmount','btn','icon','money','safe','wfIncomeMode',
 stageSrc+'return wfStageSummary')(s,'2026-10',S,()=>({housing:10000}),()=>null,()=>[{amount:10000,label:'السكن'}],
 (x,l)=>'BUTTON:'+x,()=>'',String,String,()=>mode);
 assert.equal(mk('salary-only')('incentives'),'');
 assert.match(mk('salary-only')('salary'),/BUTTON:wf-salary-apply/);
 assert.doesNotMatch(mk('both')('salary'),/BUTTON:wf-salary-apply/);
});
test('PDF statement and scheduling select salary in solo mode',()=>{
 assert.match(app,/E\.periodReport\(state,wfMonth\)/);
 assert.match(app,/filter\(x=>wfIncomeMode\(p\)!=='salary-only'\|\|x.id!=='incentives'\)/);
});
