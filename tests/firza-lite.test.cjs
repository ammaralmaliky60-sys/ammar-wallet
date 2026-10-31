'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../engine.js'),S=require('../schedule.js');
const get=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const app=get('app.js'),html=get('index.html'),sw=get('sw.js'),css=get('firza-lite.css');
const month='2026-10',day='2026-10-31';
const initial=()=>{const st=E.initial();st.demo=false;st.cycle.start='2026-10-01';st.settings.wfDefaultIncomeMode='salary-only';st.settings.wfIncomeModes={[month]:'salary-only'};return st};
const addIncome=(st,n,source='salary')=>E.commit(st,{id:E.uid(),type:'income',date:day,amount:n,method:'card',sourceId:source,incomePeriod:month,note:source});
const sourceBody=(start,end)=>app.slice(app.indexOf(start),app.indexOf(end,app.indexOf(start)));
function prefs(store={}){
 const localStorage={getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,setItem:(k,v)=>{store[k]=v}};
 const ctx={localStorage,location:{hash:'#dashboard'},render:()=>{},toast:()=>{}};
 return new Function('env','with(env){'+sourceBody("const FIRZA_VIEW_KEY=", 'function simpleFinancialNumbers(')+
  ';return {firzaViewMode,setFirzaViewMode,SIMPLE_NAVS}}')(ctx);
}
function numbers(st,overrides={}){
 const env={state:st,today:()=>day,E,
  monthlyCommitmentProjection:()=>({uncovered:overrides.uncovered??0}),
  livingBudgetSummary:()=>({total:overrides.budget??0})};
 return new Function('env','with(env){'+sourceBody('function simpleFinancialNumbers(','function simpleDashboardPage(){')+
 ';return simpleFinancialNumbers;}')(env)(st,month);
}
test('Lite is default; advanced selection is separate from the accounting state',()=>{
 const store={},v=prefs(store),account=initial(),raw=JSON.stringify(account);
 assert.equal(v.firzaViewMode(),'simple');
 assert.deepEqual(v.SIMPLE_NAVS.map(x=>x[0]),['dashboard','fixed','living','reports']);
 v.setFirzaViewMode('advanced');
 assert.equal(store['firza-view-mode-v1'],'advanced');
 assert.equal(v.firzaViewMode(),'advanced');
 assert.equal(JSON.stringify(account),raw);
 v.setFirzaViewMode('simple');assert.equal(v.firzaViewMode(),'simple');
});
test('Lite free balance subtracts only unpaid/unreserved fixed obligations without changing cash',()=>{
 let st=addIncome(initial(),720000);
 st=E.commit(st,{id:E.uid(),type:'allocate',date:day,amount:120000,walletId:'home'});
 const before=JSON.stringify(st),d=numbers(st,{uncovered:218000,budget:300000});
 assert.equal(d.stats.total,720000);assert.equal(d.stats.unallocated,600000);
 assert.equal(d.ready,382000);assert.equal(d.shortage,0);
 assert.equal(d.plan.total,300000);assert.equal(JSON.stringify(st),before);
});
test('Lite never displays a negative spendable balance if debts exceed free cash',()=>{
 const st=addIncome(initial(),100000),n=numbers(st,{uncovered:180000});
 assert.equal(n.ready,0);assert.equal(n.shortage,80000);assert.equal(E.stats(st).total,100000);
});
test('Lite layout keeps four main tabs, visible quick spend, and advanced more menu',()=>{
 for(const name of ['dashboard','fixed','living','reports'])assert.ok(html.includes('data-neo-page="'+name+'"'),name);
 assert.match(html,/fz-lite-dock-fixed/);
 assert.match(html,/data-action="wf-living-quick"/);
 assert.match(html,/id="thukhrMoreButton"/);
 assert.match(html,/fz-lite-settings-action/);
 assert.match(css,/data-firza-view="simple"/);
 assert.match(css,/data-firza-view="advanced"/);
 assert.match(css,/\.fz-lite-hero/);
 assert.match(css,/@media\(max-width:760px\)/);
});
test('settings expose working simple/advanced toggles and retain backups and financial reset',()=>{
 for(const text of ['function setFirzaViewMode(', "'firza-view':setFirzaViewMode", 'الوضع البسيط',
  'الوضع المتقدم','function openFinancialResetFinal(', 'function simpleSetupStart(',
  'function simpleBudgetEdit(', 'function quickExpenseBuild('])assert.ok(app.includes(text),text);
 assert.match(app,/FIRZA_VIEW_KEY='firza-view-mode-v1'/);
 assert.match(app,/BASE_KEY='mizan-finance-v2'/);
});
test('one-screen setup is only invoked on a fresh profile in simple mode',()=>{
 assert.match(app,/if\(needsFirstSetup&&!storageError&&!brokenRaw\)/);
 assert.match(app,/firzaViewMode\(\)==='simple'\)simpleSetupStart\(\);else setupStart\(\)/);
 assert.match(app,/simpleSetupStart\(\)\{/);
 assert.match(app,/state\.transactions\.length\|\|state\.obligations\.length\|\|state\.history\.length/);
 assert.match(app,/رصيد البداية الموجود فعلياً/);
});
test('salary-only mode still blocks accidental incentive registration in Lite',()=>{
 const st=initial();let modalCalled=false;
 const env={state:st,today:()=>day,S,E,
  wfIncomeMode:()=> 'salary-only',modal:()=>{modalCalled=true}};
 const fn=new Function('env','with(env){'+sourceBody('function simpleReceiveIncome(','function simpleSetupStart(){')+
 ';return simpleReceiveIncome}')(env);
 assert.throws(()=>fn('incentives'),/راتباً فقط/);
 assert.equal(modalCalled,false);
});
test('Lite salary receipt posts exactly one auto-paid commitment without extra approval',()=>{
 let st=initial();st.settings.wfFields=[{key:'loan',label:'سلفة',stage:'salary',autoDeduct:true,autoMethod:'receipt'}];
 st.settings.twoStageWorkflow={plans:{[month]:{loan:218000}},completed:{}};
 const original=JSON.stringify(st),ctx={state:st,submit:null};
 const autoSource=sourceBody('function autoFixedPlanShare(','function smartBuild(original,d){');
 const autoEnv={E,monthlyAllFields:s=>s.settings.wfFields||[],
  wfData:s=>s.settings.twoStageWorkflow||{plans:{},completed:{}},
  wfIncomeMode:(m,s)=>s.settings.wfIncomeModes?.[m]||s.settings.wfDefaultIncomeMode||'both',
  wfObId:(m,k)=>'wf_'+k+'_'+m.replace('-','_'),
  event:(s,t)=>E.commit(s,{id:E.uid(),...t})};
 const auto=new Function('env','with(env){'+autoSource+';return autoFixedSettlement}')(autoEnv);
 const env={S,E,get state(){return ctx.state},today:()=>day,
  wfIncomeMode:(m,s=ctx.state)=>s.settings.wfIncomeModes?.[m]||'salary-only',
  amount:raw=>{const n=Number(raw);if(!Number.isSafeInteger(n)||n<=0)throw Error('invalid');return n},
  sourceId:'salary',unit:()=> 'د.ع',
  modal:(title,sub,body,callback)=>{ctx.submit=callback;},
  amountField:()=>'<input>',select:()=>'<select>',methodOptions:[],
  field:()=>'<input>',autoFixedSettlement:auto,
  event:(s,t)=>E.commit(s,{id:E.uid(),...t}),
  act:(fn)=>{ctx.state=fn(JSON.parse(JSON.stringify(ctx.state)));E.validate(ctx.state);}};
 const receive=new Function('env','with(env){'+sourceBody('function simpleReceiveIncome(','function simpleSetupStart(){')+
 ';return simpleReceiveIncome}')(env);
 receive('salary');
 assert.equal(JSON.stringify(st),original);
 assert.equal(ctx.submit!==null,true);
 ctx.submit({amount:'720000',method:'card'});
 assert.equal(E.stats(ctx.state).total,502000);
 assert.equal(ctx.state.transactions.filter(t=>t.type==='income').length,1);
 assert.equal(ctx.state.transactions.filter(t=>t.type==='pay').length,1);
 assert.equal(E.stats(ctx.state).paid.wf_loan_2026_10,218000);
 assert.throws(()=>receive('salary'),/مسجلة/);
});
test('Lite report retains month-specific accounting and PDF download access',()=>{
 assert.match(app,/function simpleReportPage\(/);
 assert.match(app,/const period=reportingPeriod\(month\)/);
 assert.match(app,/E\.statsAt\(state,period\.previous\)/);
 assert.match(app,/E\.statsAt\(state,period\.end\)/);
 assert.match(app,/data-action="wf-living-pdf"/);
});
test('Lite assets are cached together without changing finance engine or cache API',()=>{
 const version=html.match(/app\.js\?v=([^"']+)/)?.[1],
  stylesheet=html.match(/firza-lite\.css\?v=([^"']+)/)?.[1];
 assert.ok(version&&stylesheet);
 assert.ok(sw.includes('app.js?v='+version));
 assert.ok(sw.includes('firza-lite.css?v='+stylesheet));
 assert.match(sw,/caches\.open\(CACHE\)/);
});
