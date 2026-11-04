'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'report-pdf.js'),'utf8');
const view=fs.readFileSync(path.join(root,'src/app/views/reports.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
function load(extra={}){
  const scope={window:{},Date,Intl,TextEncoder,Uint8Array,Blob,...extra};
  vm.runInNewContext(source,scope,{filename:'report-pdf.js'});
  return scope.window.ThukhrPDF;
}
const sample=()=>({
 brand:'وين راحت؟',period:'2026-11',from:'2026-11-01',to:'2026-11-04',ownerName:'  عمار  ',
 stats:{opening:'200,000',income:'720,000',expenses:'100,000',net:'620,000',total:'820,000',count:'1'},
 wallets:[{name:'المنزل',budget:'150,000',spent:'30,000',balance:'120,000'}],
 entries:[{id:'a',date:'2026-11-04',type:'مصروف',category:'المنزل',note:'مشتريات المنزل',amount:'30,000'}]
});
test('PDF uses saved greeting name and local generation date and time',()=>{
 const report=sample(),copy=JSON.stringify(report),now=new Date('2026-11-04T12:34:56Z');
 const p=load().prepareReport(report,now);
 assert.equal(p.ownerName,'عمار');
 assert.equal(p.stats.total,'820,000');
 assert.equal(JSON.stringify(report),copy);
 assert.equal(p.generatedDate,new Intl.DateTimeFormat('ar-IQ',{day:'numeric',month:'long',year:'numeric'}).format(now));
 assert.equal(p.generatedTime,new Intl.DateTimeFormat('ar-IQ',{hour:'2-digit',minute:'2-digit',hour12:true}).format(now));
});
test('missing greeting name is not invented',()=>{
 const report=sample();report.ownerName=' ';
 assert.equal(load().prepareReport(report).ownerName,'غير مسجّل');
});
test('PDF source has all identity fields and the reports page supplies settings.name',()=>{
 assert.match(view,/ownerName:\s*s\.settings\.name\s*\|\|\s*''/);
 for(const label of ['الاسم المسجّل في التحية','تاريخ إنشاء التقرير','وقت إنشاء التقرير','أُعدّ باسم:'])assert.ok(source.includes(label),label);
});
test('static PWA manifest uses updated script versions',()=>{
 for(const txt of [html,sw]){
  assert.match(txt,/report-pdf\.js\?v=3\.1\.0/);
  assert.match(txt,/views\/reports\.js\?v=3\.1\.0/);
 }
});
test('PDF pages render every wallet, every transaction, and report identity',async()=>{
 const drawn=[],ctx={
  save(){},restore(){},beginPath(){},closePath(){},moveTo(){},lineTo(){},arcTo(){},
  fill(){},stroke(){},fillRect(){},strokeRect(){},
  fillText(s){drawn.push(String(s));},
  measureText(s){return {width:String(s).length*11};}
 };
 const jpeg=Buffer.alloc(4300,0x42).toString('base64');
 let clicked=false,created=0;
 const document={
  fonts:{load:async()=>true},
  createElement(type){
   if(type==='canvas'){created++;return {width:0,height:0,getContext:()=>ctx,toDataURL:()=> 'data:image/jpeg;base64,'+jpeg};}
   if(type==='a')return {style:{},click(){clicked=true;},remove(){}};
   throw Error('unexpected element '+type);
  },
  body:{appendChild(){}}
 };
 const pdf=load({
  document,
  atob:x=>Buffer.from(x,'base64').toString('binary'),
  URL:{createObjectURL:()=> 'blob:sample',revokeObjectURL(){}},
  setTimeout:()=>{}
 });
 const data=sample();
 data.wallets=Array.from({length:27},(_,i)=>({name:'الفئة '+i,budget:'100,000',spent:'2,000',balance:'98,000'}));
 data.entries=Array.from({length:45},(_,i)=>({id:'r'+i,date:'2026-11-04',type:'مصروف',category:'الفئة 0',note:'حركة اختبار '+i,amount:'2,000'}));
 const result=await pdf.download(data);
 assert.ok(clicked);
 assert.equal(result.pages,created);
 assert.ok(result.pages>=5);
 assert.ok(drawn.includes('عمار'));
 assert.ok(drawn.some(x=>x.includes('أُعدّ باسم: عمار')));
 assert.ok(drawn.some(x=>x.includes(result.generatedDate)));
 assert.ok(drawn.some(x=>x.includes(result.generatedTime)));
 for(let i=0;i<27;i++)assert.ok(drawn.includes('الفئة '+i),'missing category '+i);
 for(let i=0;i<45;i++)assert.ok(drawn.some(x=>x.includes('حركة اختبار '+i)),'missing transaction '+i);
});
test('PDF module stays offline and never alters stored financial records',()=>{
 assert.doesNotMatch(source,/localStorage|indexedDB|fetch\s*\(|XMLHttpRequest|navigator\.sendBeacon/);
});
