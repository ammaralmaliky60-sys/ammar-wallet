/* فِرزة — app/living.js
 * Living-expense categories, targets, budget summaries and the living page.
 * Classic script: shares the global scope with the other app/*.js files, loaded in the order listed in index.html. */
'use strict';
const WF_LIVING=[
 {id:'home',label:'المنزل',kind:'spend',color:'#b88c5b'},
 {id:'vegetables',label:'الخضروات',kind:'spend',color:'#54a981'},
 {id:'kids',label:'الأطفال',kind:'spend',color:'#8b96d0'},
 {id:'personal',label:'الشخصي',kind:'spend',color:'#ca8c6d'},
 {id:'emergency',label:'الطوارئ',kind:'emergency',color:'#c3a463'}
];

function livingCategories(st=state){
 const saved=st.settings.livingCategories;
 return Array.isArray(saved)?saved:WF_LIVING;
}
function livingHiddenCategories(st=state){return Array.isArray(st.settings.livingHiddenCategories)?st.settings.livingHiddenCategories:[];}
function livingAllCategories(st=state){return [...livingCategories(st),...livingHiddenCategories(st)];}
function livingCategoryIsUsed(st,id){
 return st.transactions.some(t=>t.walletId===id||t.from===id||t.to===id)||
   st.history.some(h=>Array.isArray(h.transactionIds)&&h.transactionIds.some(tid=>st.transactions.some(t=>t.id===tid&&(t.walletId===id||t.from===id||t.to===id)))||
      (JSON.stringify(h).includes('"'+id+'"')));
}
function livingCategoryManage(){
 const categories=livingCategories(),hidden=livingHiddenCategories(),stats=currentStats();
 const activeRows=categories.map(c=>{
  const used=livingCategoryIsUsed(state,c.id),balance=stats.wallets[c.id]||0;
  return `<div class="wf-category-row"><span class="wf-category-color" style="background:${c.color}"></span>
   <div class="wf-category-info"><strong>${safe(c.label)}</strong>
    <small>${used?'عليه حركات مالية':balance?'له رصيد متبقٍ':'غير مستخدم ويمكن حذفه'}</small></div>
   <button type="button" class="btn small secondary" data-action="wf-category-edit" data-id="${safe(c.id)}">تعديل</button>
   ${!used&&!balance?`<button type="button" class="btn small danger" data-action="wf-category-delete" data-id="${safe(c.id)}">حذف</button>`:
   `<button type="button" class="btn small secondary" data-action="wf-category-hide" data-id="${safe(c.id)}">إخفاء</button>`}
   </div>`;
 }).join('');
 const hiddenRows=hidden.map(c=>`<div class="wf-category-row wf-category-hidden-row">
   <span class="wf-category-color" style="background:${c.color}"></span>
   <div class="wf-category-info"><strong>${safe(c.label)}</strong><small>مخفي من المصروف · بياناته ورصيده محفوظان</small></div>
   <button type="button" class="btn small secondary" data-action="wf-category-restore" data-id="${safe(c.id)}">إظهار</button>
   </div>`).join('');
 modal('إدارة أقسام المصروف','تگدر تحذف حتى آخر قسم غير مستخدم، أو تخفي القسم المرتبط ببيانات وتسترجعه لاحقاً.',
 `<div class="wf-category-list">
  ${activeRows||'<div class="wf-category-empty"><strong>ما عندك أقسام معيشة حالياً</strong><p>أضف القسم الذي تحتاجه من الزر أدناه، ولا توجد أقسام إجبارية.</p></div>'}
 </div><button type="button" class="btn wf-category-add" data-action="wf-category-add">إضافة قسم جديد</button>
 ${categories.length?'<button type="button" class="btn small danger wf-category-clear" data-action="wf-category-clear">إفراغ أقسام المصروف</button>':''}
 ${hidden.length?`<div class="wf-category-hidden-section"><h3>أقسام مخفية (${hidden.length})</h3>
 <p class="wf-help">تبقى ضمن السجل والأرصدة السابقة. تگدر ترجع أي قسم بزر «إظهار».</p>
 <div class="wf-category-list">${hiddenRows}</div></div>`:''}
 <p class="wf-help">حذف القسم غير المستخدم لا يحذف أي حركة مالية. الإخفاء يحافظ على الرصيد والحركات وميزانيات الشهور السابقة.</p>`);
}
function livingCategoryEdit(id=''){
 const old=id?livingCategories().find(x=>x.id===id):null;
 if(id&&!old)throw Error('هذا القسم غير موجود.');
 if(!old&&livingCategories().length>=12)throw Error('لا يمكن إضافة أكثر من 12 قسماً.');
 modal(old?'تعديل اسم القسم':'إضافة قسم جديد','يظهر القسم فوراً في المصروف والصرف المباشر والميزانية وPDF.',
  `<div class="form-grid">${field('اسم القسم','categoryName','text',old?.label||'','required maxlength="35" placeholder="مثلاً الأدوية أو الوقود"')}
   ${old?'':select('نوع القسم','categoryKind',[['spend','مصروف يومي'],['emergency','طوارئ']],'spend')}
   </div>`,
  f=>{
   const name=String(f.categoryName||'').trim().replace(/\s+/g,' ');
   if(name.length<2||name.length>35||/[<>]/.test(name))throw Error('اسم القسم يجب أن يكون من 2 إلى 35 حرفاً.');
   if(livingAllCategories().some(c=>c.id!==id&&c.label.toLowerCase()===name.toLowerCase()))
    throw Error('هذا الاسم مستخدم مسبقاً.');
   if(!old&&!['spend','emergency'].includes(f.categoryKind))throw Error('نوع القسم غير صحيح.');
   act(n=>{
    const items=livingCategories(n).map(x=>({...x}));
    if(old){
     const item=items.find(x=>x.id===id);
     if(!item)throw Error('القسم المطلوب غير موجود.');
     item.label=name;
     const wallet=n.wallets.find(x=>x.id===id);
     if(wallet)wallet.name=name;
    }else{
     const code='living_'+uid().replace(/[^a-zA-Z0-9_-]/g,'').slice(0,35);
     if(items.some(x=>x.id===code)||n.wallets.some(x=>x.id===code))throw Error('تعذر إنشاء معرف القسم. أعد المحاولة.');
     const colors=['#5aa89d','#c1a06a','#9b95ca','#ce8d8d','#74a3c1','#ae9c76'];
     const c={id:code,label:name,kind:f.categoryKind,color:colors[items.length%colors.length]};
     items.push(c);
     n.wallets.push({id:c.id,name:c.label,kind:c.kind,color:c.color,weight:0});
    }
    n.settings.livingCategories=items;
    return n;
   },old?'تم تحديث اسم القسم':'تمت إضافة القسم إلى المعيشة');
  },old?'حفظ التعديل':'إضافة القسم');
}
function livingCategoryHide(id){
 const selected=livingCategories().find(c=>c.id===id);
 if(!selected)throw Error('القسم غير موجود ضمن الأقسام الظاهرة.');
 confirmModal('إخفاء قسم المصروف؟','سيختفي قسم «'+selected.label+'» من صفحة المصروف والصرف الجديد، لكن رصيده وحركاته السابقة تبقى محفوظة ويمكن إظهاره لاحقاً.',
 ()=>{
  act(n=>{
   const c=livingCategories(n).find(c=>c.id===id);
   if(!c)throw Error('القسم غير موجود.');
   n.settings.livingCategories=livingCategories(n).filter(c=>c.id!==id).map(c=>({...c}));
   n.settings.livingHiddenCategories=[...livingHiddenCategories(n).map(c=>({...c})),{...c}];
   return n;
  },'تم إخفاء القسم مع الحفاظ على رصيده وحركاته');
 },'إخفاء القسم');
}
function livingCategoryRestore(id){
 const selected=livingHiddenCategories().find(c=>c.id===id);
 if(!selected)throw Error('القسم غير موجود ضمن الأقسام المخفية.');
 if(livingCategories().length>=12)throw Error('يمكن إظهار 12 قسماً كحد أقصى. أخفِ قسماً آخر أولاً.');
 act(n=>{
  const selected=livingHiddenCategories(n).find(c=>c.id===id);
  if(!selected)throw Error('القسم غير موجود.');
  if(livingCategories(n).length>=12)throw Error('الأقسام الظاهرة وصلت إلى الحد الأقصى.');
  if(livingCategories(n).some(c=>c.label.toLowerCase()===selected.label.toLowerCase()))
   throw Error('يوجد قسم ظاهر بنفس الاسم. غيّر الاسم أولاً.');
  n.settings.livingHiddenCategories=livingHiddenCategories(n).filter(c=>c.id!==id).map(c=>({...c}));
  n.settings.livingCategories=[...livingCategories(n).map(c=>({...c})),{...selected}];
  return n;
 },'تم إظهار القسم في المعيشة مرة أخرى');
}
function livingCategoryClear(){
 const cats=livingCategories();
 if(!cats.length)throw Error('واجهة المصروف فارغة أصلاً. تگدر تضيف أول قسم.');
 const used=cats.filter(c=>livingCategoryIsUsed(state,c.id)||(currentStats().wallets[c.id]||0)>0);
 const unused=cats.length-used.length;
 confirmModal('إفراغ أقسام المصروف؟',
  'راح تصير قائمة الأقسام فارغة: نحذف '+unused+' قسم غير مستخدم، ونخفي '+used.length+
  ' قسم مرتبط بسجل أو رصيد مع الحفاظ على بياناته. ما راح نحذف أموالك أو حركاتك.',
  ()=>{
   act(n=>{
    const active=livingCategories(n);
    const stats=E.stats(n),keep=[],remove=new Set();
    for(const c of active){
     if(livingCategoryIsUsed(n,c.id)||(stats.wallets[c.id]||0)>0)keep.push({...c});
     else remove.add(c.id);
    }
    n.settings.livingCategories=[];
    n.settings.livingHiddenCategories=[...livingHiddenCategories(n).map(c=>({...c})),...keep];
    n.wallets=n.wallets.filter(w=>!remove.has(w.id));
    if(n.settings.livingTargets){
     for(const month of Object.keys(n.settings.livingTargets)){
      const targets={...n.settings.livingTargets[month]};
      for(const id of remove)delete targets[id];
      n.settings.livingTargets[month]=targets;
     }
    }
    return n;
   },'صارت قائمة المصروف فارغة. أضف الأقسام التي تحتاجها.');
  },'نعم، أفرغ قائمة الأقسام');
}
function livingCategoryDelete(id){
 const c=livingCategories().find(x=>x.id===id);
 if(!c)throw Error('هذا القسم غير موجود.');
 const used=livingCategoryIsUsed(state,id),balance=currentStats().wallets[id]||0;
 if(used||balance)throw Error('هذا القسم عليه رصيد أو حركات مالية. استخدم «إخفاء» للحفاظ على بياناته.');
 confirmModal('حذف القسم غير المستخدم؟','راح تحذف «'+c.label+'» من قائمة المعيشة. يسمح النظام بحذف آخر قسم أيضاً إذا كان غير مستخدم.',
 ()=>{
  act(n=>{
   if(livingCategoryIsUsed(n,id)||(E.stats(n).wallets[id]||0)!==0)
    throw Error('أصبح القسم مستخدماً؛ استخدم «إخفاء» بدلاً من الحذف.');
   n.settings.livingCategories=livingCategories(n).filter(x=>x.id!==id).map(x=>({...x}));
   n.wallets=n.wallets.filter(x=>x.id!==id);
   if(n.settings.livingTargets){
    for(const month of Object.keys(n.settings.livingTargets)){
     const values={...n.settings.livingTargets[month]};
     delete values[id];
     n.settings.livingTargets[month]=values;
    }
   }
   return n;
  },'تم حذف القسم غير المستخدم');
 },'نعم، احذف القسم');
}

// تقرير المصروف الشهري يحسب المصروف السابق ورصيد المحفظة؛ تخصيص الفرق فقط.
function livingSpent(walletId,month=wfMonth){
 return state.transactions.filter(t=>t.type==='expense'&&t.walletId===walletId&&t.date.slice(0,7)===month).reduce((sum,t)=>sum+t.amount,0);
}
function livingTargets(month=wfMonth,st=state){
 return st.settings.livingTargets?.[month]||{};
}
function livingBudgetSummary(month=wfMonth,st=state){
 const targets=livingTargets(month,st),known=new Map(livingAllCategories(st).map(w=>[w.id,w.label]));
 const rows=Object.entries(targets).filter(([,raw])=>Number.isSafeInteger(raw)&&raw>0)
  .map(([id,amount])=>({id,label:known.get(id)||'قسم محفوظ سابقاً',amount}));
 return {total:rows.reduce((n,r)=>n+r.amount,0),rows,hasPlan:Object.keys(targets).length>0};
}
function livingNeeds(targets,st=state,month=wfMonth){
 const stats=E.stats(st);
 const result=livingCategories(st).map(w=>{
  const target=targets[w.id]||0;
  const spent=st.transactions.filter(t=>t.type==='expense'&&t.walletId===w.id&&t.date.slice(0,7)===month).reduce((sum,t)=>sum+t.amount,0);
  const balance=stats.wallets[w.id]||0;
  return {id:w.id,label:w.label,target,spent,balance,additional:Math.max(0,target-spent-balance)};
 });
 return {rows:result,additional:result.reduce((sum,r)=>sum+r.additional,0),available:stats.unallocated};
}
function livingStageName(t,salaryDate){
 if(t.note&&t.note.includes('· من الراتب'))return 'salary';
 if(t.note&&t.note.includes('· من الحوافز'))return 'incentives';
 return wfIncomeMode()==='salary-only'?'salary':salaryDate&&t.date>=salaryDate?'salary':'incentives';
}
function livingPeriodSummary(stage){
 const salary=S.receipts(state,'salary',wfMonth).sort((a,b)=>a.date.localeCompare(b.date))[0];
 const cutoff=salary?.date||null;
 const relevant=state.transactions.filter(t=>t.date.slice(0,7)===wfMonth&&
   (t.type==='allocate'||t.type==='expense')&&livingAllCategories().some(w=>w.id===t.walletId));
 const txs=relevant.filter(t=>livingStageName(t,cutoff)===stage);
 return {allocated:txs.filter(t=>t.type==='allocate').reduce((s,t)=>s+t.amount,0),
         spent:txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)};
}
function livingPage(){
 const stats=currentStats(),salary=S.receipts(state,'salary',wfMonth).length>0,
   incentive=S.receipts(state,'incentives',wfMonth).length>0,
   extra=state.transactions.filter(t=>t.type==='income'&&t.note==='أخرى'&&t.date.slice(0,7)===wfMonth).reduce((a,t)=>a+t.amount,0),
   first=livingPeriodSummary('incentives'),second=livingPeriodSummary('salary');
 const sections=`<div class="wf-living-phases">
   <article class="wf-phase" ${wfIncomeMode()==='salary-only'?'hidden style="display:none!important"':''}>
    <div><span class="wf-kicker">القسم الأول</span><h2>مصروفات الحوافز</h2></div>
    <span class="chip ${incentive?'':'amber'}">${incentive?'تم تسجيل الاستلام':'لم تسجل الحوافز'}</span>
    <div class="wf-phase-amounts"><span>مخصص أثناء الحوافز <b>${money(first.allocated)}</b></span><span>مصروف قبل الراتب <b>${money(first.spent)}</b></span></div>
   </article>
   <article class="wf-phase">
    <div><span class="wf-kicker">${wfIncomeMode()==='salary-only'?'الدخل الشهري':'القسم الثاني'}</span><h2>مصروفات الراتب</h2></div>
    <span class="chip ${salary?'':'amber'}">${salary?'تم تسجيل الاستلام':'بانتظار الراتب'}</span>
    <div class="wf-phase-amounts"><span>مخصص بعد الراتب <b>${money(second.allocated)}</b></span><span>مصروف بعد الراتب <b>${money(second.spent)}</b></span></div>
   </article>
 </div>`;
 return head('المصروف',wfIncomeMode()==='salary-only'?'ميزانية شهرية من الراتب فقط؛ المصروف السابق محسوب تلقائياً.':'من الحوافز أولاً، ثم الراتب. ميزانية واحدة لكل شهر؛ المصروف السابق محسوب تلقائياً.')+thukhrFamilyGoals()+
  `<div class="wf-living-page-summary">
     <div><span>المتاح للمعيشة</span><strong>${money(stats.unallocated)}</strong></div>
     <p>الأموال الواردة باسم «أخرى» تزيد هذا المتبقي عند استلامها فعلياً. التخصيص لا يخصم من البطاقة؛ السداد أو الشراء الفعلي فقط هو الذي ينقص الرصيد النقدي.</p>
     <div class="wf-other-line"><span>الوارد باسم «أخرى» خلال ${wfMonth}</span><b>${money(extra)}</b></div>
     <div class="wf-living-top-actions">
       ${livingCategories().length?btn('wf-living-direct','إضافة مصروف','wallet'):''}
       ${btn('wf-living-extra','إضافة مصدر آخر','income','secondary')}
       ${btn('wf-category-manage','تحديد الأقسام','settings','secondary')}${btn('emergency-open','خزنة الطوارئ','shield','secondary')}
       ${btn('wf-living-pdf','تنزيل PDF','download','secondary')}
     </div>
   </div>`+sections+wfLivingPanel();
}
