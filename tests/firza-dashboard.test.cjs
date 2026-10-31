'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../engine.js'),S=require('../schedule.js');
const file=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const app=file('app.js'),html=file('index.html'),css=file('firza-dashboard.css'),sw=file('sw.js');
const code=app.slice(app.indexOf('function dashboardFinancialSummary('),app.indexOf('function firzaMonthSelector('));
const month='2026-10',day='2026-10-31';
function base(){
 const s=E.initial();s.demo=false;s.cycle.start=month+'-01';return s;
}
function income(s,amount,source){
 return E.commit(s,{id:E.uid(),type:'income',amount,method:'card',date:day,sourceId:source,incomePeriod:month});
}
const categories=[{id:'home',label:'المنزل'},{id:'kids',label:'الأطفال'}];
function dashboard(st,mode='both'){
 const livingBudgetSummary=(period,s)=>{const targets=s.settings.livingTargets?.[period]||{};
  const rows=Object.entries(targets).map(([id,amount])=>({id,label:categories.find(x=>x.id===id)?.label||id,amount}));
  return {total:rows.reduce((n,r)=>n+r.amount,0),rows};
 };
 const monthlyCommitmentProjection=(s,period)=>{
  const plans=s.settings.twoStageWorkflow?.plans?.[period]||{};
  const entries=Object.entries(plans).map(([id,amount])=>({id,amount,covered:0,uncovered:amount}));
  const plannedTotal=entries.reduce((sum,r)=>sum+r.amount,0);
  const living=livingBudgetSummary(period,s);
  return {entries,plannedTotal,uncovered:plannedTotal,count:entries.length,
   livingTotal:living.total,combinedTotal:plannedTotal+living.total,
   grossAfterAll:E.stats(s).total-plannedTotal-living.total};
 };
 const wfIncomeMode=()=>mode;
 const env={state:st,today:()=>day,E,S,livingBudgetSummary,monthlyCommitmentProjection,wfIncomeMode};
 return new Function('env','with(env){'+code+';return dashboardFinancialSummary;}')(env)(st,month);
}
test('dashboard aggregates received salary and incentive without forecasting unreceived income',()=>{
 let s=base();s=income(s,720000,'salary');
 const m=dashboard(s);assert.equal(m.income.salary,720000);
 assert.equal(m.income.incentives,0);
 assert.equal(m.receipts.incentives.length,0);
 assert.equal(m.stats.total,720000);
 assert.equal(m.isSalaryOnly,false);
});
test('dashboard accounting shows real cash and separate nominal planned remainder',()=>{
 let s=base();s.settings.twoStageWorkflow={plans:{[month]:{loan:218000,rent:350000}},completed:{}};
 s.settings.livingTargets={[month]:{home:125000,kids:60000}};
 s=income(s,720000,'salary');s=income(s,750000,'incentives');
 s=E.commit(s,{id:E.uid(),type:'allocate',walletId:'home',amount:125000,date:day});
 const baseline=JSON.stringify(s),m=dashboard(s);
 assert.equal(m.income.salary,720000);assert.equal(m.income.incentives,750000);
 assert.equal(m.projection.plannedTotal,568000);assert.equal(m.living.total,185000);
 assert.equal(m.projection.grossAfterAll,717000);
 assert.equal(m.stats.total,1470000);assert.equal(m.stats.unallocated,1345000);
 assert.equal(m.allocated,125000);
 assert.equal(JSON.stringify(s),baseline);
});
test('monthly expenses are counted once and compared to saved categories only',()=>{
 let s=base();s.settings.livingTargets={[month]:{home:100000,kids:50000}};
 s=income(s,220000,'salary');
 s=E.commit(s,{id:E.uid(),type:'allocate',date:day,walletId:'home',amount:90000});
 s=E.commit(s,{id:E.uid(),type:'expense',date:day,walletId:'home',amount:30000,method:'card',note:'مشتريات'});
 const m=dashboard(s);
 assert.equal(m.spent,30000);assert.equal(m.livingSpent,30000);
 assert.equal(m.livingPct,20);
 assert.equal(m.monthRows.find(x=>x.id==='home').remaining,70000);
 assert.equal(m.stats.total,190000);
});
test('salary-only mode does not invent an incentive receipt',()=>{
 const s=income(base(),720000,'salary');
 const m=dashboard(s,'salary-only');
 assert.equal(m.isSalaryOnly,true);assert.equal(m.receipts.incentives.length,0);assert.equal(m.income.incentives,0);
});
test('dashboard markup offers individual pages and modern money views',()=>{
 for(const text of ['function dashboardPage(', 'function incomeStagePage(', 'function fixedCommitmentsPage(',
 'الرصيد الفعلي الحالي','المتبقي التخطيطي','تفاصيل الالتزامات','ميزانية','الدورة الذكية',
 'fz-dashboard-budget','fz-dashboard-kpis','fz-dashboard-streams']){
  assert.ok(app.includes(text),text+' is missing');
 }
 assert.match(app,/dashboard:dashboardPage/);
 assert.match(app,/salary:\(\)=>incomeStagePage\('salary'\)/);
 assert.match(app,/incentives:\(\)=>incomeStagePage\('incentives'\)/);
 assert.match(app,/fixed:fixedCommitmentsPage/);
});
test('mobile dashboard and more menu navigate to all independent tabs',()=>{
 assert.match(html,/data-neo-page="dashboard"/);
 for(const link of ['#salary','#incentives','#fixed','#workflow'])assert.ok(html.includes('href="'+link+'"'),link);
 assert.match(html,/firza-dashboard\.css\?v=/);
 assert.match(css,/\.fz-dashboard-kpis/);
 assert.match(css,/@media\(max-width:600px\)/);
});
test('versioned dashboard scripts and styles are present in offline cache',()=>{
 const appv=html.match(/app\.js\?v=([^"']+)/)?.[1],cssv=html.match(/firza-dashboard\.css\?v=([^"']+)/)?.[1];
 assert.ok(appv&&cssv);
 assert.ok(sw.includes('app.js?v='+appv));
 assert.ok(sw.includes('firza-dashboard.css?v='+cssv));
});
test('financial data storage and reset guard remain untouched by read-only dashboards',()=>{
 assert.match(app,/BASE_KEY='mizan-finance-v2'/);
 assert.match(app,/function openFinancialResetFinal\(/);
 assert.match(app,/function quickExpenseBuild\(/);
 assert.match(app,/function monthlyCommitmentProjection\(/);
 assert.doesNotMatch(code,/localStorage|save\(|event\(|E\.commit\(/);
});
