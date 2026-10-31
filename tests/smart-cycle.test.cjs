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
 const api=new Function('env','with(env){'+source+';return {smartBuild,smartStage,smartPrior,fundLivingTargets,workflowSettlementSnapshot,monthlyCommitmentProjection}}')(env);
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
 assert.equal(result.funding.shortfall,30000);
 assert.equal(result.next.settings.livingTargets[month].home,400000);
 assert.equal(result.after.card,720000);
 assert.equal(result.after.unallocated,370000);
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
test('385000 budget with 70000 available waits for 315000 other income',()=>{
 const st=base(),data=draft(st,{plan:{bankLoan:218000,housing:650000,split:0},targets:{home:385000}});
 const result=fixture(st).smartBuild(st,data);
 assert.equal(result.funding.shortfall,315000);
 assert.equal(result.funding.pending,385000);
 assert.equal(result.after.unallocated,70000);
 assert.equal(result.next.settings.livingTargets[month].home,385000);
 assert.equal(result.totals.living,0);
 const withOther=E.commit(result.next,{type:'income',id:E.uid(),date:day,amount:315000,method:'card',note:'أخرى'});
 const financed=fixture(withOther).fundLivingTargets(withOther,{home:385000},month);
 assert.equal(financed.allocated,385000);
 assert.equal(financed.pending,0);
 const after=E.stats(financed.next);
 assert.equal(after.unallocated,0);
 assert.equal(after.wallets.home,385000);
 assert.equal(after.card,1035000);
 assert.equal(after.reserved['wf_housing_'+month.replace('-','_')],650000);
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

test('settlement overview balances screenshot numbers without treating allocation as spending',()=>{
 let st=base();
 st.settings.wfIncomeModes={[month]:'salary-only'};
 st.settings.twoStageWorkflow={plans:{},completed:{[month]:{salary:{mode:'smart'}}}};
 st=E.commit(st,{type:'income',id:E.uid(),amount:1663000,method:'card',date:day});
 st=E.commit(st,{type:'allocate',id:E.uid(),amount:368000,walletId:'home',date:day});
 const r=fixture(st).workflowSettlementSnapshot(st,month);
 assert.equal(r.total,1663000);
 assert.equal(r.allocated,368000);
 assert.equal(r.reserved,0);
 assert.equal(r.remaining,1295000);
 assert.equal(r.completed,true);
 assert.equal(r.total,r.allocated+r.reserved+r.remaining);
});
test('settlement balance responds to reservation/payment; source withholding is documentation only',()=>{
 let st=base();
 st.settings.wfIncomeModes={[month]:'salary-only'};
 st=E.commit(st,{type:'income',id:E.uid(),amount:720000,method:'card',date:day});
 st.obligations.push({id:'loan',name:'سلفة',amount:250000,due:day,recurring:false});
 st=E.commit(st,{type:'reserve',id:E.uid(),obligationId:'loan',amount:250000,date:day});
 let r=fixture(st).workflowSettlementSnapshot(st,month);
 assert.equal(r.remaining,470000);
 assert.equal(r.reserved,250000);
 assert.equal(r.completed,false);
 st=E.commit(st,{type:'pay',id:E.uid(),obligationId:'loan',amount:250000,method:'card',date:day});
 r=fixture(st).workflowSettlementSnapshot(st,month);
 assert.equal(r.total,470000);
 assert.equal(r.remaining,470000);
 assert.equal(r.reserved,0);
 st.obligations.push({id:'deduction',name:'قسط مستقطع',amount:218000,due:day,recurring:false});
 st=E.commit(st,{type:'withheld',id:E.uid(),obligationId:'deduction',amount:218000,note:'خصم قبل إيداع الراتب',date:day});
 const after=fixture(st).workflowSettlementSnapshot(st,month);
 assert.equal(after.total,r.total);
 assert.equal(after.remaining,r.remaining);
});
test('the settlement result is prominent and the savings allocations are separated',()=>{
 assert.match(app,/class="wf-settlement-result"/);
 assert.match(app,/المتبقي بعد التسوية والتخصيص/);
 assert.match(app,/مخصص للأقسام/);
 assert.match(app,/محجوز للالتزامات/);
});

test('unsettled monthly plan reduces projected remainder without changing journal',()=>{
 let st=base();
 st.settings.twoStageWorkflow={plans:{[month]:{bankLoan:218000,housing:350000,split:0}},completed:{}};
 st=E.commit(st,{type:'income',id:E.uid(),date:day,method:'card',amount:720000});
 const raw=JSON.stringify(st),p=fixture(st).monthlyCommitmentProjection(st,month);
 assert.equal(p.count,2);assert.equal(p.uncovered,568000);assert.equal(p.remainingAfter,152000);
 assert.equal(E.stats(st).unallocated,720000);
 assert.equal(JSON.stringify(st),raw);
});
test('paid withheld and reserved amounts do not double reduce predicted balance',()=>{
 let st=base();
 st.settings.twoStageWorkflow={plans:{[month]:{bankLoan:200000,housing:300000,split:0}},completed:{}};
 st=E.commit(st,{type:'income',id:E.uid(),date:day,method:'card',amount:900000});
 st.obligations.push({id:'wf_bankLoan_2026_10',name:'قسط مستقطع',amount:200000,due:day,recurring:false});
 st.obligations.push({id:'wf_housing_2026_10',name:'البيت',amount:300000,due:day,recurring:false});
 st=E.commit(st,{type:'withheld',id:E.uid(),date:day,obligationId:'wf_bankLoan_2026_10',amount:200000,note:'استقطاع موثق قبل الإيداع'});
 st=E.commit(st,{type:'reserve',id:E.uid(),date:day,obligationId:'wf_housing_2026_10',amount:200000});
 let p=fixture(st).monthlyCommitmentProjection(st,month);
 assert.equal(p.count,2);assert.equal(p.uncovered,100000);assert.equal(p.remainingAfter,600000);
 assert.equal(E.stats(st).unallocated,700000);
 st=E.commit(st,{type:'pay',id:E.uid(),date:day,obligationId:'wf_housing_2026_10',amount:200000,method:'card'});
 p=fixture(st).monthlyCommitmentProjection(st,month);
 assert.equal(p.uncovered,100000);assert.equal(p.remainingAfter,600000);
});
test('partial split settlement is counted once using full monthly obligation amount',()=>{
 let st=base();st.settings.twoStageWorkflow={plans:{[month]:{split:9001}},completed:{}};
 st=E.commit(st,{type:'income',id:E.uid(),date:day,method:'card',amount:30000});
 st.obligations.push({id:'wf_split_2026_10',name:'سلفة مقسمة',amount:9001,due:day,recurring:false});
 st=E.commit(st,{type:'withheld',id:E.uid(),date:day,obligationId:'wf_split_2026_10',amount:4500,note:'نصف القسط مستقطع من الحوافز'});
 const p=fixture(st,'both').monthlyCommitmentProjection(st,month);
 assert.equal(p.count,1);assert.equal(p.uncovered,4501);
 assert.equal(p.remainingAfter,25499);
});
test('month-based standalone obligations are included and earlier months excluded',()=>{
 let st=base();st=E.commit(st,{type:'income',id:E.uid(),date:day,method:'card',amount:200000});
 st.obligations.push({id:'current',name:'اشتراك',amount:30000,due:day,recurring:false});
 st.obligations.push({id:'old',name:'شهر سابق',amount:50000,due:'2026-09-15',recurring:false});
 st.obligations.push({id:'archived',name:'ملغي',amount:40000,due:day,recurring:false,archived:true});
 const p=fixture(st).monthlyCommitmentProjection(st,month);
 assert.equal(p.hasPlan,false);assert.equal(p.count,1);assert.equal(p.uncovered,30000);assert.equal(p.remainingAfter,170000);
});
test('projection can signal uncovered monthly deficit without negative journal cash',()=>{
 let st=base();st.settings.twoStageWorkflow={plans:{[month]:{bankLoan:200000}},completed:{}};
 st=E.commit(st,{type:'income',id:E.uid(),date:day,method:'card',amount:125000});
 const p=fixture(st).monthlyCommitmentProjection(st,month);
 assert.equal(p.remainingAfter,-75000);assert.equal(p.uncovered,200000);
 assert.equal(E.stats(st).total,125000);
});
test('empty month shows no fictitious commitments',()=>{
 let st=base();st=E.commit(st,{type:'income',id:E.uid(),date:day,method:'card',amount:95000});
 const p=fixture(st).monthlyCommitmentProjection(st,month);
 assert.equal(p.count,0);assert.equal(p.uncovered,0);assert.equal(p.remainingAfter,95000);
});
test('projection appears on both workflow and final review with drilldown',()=>{
 assert.match(app,/class="wf-commitment-projection/);
 assert.match(app,/تفاصيل احتساب/);
 assert.match(app,/المتبقي المتوقع بعد جميع الالتزامات الشهرية/);
 assert.match(app,/التزامات شهرية لم تُغطَّ بعد/);
 assert.match(app,/wfMonth===today\(\)\.slice\(0,7\)\?'':'hidden'/);
});
