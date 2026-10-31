'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../engine.js'),S=require('../schedule.js');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const fieldsCode=app.slice(app.indexOf('const LEGACY_WF_FIELDS=['),app.indexOf('function monthlyHiddenFields('));
const wizardCode=app.slice(app.indexOf('function wizardRows('),app.indexOf('function renderWizard()'));
const mon='2026-10',day='2026-10-31';
const fields=(state)=>new Function('state',fieldsCode+';return monthlyFields(state);')(state);
const initial=()=>{const s=E.initial();s.demo=false;s.cycle.start=mon+'-01';return s};
const wizard=(changes={})=>Object.assign({name:'مستخدم',currency:'IQD',start:day,days:30,
 incomeMode:'salary-only',income:'0',method:'card',sourceId:'salary',incomePeriod:mon,plan:'later',obligations:[]},changes);
const build=(old,setup)=>{
 let count=0;
 const env={E,S,autoFixedSettlement:(st)=>({next:st}),currencies:{IQD:{dec:0}},uid:()=> 'unique'+(++count),
  parseMoney:(raw,dec,zero=false)=>{const n=Number(raw);if(!Number.isSafeInteger(n)||n<0||(!zero&&!n))throw Error('أدخل مبلغاً موجباً');return n},
  event:(s,t)=>E.commit(s,{id:E.uid(),...t})};
 return new Function('env','with(env){'+wizardCode+';return wizardFreshPlan}')(env)(old,setup);
};
test('initial profile starts with zero fixed commitments and zero financial obligations',()=>{
 const s=initial();
 assert.deepEqual(s.settings.wfFields,[]);
 assert.deepEqual(s.settings.wfHiddenFields,[]);
 assert.deepEqual(s.obligations,[]);
 assert.deepEqual(fields(s),[]);
});
test('legacy used fixed commitments remain readable while unused suggestions disappear',()=>{
 const s=initial();delete s.settings.wfFields;
 assert.equal(fields(s).length,0);
 s.settings.twoStageWorkflow={plans:{[mon]:{housing:350000}},completed:{}};
 assert.ok(fields(s).some(o=>o.key==='housing'));
});
test('onboarding with no user commitments and zero income has no old obligations',()=>{
 const old=initial();old.settings.wfFields=[{key:'previous',label:'قديم',stage:'salary'}];
 old.settings.twoStageWorkflow={plans:{[mon]:{previous:218000}},completed:{}};
 old.obligations.push({id:'old',name:'دين قديم',amount:218000,due:day,recurring:false});
 const copy=JSON.stringify(old),next=build(old,wizard());
 assert.deepEqual(next.settings.wfFields,[]);
 assert.deepEqual(next.obligations,[]);
 assert.equal(next.settings.twoStageWorkflow,undefined);
 assert.equal(E.stats(next).total,0);
 assert.equal(JSON.stringify(old),copy);
});
test('onboarding stores only user-entered commitment plans without extra activity in isolated fixture',()=>{
 const next=build(initial(),wizard({income:'720000',obligations:[
  {name:'الإيجار',amount:'350000',stage:'salary'},
  {name:'القسط',amount:'218000',stage:'salary'}]}));
 assert.equal(next.settings.wfFields.length,2);
 assert.equal(Object.values(next.settings.twoStageWorkflow.plans[mon]).reduce((a,b)=>a+b,0),568000);
 assert.deepEqual(next.obligations,[]);
 assert.equal(next.transactions.length,1);
 assert.equal(E.stats(next).total,720000);
 assert.equal(E.stats(next).unallocated,720000);
});
test('two-income onboarding accepts incentive and split stages',()=>{
 const next=build(initial(),wizard({incomeMode:'both',income:'750000',sourceId:'incentives',obligations:[
  {name:'الإسكان',amount:'320000',stage:'incentives'},
  {name:'السلفة',amount:'500000',stage:'split'}]}));
 assert.equal(next.settings.wfFields[0].stage,'incentives');
 assert.equal(next.settings.wfFields[1].stage,'split');
 assert.equal(next.settings.wfIncomeModes[mon],'both');
 assert.equal(next.transactions[0].sourceId,'incentives');
});
test('salary-only onboarding rejects incentives, duplicate labels, or zero-value entries',()=>{
 assert.throws(()=>build(initial(),wizard({obligations:[{name:'سلفة',amount:'1000',stage:'incentives'}]})),/دفعة/);
 assert.throws(()=>build(initial(),wizard({obligations:[{name:'سلفة',amount:'1000',stage:'salary'},{name:'سلفة',amount:'2000',stage:'salary'}]})),/مكرر/);
 assert.throws(()=>build(initial(),wizard({obligations:[{name:'سلفة',amount:'0',stage:'salary'}]})),/موجب/);
});
test('user must add commitments in the setup wizard; no preloaded entries',()=>{
 assert.match(app,/تبدأ من <b>صفر التزامات<\/b>/);
 assert.match(app,/wizardValidateCommitments\(wizard\.obligations/);
 assert.match(app,/wizardFreshPlan\(state,wizard\)/);
 assert.match(app,/wizard\.obligations\.forEach\(add\)/);
 assert.match(app,/إضافة التزام/);
});

test('a first-time visitor sees blank data and is guided to enter commitments',()=>{
 assert.match(app,/needsFirstSetup=true;const fresh=E\.initial\(\);fresh\.demo=false;return fresh/);
 assert.match(app,/if\(needsFirstSetup&&!storageError&&!brokenRaw\)setupStart\(\)/);
 assert.match(app,/function makeDemo\(\)/);
 assert.match(app,/function load\(\)/);
});
