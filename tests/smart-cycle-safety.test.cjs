'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),E=require('../engine.js');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const begin=app.indexOf('function save(next,');
const end=app.indexOf('\nfunction act(',begin);
if(begin<0||end<0)throw Error('Missing save function');
const source=app.slice(begin,end);
function caseData(){
 const initial=E.initial(),store={value:JSON.stringify(initial),writes:0};
 const env={state:initial,brokenRaw:'',KEY:'mizan-finance-v2',E,
  localStorage:{getItem:()=>store.value,setItem:(key,val)=>{store.value=val;store.writes++}},
  keepLocalSnapshot:()=>{},applySettings:()=>{},render:()=>{},toast:()=>{}};
 const save=new Function('env','with(env){'+source+';return save;}')(env);
 return {initial,store,save};
}
test('financial save writes an unchanged source state once',()=>{
 const {initial,store,save}=caseData();
 const next=JSON.parse(JSON.stringify(initial));next.settings.name='ملف تجريبي';
 save(next,'',false);
 assert.equal(store.writes,1);
 assert.equal(JSON.parse(store.value).settings.name,'ملف تجريبي');
});
test('a stale tab cannot overwrite data saved by another tab',()=>{
 const {initial,store,save}=caseData();
 const newer=JSON.parse(JSON.stringify(initial));
 newer.settings.name='تحديث من نافذة أخرى';
 store.value=JSON.stringify(newer);
 const proposed=JSON.parse(JSON.stringify(initial));proposed.settings.name='تعديل قديم';
 assert.throws(()=>save(proposed,'',false),/تغيّر السجل المالي/);
 assert.equal(store.writes,0);
 assert.equal(JSON.parse(store.value).settings.name,'تحديث من نافذة أخرى');
});
test('visualization failure never modifies financial state in place',()=>{
 assert.doesNotMatch(app,/catch\(e\)\{state\.settings\.theme=/);
});
test('workflow has one primary smart-cycle launch',()=>{
 const i=app.indexOf('function workflowPage(){'),j=app.indexOf('function wfApply(',i);
 const page=app.slice(i,j);
 assert.equal((page.match(/btn\('smart-cycle-open'/g)||[]).length,1);
 assert.match(page,/توزيع الميزانية متاح داخل الدورة الذكية/);
});
test('review exposes cash, card, reserved, available, and requires one approval',()=>{
 const i=app.indexOf('function smartReview(d){'),j=app.indexOf('function workflowPage(){',i);
 const content=app.slice(i,j);
 for(const key of ['r.after.card','r.after.cash','r.after.total','r.after.unallocated','r.after.reserved'])
  assert.ok(content.includes(key));
 assert.match(content,/act\(n=>smartBuild\(n,d\)\.next/);
});
test('last actual expense/payment supplies preferred payment method',()=>{
 const i=app.indexOf('function smartOpen(){'),j=app.indexOf('function smartIncome(d){',i);
 assert.match(app.slice(i,j),/previousPayment\?\.method/);
});
