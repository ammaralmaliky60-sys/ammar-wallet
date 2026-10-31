'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../engine.js');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const source=app.slice(app.indexOf('let resetProof=null,resetAttempt=0;'),app.indexOf('function setupStart(){'));
if(!source.includes('function openFinancialResetFinal('))throw Error('Reset flow not found.');
const clone=o=>JSON.parse(JSON.stringify(o));
function context(){
 const st=E.initial();st.demo=false;st.cycle.start='2026-10-01';st.settings.name='حساب تجريبي';
 st.settings.livingTargets={'2026-10':{home:125000,kids:60000}};
 st.settings.twoStageWorkflow={plans:{'2026-10':{loan:218000}},completed:{}};
 st.obligations.push({id:'old',name:'سلفة',amount:218000,due:'2026-10-30',recurring:false});
 const withIncome=E.commit(st,{type:'income',id:E.uid(),amount:720000,method:'card',date:'2026-10-30'});
 const events={modals:[],downloads:[],messages:[],saveCalls:[],started:0,closed:0};
 const current={state:withIncome,KEY:'mizan-finance-v2'};
 const elements={resetBackupDownload:{onclick:null},resetBackupStatus:{textContent:''}};
 const locals=new Map([[current.KEY,JSON.stringify(withIncome)],['mizan-finance-v2-profile-pother',JSON.stringify({keep:'other-profile'})]]);
 const env={
  E,current,activeProfile:'default',today:()=> '2026-10-31',localProfiles:()=>[{id:'default',name:'المساحة الأساسية'}],
  get state(){return current.state}, get KEY(){return current.KEY},
  fmt:String,unit:()=> 'د.ع',safe:String,icon:()=>'',structuredClone:clone,
  backupSha256:async()=> 'test-checksum',
  download:(filename,payload)=>events.downloads.push({filename,payload}),
  modal:(title,subtitle,body,callback,action)=>events.modals.push({title,subtitle,body,callback,action}),
  $:id=>elements[id],
  showError:m=>events.messages.push(m),
  save:(next)=>{
   E.validate(next);
   events.saveCalls.push(next);
   locals.set(current.KEY,JSON.stringify(next)); current.state=next;
  },
  closeModal:()=>events.closed++,
  set wfMonth(x){events.wfMonth=x},set schedulePeriod(x){events.period=x},
  location:{set hash(x){events.hash=x}},
  setupStart:()=>events.started++
 };
 const api=new Function('env','with(env){'+source+';return {freshFinancialState,requireResetBackup,openFinancialReset,openFinancialResetFinal,resetDownloadBackup}}')(env);
 return {api,current,events,elements,locals,env};
}
test('fresh financial state is blank while previous journal remains untouched',()=>{
 const f=context(),raw=JSON.stringify(f.current.state);
 const fresh=f.api.freshFinancialState(),stats=E.stats(fresh);
 assert.equal(fresh.demo,false);assert.equal(fresh.transactions.length,0);
 assert.equal(fresh.obligations.length,0);assert.equal(fresh.history.length,0);
 assert.equal(fresh.reconciliations.length,0);assert.equal(stats.total,0);
 assert.equal(stats.unallocated,0);assert.equal(fresh.settings.livingTargets,undefined);
 assert.equal(fresh.settings.twoStageWorkflow,undefined);
 assert.equal(JSON.stringify(f.current.state),raw);
});
test('reset guard rejects missing, stale and other-profile backup proof',()=>{
 const f=context(),raw=JSON.stringify(f.current.state);
 assert.throws(()=>f.api.requireResetBackup(null,f.current.state,f.current.KEY),/نسخة/);
 assert.throws(()=>f.api.requireResetBackup({profileKey:'different',raw},f.current.state,f.current.KEY),/نسخة/);
 assert.throws(()=>f.api.requireResetBackup({profileKey:f.current.KEY,raw:'stale'},f.current.state,f.current.KEY),/تغيّرت/);
 assert.equal(f.api.requireResetBackup({profileKey:f.current.KEY,raw},f.current.state,f.current.KEY),true);
});
test('opening the reset dialog does not change the ledger and requires confirmed download',()=>{
 const f=context(),raw=JSON.stringify(f.current.state);
 f.api.openFinancialReset();
 assert.equal(f.events.modals.length,1);
 assert.match(f.events.modals[0].body,/ملف JSON/);
 assert.match(f.events.modals[0].body,/الملفات المالية الأخرى/);
 assert.throws(()=>f.events.modals[0].callback({downloadConfirmed:'yes',phrase:'تهيئة'}),/نسخة/);
 assert.equal(f.events.saveCalls.length,0);assert.equal(JSON.stringify(f.current.state),raw);
});
test('resetting requires a download attempt, typed word and second approval',async()=>{
 const f=context(),before=JSON.stringify(f.current.state);
 f.api.openFinancialReset();
 const first=f.events.modals[0];
 assert.throws(()=>first.callback({downloadConfirmed:'no',phrase:'تهيئة'}),/تحقق/);
 f.elements.resetBackupDownload.onclick();
 await Promise.resolve();await Promise.resolve();
 assert.equal(f.events.downloads.length,1);
 assert.match(f.events.downloads[0].filename,/before-reset-default/);
 assert.equal(JSON.parse(f.events.downloads[0].payload).backupIntegrity.digest,'test-checksum');
 assert.throws(()=>first.callback({downloadConfirmed:'yes',phrase:'حذف'}),/تهيئة/);
 first.callback({downloadConfirmed:'yes',phrase:'تهيئة'});
 assert.equal(f.events.modals.length,2);
 assert.equal(f.events.saveCalls.length,0);
 assert.throws(()=>f.events.modals[1].callback({finalApproval:'no'}),/التأكيد/);
 assert.equal(JSON.stringify(f.current.state),before);
 f.events.modals[1].callback({finalApproval:'yes'});
 assert.equal(f.events.saveCalls.length,1);
 assert.equal(E.stats(f.current.state).total,0);
 assert.equal(f.current.state.transactions.length,0);
 assert.equal(f.events.started,1);
 assert.equal(f.events.hash,'workflow');
 assert.deepEqual(JSON.parse(f.locals.get('mizan-finance-v2-profile-pother')),{keep:'other-profile'});
});
test('closing and reopening resets the first attempt and prevents stale approval',async()=>{
 const f=context();
 f.api.openFinancialReset();
 const staleDialog=f.events.modals[0];
 f.api.openFinancialReset();
 assert.throws(()=>staleDialog.callback({downloadConfirmed:'yes',phrase:'تهيئة'}),/نسخة/);
 f.elements.resetBackupDownload.onclick();
 await Promise.resolve();await Promise.resolve();
 assert.equal(f.events.downloads.length,1);
 assert.equal(f.events.saveCalls.length,0);
});
test('changed journal during confirmation invalidates the first backup',async()=>{
 const f=context();
 f.api.openFinancialReset();const first=f.events.modals[0];
 f.elements.resetBackupDownload.onclick();
 await Promise.resolve();await Promise.resolve();
 f.current.state=E.commit(f.current.state,{type:'income',id:E.uid(),amount:2000,date:'2026-10-31',method:'card'});
 assert.throws(()=>first.callback({downloadConfirmed:'yes',phrase:'تهيئة'}),/تغيّرت/);
 assert.equal(f.events.saveCalls.length,0);
});
test('settings includes a distinct danger reset, but no automatic clearing',()=>{
 assert.match(app,/data-action="financial-reset"|btn\('financial-reset'/);
 assert.match(app,/'financial-reset':openFinancialReset/);
 assert.match(app,/تهـيئة|تهيئة البيانات والبدء من الصفر/);
 assert.match(app,/save\(fresh/);
 assert.doesNotMatch(app,/localStorage\.clear\(\)/);
});
