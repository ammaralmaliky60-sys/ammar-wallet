'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../engine.js'),S=require('../schedule.js');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8'),month='2026-10',day='2026-10-31';
const code=app.slice(app.indexOf('function autoFixedPlanShare('),app.indexOf('function smartBuild(original,d){'));
const builder=()=>{
 const env={
  E,S,wfData:st=>st.settings.twoStageWorkflow||{plans:{},completed:{}},
  monthlyAllFields:st=>st.settings.wfFields||[],
  wfIncomeMode:(m,st)=>st.settings.wfIncomeModes?.[m]||st.settings.wfDefaultIncomeMode||'both',
  wfObId:(m,k)=>'wf_'+k+'_'+m.replace('-','_'),
  event:(st,event)=>E.commit(st,{id:E.uid(),...event})
 };
 return new Function('env','with(env){'+code+';return {autoFixedSettlement,ensureRecurringAutoPlan}}')(env);
};
const api=builder();
const base=(mode='salary-only')=>{
 const st=E.initial();st.demo=false;st.cycle.start='2026-10-01';st.cycle.days=60;
 st.settings.wfDefaultIncomeMode=mode;st.settings.wfIncomeModes={[month]:mode};
 return st;
};
const field=(key,stage,amount,autoDeduct=true,autoMethod='receipt')=>({key,label:key,stage,reserveOnly:false,autoDeduct,autoMethod,amount});
const configured=(st,fs,period=month)=>{
 st.settings.wfFields=fs.map(({amount,...other})=>other);
 st.settings.twoStageWorkflow={plans:{[period]:Object.fromEntries(fs.map(f=>[f.key,f.amount]))},completed:{}};
 return st;
};
const income=(st,amount,source='salary',method='card',period=month,date=day)=>
 E.commit(st,{id:E.uid(),type:'income',date,method,amount,sourceId:source,incomePeriod:period});
const result=(st,source='salary',period=month,method='card',date=day)=>api.autoFixedSettlement(st,source,period,method,date);
test('salary receipt debits one opted-in fixed item without extra confirmation',()=>{
 const st=configured(base(),[field('bankLoan','salary',218000)]);
 const next=income(st,720000),copy=JSON.stringify(st);
 const r=result(next);
 assert.equal(r.paid,218000);
 assert.equal(r.skipped.length,0);
 assert.equal(E.stats(r.next).total,502000);
 assert.equal(E.stats(r.next).paid.wf_bankLoan_2026_10,218000);
 assert.equal(r.next.transactions.filter(t=>t.type==='pay').length,1);
 assert.equal(r.next.settings.twoStageWorkflow.completed[month].salary.mode,'automatic');
 assert.equal(JSON.stringify(st),copy);
});
test('split commitment is debited half on each actual income, no second deduction',()=>{
 let st=configured(base('both'),[field('split','split',100001)]);
 st=income(st,300000,'incentives');
 let r=result(st,'incentives');assert.equal(r.paid,50000);
 assert.equal(E.stats(r.next).total,250000);
 st=income(r.next,500000,'salary');
 r=result(st,'salary');
 assert.equal(r.paid,50001);
 assert.equal(E.stats(r.next).paid.wf_split_2026_10,100001);
 assert.equal(E.stats(r.next).total,699999);
 const again=result(r.next,'salary');
 assert.equal(again.paid,0);
 assert.equal(JSON.stringify(again.next),JSON.stringify(r.next));
});
test('manual payroll withholding prevents a second automatic deduction',()=>{
 let st=configured(base(),[field('loan','salary',218000)]);
 st.obligations.push({id:'wf_loan_2026_10',name:'loan',amount:218000,due:day,recurring:false});
 st=E.commit(st,{id:E.uid(),type:'withheld',date:day,obligationId:'wf_loan_2026_10',amount:218000,note:'سبق الاستقطاع'});
 st=income(st,720000);
 const r=result(st);
 assert.equal(r.paid,0);
 assert.equal(r.next.transactions.filter(t=>t.type==='pay').length,0);
 assert.equal(E.stats(r.next).total,720000);
 assert.equal(r.next.settings.twoStageWorkflow.completed[month].salary.mode,'automatic');
});
test('inadequate balance does not create a payment or negative cash',()=>{
 const st=income(configured(base(),[field('installment','salary',218000)]),100000);
 const before=JSON.stringify(st),r=result(st);
 assert.equal(r.paid,0);assert.equal(r.skipped.length,1);
 assert.equal(r.next.transactions.filter(t=>t.type==='pay').length,0);
 assert.equal(E.stats(r.next).total,100000);
 assert.equal(r.next.settings.twoStageWorkflow.completed[month],undefined);
 assert.equal(JSON.stringify(st),before);
});
test('only opted in fields pay automatically and older records retain manual mode',()=>{
 const st=income(configured(base(),[field('auto','salary',100000),field('manual','salary',50000,false)]),200000);
 const r=result(st);
 assert.equal(r.paid,100000);
 assert.equal(E.stats(r.next).total,100000);
 assert.equal(r.next.transactions.filter(t=>t.type==='pay').length,1);
 assert.equal(r.next.settings.twoStageWorkflow.completed[month],undefined);
});
test('explicit cash method never silently withdraws from card',()=>{
 const st=income(configured(base(),[field('cashOnly','salary',10000,true,'cash')]),100000);
 const r=result(st);
 assert.equal(r.paid,0);assert.equal(r.skipped.length,1);
 assert.equal(E.stats(r.next).card,100000);assert.equal(E.stats(r.next).cash,0);
});
test('fixed obligations automatically carry into a future month only when opted in',()=>{
 let st=configured(base(),[field('fixed','salary',350000),field('old','salary',50000,false)],'2026-09');
 st=income(st,700000);
 const r=result(st);
 assert.equal(r.paid,350000);
 assert.equal(r.next.settings.twoStageWorkflow.plans[month].fixed,350000);
 assert.equal(r.next.settings.twoStageWorkflow.plans[month].old,undefined);
 assert.equal(E.stats(r.next).total,350000);
});
test('opted-in fixed editor and ordinary income recording are both connected',()=>{
 assert.match(app,/function fixedCommitmentEdit\(/);
 assert.match(app,/fixed-entry/);
 assert.match(app,/fixed-edit/);
 assert.match(app,/field\.autoDeduct=f\.autoDeduct/);
 assert.match(app,/autoFixedSettlement\(next,selected\.id,f\.incomePeriod,f\.method,f\.date\)/);
 assert.match(app,/autoFixedSettlement\(n,d\.stage,d\.month,d\.payMethod,d\.date\)/);
});

test('salary arriving before incentive still pays each split half correctly',()=>{
 let st=configured(base('both'),[field('splitReverse','split',100001)]);
 st=income(st,500000,'salary');
 let r=result(st,'salary');assert.equal(r.paid,50001);
 assert.equal(r.next.settings.twoStageWorkflow.completed[month].salary.mode,'automatic');
 st=income(r.next,300000,'incentives');
 r=result(st,'incentives');
 assert.equal(r.paid,50000);
 assert.equal(E.stats(r.next).paid.wf_splitReverse_2026_10,100001);
 assert.equal(E.stats(r.next).total,699999);
 assert.equal(r.next.transactions.filter(t=>t.type==='pay').length,2);
});
test('an already completed stage cannot generate duplicate automatic payments',()=>{
 let st=income(configured(base(),[field('oldAuto','salary',30000)]),100000);
 const first=result(st);
 const repeated=result(first.next);
 assert.equal(repeated.paid,0);
 assert.equal(JSON.stringify(repeated.next),JSON.stringify(first.next));
});
test('account routing can select the receipt card or a separate available cash account',()=>{
 let st=configured(base(),[field('cardPay','salary',25000,true,'receipt'),field('cashPay','salary',10000,true,'cash')]);
 st=income(st,100000,'salary','card');
 let r=result(st);
 assert.equal(r.paid,25000);assert.equal(r.skipped.length,1);
 assert.equal(E.stats(r.next).card,75000);
 assert.equal(E.stats(r.next).cash,0);
});

test('saving a new opted-in fixed commitment immediately settles an already recorded salary',()=>{
 const st=income(base(),720000),previous=JSON.stringify(st),ctx={state:st,submit:null};
 const editorCode=app.slice(app.indexOf('function fixedCommitmentEdit('),app.indexOf('function monthlyFieldsManage(){'));
 const env={
  E,S,ctx, get state(){return ctx.state}, wfMonth:month,today:()=>day,ccy:()=>({dec:0}),
  monthlyFields:(s=ctx.state)=>s.settings.wfFields||[],monthlyAllFields:(s=ctx.state)=>s.settings.wfFields||[],
  wfPlan:()=>ctx.state.settings.twoStageWorkflow?.plans?.[month]||{},
  wfData:s=>s.settings.twoStageWorkflow||{plans:{},completed:{}},
  wfIncomeMode:()=> 'salary-only',
  wfFreezeIncomeMode:s=>s,
  monthlyFieldStageLabel:()=> 'من الراتب',
  amount:val=>{const n=Number(val);if(!Number.isSafeInteger(n)||n<=0)throw Error('invalid');return n;},
  inputMoney:v=>String(v),moneyField:()=>'<input>',field:()=>'<input>',select:()=>'<select>',
  safe:String,uid:(()=>{let n=0;return ()=> 'id'+(++n)})(),
  modal:(title,description,markup,callback)=>{ctx.submit=callback;},
  act:(fn)=>{ctx.state=fn(JSON.parse(JSON.stringify(ctx.state)));E.validate(ctx.state);},
  autoFixedSettlement:api.autoFixedSettlement
 };
 const edit=new Function('env','with(env){'+editorCode+';return fixedCommitmentEdit}')(env);
 edit();
 assert.ok(ctx.submit,'Editor did not expose save operation');
 ctx.submit({fixedName:'قسط جديد',fixedAmount:'218000',fixedStage:'salary',fixedMethod:'receipt',autoDeduct:'yes'});
 assert.equal(E.stats(ctx.state).total,502000);
 assert.equal(E.stats(ctx.state).paid[Object.keys(E.stats(ctx.state).paid)[0]],218000);
 assert.equal(ctx.state.transactions.filter(t=>t.type==='pay').length,1);
 assert.equal(JSON.stringify(st),previous);
 // Adding another obligation to an already received salary must remain possible.
 edit();
 ctx.submit({fixedName:'الإنترنت',fixedAmount:'30000',fixedStage:'salary',fixedMethod:'receipt',autoDeduct:'yes'});
 assert.equal(E.stats(ctx.state).total,472000);
 assert.equal(ctx.state.transactions.filter(t=>t.type==='pay').length,2);
 assert.equal(ctx.state.settings.twoStageWorkflow.completed[month].salary.summary.paid,248000);
 // A previously settled obligation cannot have its posted amount silently rewritten.
 const posted=ctx.state.settings.wfFields[0].key;
 edit(posted);
 assert.throws(()=>ctx.submit({fixedName:'قسط جديد',fixedAmount:'219000',fixedMethod:'receipt',autoDeduct:'yes'}),/لا يمكن تغيير مبلغه/);
 assert.equal(E.stats(ctx.state).total,472000);
});
