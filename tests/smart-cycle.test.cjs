'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../engine.js'),S=require('../schedule.js');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const source=app.slice(app.indexOf('function smartStage()'),app.indexOf('function workflowPage(){'));
const day='2026-10-31',month='2026-10',copy=o=>JSON.parse(JSON.stringify(o));
const fields=[
 {key:'bankLoan',label:'سلفة المصرف',stage:'salary'},
 {key:'housing',label:'مصرف البيت',stage:'salary'},
 {key:'split',label:'نصفان',stage:'split'}
];
const wfData=st=>st.settings.twoStageWorkflow||{plans:{},completed:{}};
const base=()=>{const st=E.initial();st.demo=false;st.cycle.start=month+'-01';return st};
function fixture(state,mode='salary-only'){
 let stage=mode==='salary-only'?'salary':'incentives';
 const env={state,month,wfMonth:month,E,S,today:()=>day,structuredClone:copy,money:String,
  wfIncomeMode:()=>mode,wfDone:k=>null,wfData,
  wfObId:(m,k)=>'wf_'+k+'_'+m.replace('-','_'),monthlyAllFields:()=>fields,monthlyFields:()=>fields,
  livingCategories:()=>[{id:'home',label:'المنزل',kind:'spend',color:'#abcdef'}],
  livingTargets:(m,st)=>st.settings.livingTargets?.[m]||{},
  livingNeeds:(targets,st)=>{const stats=E.stats(st),spent=st.transactions.filter(t=>t.type==='expense'&&t.walletId==='home'&&t.date.slice(0,7)===month).reduce((n,t)=>n+t.amount,0);
   const needed=Math.max(0,(targets.home||0)-spent-(stats.wallets.home||0));return {rows:[{id:'home',label:'المنزل',additional:needed}],additional:needed}},
  wfAmount:(plan,step)=>fields.map(o=>{const full=plan[o.key]||0;let part=0;
   if(mode==='salary-only')part=step==='salary'?full:0;
   else if(o.stage===step)part=full;
   else if(o.stage==='split')part=step==='incentives'?Math.floor(full/2):full-Math.floor(full/2);
   return {...o,key:o.key,amount:part,fullAmount:full};
  }).filter(o=>o.amount>0),
  event:(st,t)=>E.commit(st,{id:E.uid(),date:day,...t})};
 const api=new Function('env','with(env){'+source+';return {smartBuild,smartStage,smartPrior,fundLivingTargets}}')(env);
 return api;
}
const draft=(st,opts={})=>({base:JSON.stringify(st),month,mode:'salary-only',stage:'salary',existing:false,
 income:720000,method:'card',payMethod:'card',date:day,
 plan:{bankLoan:218000,housing:350000,split:0},targets:{home:100000},
 choices:{bankLoan:'withheld',housing:'reserve'},...opts});
test('single approval preserves net salary and allocates accurately',()=>{
 const st=base(),{next,after,totals,events}=fixture(st).smartBuild(st,draft(st));
 assert.equal(after.card,720000);assert.equal(after.total,720000);assert.equal(after.unallocated,270000);
 assert.equal(totals.income,720000);assert.equal(totals.withheld,218000);
 assert.equal(totals.reserved,350000);assert.equal(totals.living,100000);assert.equal(events,4);
 assert.equal(Object.values(after.withheld).reduce((n,v)=>n+v,0),218000);
 assert.equal(next.settings.twoStageWorkflow.completed[month].salary.mode,'smart');
});
test('preview does not mutate original balances or transactions',()=>{
 const st=base(),raw=JSON.stringify(st);fixture(st).smartBuild(st,draft(st));
 assert.equal(JSON.stringify(st),raw);
});
test('income already received is used without a second credit',()=>{
 let st=base();st=E.commit(st,{type:'income',date:day,method:'card',amount:720000,sourceId:'salary',incomePeriod:month});
 const data=draft(st,{existing:true});
 const result=fixture(st).smartBuild(st,data);
 assert.equal(result.totals.income,0);assert.equal(result.after.total,720000);
 assert.equal(result.next.transactions.filter(t=>t.type==='income').length,1);
});
test('insufficient funding preserves full budget without inventing income or cash',()=>{
 const st=base(),raw=JSON.stringify(st);
 const result=fixture(st).smartBuild(st,draft(st,{targets:{home:400000}}));
 assert.equal(JSON.stringify(st),raw);
 assert.equal(result.totals.living,0);
 assert.equal(result.funding.pending,400000);
 assert.equal(result.funding.shortfall,130000);
 assert.equal(result.next.settings.livingTargets[month].home,400000);
 assert.equal(result.after.card,720000);
 assert.equal(result.after.unallocated,270000);
 assert.equal(result.next.transactions.filter(t=>t.type==='allocate').length,0);
});
test('funding uses only confirmed available cash and does not duplicate allocation',()=>{
 const st=base(),out=fixture(st).smartBuild(st,draft(st));
 assert.equal(out.totals.living,100000);
 assert.equal(out.funding.pending,0);
 assert.equal(out.funding.shortfall,0);
 const funded=fixture(st).fundLivingTargets(out.next,{home:100000},month);
 assert.equal(funded.allocated,0);
 assert.equal(funded.next.transactions.length,out.next.transactions.length);
});
test('stale draft is rejected',()=>{
 const st=base(),d=draft(st);d.base='invalid';
 assert.throws(()=>fixture(st).smartBuild(st,d),/تغيّرت/);
});
test('double approval from same draft is rejected',()=>{
 const st=base(),d=draft(st),next=fixture(st).smartBuild(st,d).next;
 assert.throws(()=>fixture(next).smartBuild(next,d));
});
test('split incentive part remains half in dual-income mode',()=>{
 const st=base(),data=draft(st,{stage:'incentives',mode:'both',income:200000,
  plan:{bankLoan:0,housing:0,split:9001},targets:{home:10000},choices:{split:'reserve'}});
 const out=fixture(st,'both').smartBuild(st,data);
 assert.equal(out.totals.reserved,4500);assert.equal(out.totals.living,10000);
 assert.equal(out.next.settings.twoStageWorkflow.completed[month].incentives.summary.reserved,4500);
});
test('existing monthly plan remains unmodified for completed first stage',()=>{
 const st=base();st.settings.twoStageWorkflow={plans:{[month]:{bankLoan:218000,housing:350000,split:0}},completed:{[month]:{incentives:{mode:'smart'}}}};
 const d=draft(st,{plan:{bankLoan:218000,housing:350000,split:1}});
 assert.throws(()=>fixture(st).smartBuild(st,d),/خطة/);
});
test('source code saves only once after confirmation',()=>{
 assert.match(app,/act\(n=>smartBuild\(n,d\)\.next/);
 assert.match(app,/function smartReview\(d\)/);
 assert.match(app,/smart-cycle-advanced/);
});
