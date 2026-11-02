/* فِرزة — app/spending.js
 * Budget funding, living panel actions, quick multi-item expenses and payments.
 * Classic script: shares the global scope with the other app/*.js files, loaded in the order listed in index.html. */
'use strict';
function budgetFundingNotice(){
 const targets=livingTargets(),hasPlan=Object.keys(targets).length>0;
 if(!hasPlan)return '<div class="notice">حدد السقوف الشهرية أولاً. السقف المالي لا يعني توفر رصيد للصرف.</div>';
 const required=livingNeeds(targets),available=currentStats().unallocated,
  shortfall=Math.max(0,required.additional-available),
  total=livingCategories().reduce((sum,w)=>sum+(targets[w.id]||0),0);
 return `<div class="notice ${shortfall?'warn':''}">
  <strong>الميزانية الشهرية المثبتة: ${money(total)}</strong>
  <p>المطلوب لاستكمال التخصيص: <b>${money(required.additional)}</b> · المتاح للتوزيع: <b>${money(available)}</b></p>
  ${shortfall?`<p>نقص التمويل: <b>${money(shortfall)}</b>. تظل السقوف محفوظة، ولا يُسجل دخل أو حجز أو صرف وهمي. بعد استلام مبلغ إضافي استخدم «إضافة مصدر آخر»، ثم «استكمال التمويل».</p>`:
  required.additional?'<p>التمويل متوفر. اضغط «استكمال التمويل» لتوزيعه على الأقسام بعد موافقتك.</p>':
  '<p>الميزانية مغطاة بالمصروفات السابقة والمخصصات الموجودة في الأقسام.</p>'}
 </div>`;
}
function wfLivingPanel(){
 const stats=currentStats(),targets=livingTargets();
 const cards=livingCategories().map(w=>{
  const balance=stats.wallets[w.id]||0,spent=livingSpent(w.id),
   hasTarget=Object.prototype.hasOwnProperty.call(targets,w.id),target=targets[w.id]||0,
   emergency=(state.wallets.find(x=>x.id===w.id)?.kind||w.kind)==='emergency',
   progress=target?Math.min(100,Math.round(spent/target*100)):0;
  return `<details class="wf-living-card thukhr-living-compact" style="--wf-category:${safe(w.color)}" ${window.matchMedia('(min-width:761px)').matches?'open':''}>
   <summary class="thukhr-living-summary">
    <span class="thukhr-living-title"><i class="wf-living-dot"></i><strong>${safe(w.label)}</strong><small>المتبقي</small></span>
    <span class="thukhr-living-balance">${money(balance)}</span>
    <span class="thukhr-living-chevron" aria-hidden="true">${icon('chevron')}</span>
    <span class="thukhr-progress-line"><i style="width:${progress}%"></i></span>
   </summary>
   <div class="thukhr-living-expanded">
    <div><span>المصروف هذا الشهر</span><b>${money(spent)}</b></div>
    <div><span>ميزانية الشهر</span><b>${hasTarget?money(target):'لم تُحدد'}</b></div>
    ${emergency?'<button type="button" class="btn secondary" data-action="emergency-open">فتح الخزنة المحمية</button>':`<button type="button" class="btn" data-action="wf-living-direct" data-id="${safe(w.id)}">صرف من هذا القسم</button>`}
   </div>
  </details>`;
 }).join('');
 return `<section id="wf-living" class="wf-stage wf-living">
  <div class="wf-stage-top"><div><span class="wf-kicker">ميزانية شهر ${wfMonth}</span>
   <h2>أقسام المصروف</h2></div><span class="chip">${livingCategories().length} قسم</span></div>
  <div class="wf-living-overview">
   <div><span>إجمالي ميزانية المصروف لهذا الشهر</span><strong>${money(livingBudgetSummary().total)}</strong></div>
   <div><span>المتاح للتوزيع</span><strong>${money(stats.unallocated)}</strong></div>
   <div><span>الموزّع على الأقسام</span><strong>${money(livingAllCategories().reduce((n,w)=>n+(stats.wallets[w.id]||0),0))}</strong></div>
  </div>
  ${budgetFundingNotice()}
  ${!wfDone('salary')?'<div class="notice warn">الراتب أو بعض حجوزاته لم يُعتمد بعد. احتفظ بما يلزم للالتزامات القادمة.</div>':''}
  <div class="wf-living-grid">${cards||`<div class="wf-category-empty"><strong>لا توجد أقسام معيشة حالياً</strong><p>اضغط «تحديد الأقسام» ثم «إضافة قسم جديد» حتى تبدأ بطريقتك.</p>${btn('wf-category-add','إضافة أول قسم','plus')}</div>`}</div>
  <div class="wf-living-actions">
   ${livingCategories().length?btn('wf-living-allocate','تحديد ميزانية المصروف للشهر','wallet'):''}
   ${Object.keys(livingTargets()).length&&livingNeeds(livingTargets()).additional>0?btn('wf-living-fund','استكمال التمويل','check','secondary'):''}
   ${btn('wf-category-manage','تحديد أقسام المصروف','settings','secondary')}
   ${btn('wf-release','إرجاع مبلغ إلى المتاح','wallet','secondary')}
  </div>
  <p class="wf-help">تحدد السقف الكامل للشهر بغضّ النظر عن الرصيد. حفظ الميزانية لا يحرك الأموال؛ وعند استكمال التمويل تُحتسب المصروفات السابقة والأرصدة الحالية حتى لا يتكرر التخصيص.</p>
 </section>`;
}
function wfLivingAllocate(){
 if(state.settings.closedMonths?.[wfMonth])throw Error('الشهر مغلق مالياً.');
 if(wfMonth<today().slice(0,7))throw Error('تعديل ميزانية شهر سابق غير متاح من هذه الشاشة.');
 if(state.demo)throw Error('ابدأ الخطة الفعلية أولاً.');
 if(!livingCategories().length)throw Error('أضف قسماً للمعيشة أولاً قبل تحديد الميزانية.');
 const preset=livingTargets(),available=currentStats().unallocated;
 const fields=livingCategories().map(w=>{
  const spent=livingSpent(w.id),balance=currentStats().wallets[w.id]||0;
  const prefill=Object.prototype.hasOwnProperty.call(preset,w.id)?preset[w.id]:spent+balance;
  return `<div class="wf-budget-field">${moneyField(w.label,'living-'+w.id,inputMoney(prefill),'required')}
  <small>مصروف سابق ${money(spent)} · متبقٍ في المحفظة ${money(balance)}</small></div>`;
 }).join('');
 modal('تحديد السقوف الشهرية للمعيشة',
  'ثبّت المبالغ التي تحتاجها أولاً، حتى إن كانت أعلى من المتاح. يتم تمويلها لاحقاً بخطوة مستقلة.',
  `<div class="notice">المتاح للتوزيع الآن: <b>${money(available)}</b>. حفظ السقوف لا يغيّر رصيد البطاقة أو النقد ولا ينشئ تخصيصاً. بعد إضافة مصدر آخر مستلم فعلياً، اضغط «استكمال التمويل» من المعيشة.</div>
  <div class="wf-form-grid">${fields}</div>
  <div class="field"><label><input type="checkbox" name="approve" value="yes" required> أؤكد حفظ خطة المصروف دون تسجيل صرف أو دخل</label></div>`,
  f=>{
   if(f.approve!=='yes')throw Error('يجب تأكيد حفظ الخطة.');
   const targets=Object.fromEntries(livingCategories().map(w=>[w.id,amount(f['living-'+w.id],true)]));
   const needed=livingNeeds(targets),shortfall=Math.max(0,needed.additional-currentStats().unallocated);
   act(n=>{
    if(n.settings.closedMonths?.[wfMonth])throw Error('الشهر مغلق مالياً.');
    n.settings.livingTargets={...(n.settings.livingTargets||{}),[wfMonth]:{...livingTargets(wfMonth,n),...targets}};
    return n;
   },shortfall?'تم تثبيت الميزانية؛ أضف دخل «أخرى» بعد استلامه لاستكمال التمويل':'تم تثبيت الميزانية دون تغيير الرصيد؛ يمكنك استكمال تمويلها');
  },'حفظ الميزانية فقط');
}
function wfLivingFund(){
 if(state.demo)throw Error('ابدأ الخطة الفعلية أولاً.');
 if(state.settings.closedMonths?.[wfMonth]||wfMonth<today().slice(0,7))
  throw Error('استكمال التمويل متاح للشهر الحالي المفتوح فقط.');
 const targets=livingTargets();
 if(!Object.keys(targets).length)throw Error('حدد ميزانية المعيشة أولاً.');
 const needed=livingNeeds(targets),available=currentStats().unallocated,shortfall=Math.max(0,needed.additional-available);
 if(!needed.additional){toast('خطة المصروف مكتملة التمويل بالفعل.');return;}
 if(shortfall){
  modal('خطة محفوظة · بانتظار التمويل','لا تحتاج لتقليل سقوف المعيشة بسبب نقص الرصيد.',
   `<div class="notice warn">المطلوب لاستكمال التخصيص: <b>${money(needed.additional)}</b> · المتاح: <b>${money(available)}</b> · النقص: <b>${money(shortfall)}</b>.</div>
    <p class="wf-help">أضف مبلغاً تحت «أخرى» بعد استلامه فعلياً، ثم عد إلى «استكمال التمويل». لا يضاف مبلغ متوقع إلى الرصيد.</p>
    <div class="form-actions">${btn('wf-living-extra','إضافة مصدر آخر','income')}${btn('close','إغلاق','arrow','secondary')}</div>`);
  return;
 }
 confirmModal('استكمال تمويل ميزانية المعيشة؟',
  'سيُوزَّع '+fmt(needed.additional)+' '+unit()+' من الرصيد المتاح على الأقسام حسب السقوف المثبتة، دون خصم جديد من البطاقة أو النقد.',
  ()=>act(n=>{
   if(n.settings.closedMonths?.[wfMonth])throw Error('الشهر مغلق مالياً.');
   const funding=fundLivingTargets(n,livingTargets(wfMonth,n),wfMonth);
   if(funding.pending)throw Error('تغيّر الرصيد المتاح؛ راجع التمويل من جديد.');
   return funding.next;
  },'تم استكمال توزيع الميزانية على الأقسام دون خصم نقدي مزدوج'),'تأكيد التمويل');
}
function wfLivingExtra(){
 if(state.demo)throw Error('ابدأ الخطة الفعلية أولاً.');
 modal('إضافة مصدر آخر للمعيشة','سجّل مبلغاً استلمته فعلياً خارج الراتب أو الحوافز، ثم استخدم «استكمال التمويل» لتغطية سقوف المعيشة.',
  `<div class="form-grid">${amountField()}${select('مكان الاستلام','method',methodOptions)}${dateField()}</div>
   <div class="notice">سيظهر الوصف «أخرى» فقط في السجل والكشف. لا يُحتسب المبلغ قبل استلامه، ولا يُخصص لمحفظة دون موافقتك.</div>
   <div class="field"><label><input type="checkbox" name="approve" value="yes" required> أؤكد استلام المبلغ فعلياً</label></div>`,
  f=>{
   if(f.approve!=='yes')throw Error('يجب تأكيد استلام المبلغ.');
   act(n=>commitEvent(n,{type:'income',amount:amount(f.amount),date:f.date,method:f.method,note:'أخرى'}),
     'تم تسجيل «أخرى» ضمن المتاح للمعيشة');
  },'تأكيد استلام المصدر الآخر');
}
function wfLivingReport(){
 const {start,end,previous}=reportingPeriod();
 if(!window.ThukhrPDF||typeof window.ThukhrPDF.download!=='function')
  throw Error('مكوّن PDF غير متاح. تأكد من تحميل التطبيق كاملاً.');
 const opening=E.statsAt(state,previous),closing=E.statsAt(state,end);
 const rows=state.transactions.filter(t=>t.date>=start&&t.date<=end).slice().sort((a,b)=>a.date.localeCompare(b.date));
 const sum=k=>rows.filter(t=>t.type===k).reduce((n,t)=>n+t.amount,0);
 const corrections=(state.settings.emergencyCorrections||[]).filter(c=>c.correctedAt>=start&&c.correctedAt<=end);
 const types={income:'دخل مستلم',expense:'مصروف',pay:'سداد التزام',reserve:'حجز التزام',
  unreserve:'إلغاء حجز',allocate:'تخصيص',release:'إرجاع للمتاح',
  transfer:'تحويل',account:'نقل نقد/بطاقة',withheld:'استقطاع من المصدر'};
 const label=t=>t.walletId?state.wallets.find(w=>w.id===t.walletId)?.name||'':
  t.obligationId?state.obligations.find(o=>o.id===t.obligationId)?.name||'':'';
 const data={
  period:wfMonth,from:start,to:end,issuedAt:new Date().toLocaleString('ar-IQ'),currency:unit(),brand:'فِرزة',
  stats:{opening:fmt(opening.total),income:fmt(sum('income')),expenses:fmt(sum('expense')),
   paid:fmt(sum('pay')),withheld:fmt(sum('withheld')),total:fmt(closing.total),
   available:fmt(closing.unallocated),reserved:fmt(Object.values(closing.reserved).reduce((n,v)=>n+v,0))},
  wallets:livingAllCategories().map(w=>({
   name:w.label,budget:fmt(livingTargets(wfMonth)[w.id]||0),
   spent:fmt(rows.filter(t=>t.type==='expense'&&t.walletId===w.id).reduce((n,t)=>n+t.amount,0)),
   balance:fmt(closing.wallets[w.id]||0)
  })),
  entries:[...rows.map(t=>({id:t.id,date:t.date,type:types[t.type]||t.type,category:label(t),
   note:t.note||t.sourceName||label(t)||'—',amount:fmt(t.amount)})),
   ...corrections.map(c=>({date:c.correctedAt,type:'تصحيح طوارئ (مذكرة)',category:'الطوارئ',
    note:'سبب التصحيح: '+c.reason+' · الأصل '+c.original.id,amount:fmt(c.original.amount)}))
  ].sort((a,b)=>a.date.localeCompare(b.date))
 };
 toast('جارٍ إنشاء تقرير الشهر...');
 Promise.resolve(window.ThukhrPDF.download(data))
  .then(info=>toast('تم تنزيل كشف الشهر — '+info.pages+' صفحة'))
  .catch(e=>showError('فشل إنشاء PDF: '+(e?.message||'خطأ غير معروف')));
}
function exportFinanceCsv(){
 const {start,end}=reportingPeriod(),rows=state.transactions.filter(t=>t.date>=start&&t.date<=end);
 const header=['المعرف','التاريخ','النوع','المبلغ','الحساب','المحفظة','الالتزام','المصدر','فترة الاستحقاق','الملاحظة','السبب الطارئ'];
 const lines=[header,...rows.map(t=>[t.id,t.date,t.type,inputMoney(t.amount),
  t.method||'',t.walletId||'',t.obligationId||'',t.sourceId||'',t.incomePeriod||'',t.note||'',t.emergencyAuthorization?.reason||''])];
 const quote=x=>'"'+String(x??'').replace(/"/g,'""').replace(/^[=+@\-]/,m=>"'"+m)+'"';
 download('thukhr-financial-'+wfMonth+'.csv','\uFEFF'+lines.map(x=>x.map(quote).join(',')).join('\r\n'),'text/csv');
 toast('تم تنزيل قيود الشهر بالتفصيل');
}

function wfLivingDirect(initialId='',quick=false){
 if(state.demo)throw Error('ابدأ الخطة الفعلية أولاً قبل تسجيل المصروف.');
 if(!livingCategories().length)throw Error('أضف قسماً للمعيشة قبل تسجيل المصروف.');
 const stats=currentStats(),usable=livingCategories().filter(w=>(state.wallets.find(x=>x.id===w.id)?.kind||w.kind)==='spend').reduce((sum,w)=>sum+(stats.wallets[w.id]||0),0)+stats.unallocated;
 if(usable<=0)throw Error('لا يوجد رصيد قابل للصرف. راجع حجوزاتك أو سجّل استلام مبلغ أولاً.');
 const options=livingCategories().filter(w=>(state.wallets.find(x=>x.id===w.id)?.kind||w.kind)==='spend').map(w=>[w.id,w.label]);
 const lastExpense=state.transactions.filter(t=>t.type==='expense'&&['cash','card'].includes(t.method)).slice(-1)[0];
 const suggestedMethod=lastExpense?.method||'card';
 if(!options.length)throw Error('أضف قسماً للصرف اليومي؛ خزنة الطوارئ لا تظهر في الصرف السريع.');
 modal(quick?'صرف سريع':'إضافة مصروف',quick?'المبلغ والقسم وطريقة الدفع فقط، وتاريخ الصرف يُضبط تلقائياً على اليوم.':'لا تحتاج تحديد ميزانية الشهر أولاً. يُخصم المصروف من المتبقي غير المحجوز، ويُحتسب ضمن ميزانية الشهر لاحقاً.',
  `<div class="form-grid ${quick?"thukhr-quick-form":""}">
   ${select('نوع المصروف','walletId',options,options.some(x=>x[0]===initialId)?initialId:options[0][0])}
   ${amountField()}
   ${select('طريقة الدفع','method',methodOptions,suggestedMethod)}
   ${quick?'<input type="hidden" name="date" value="'+today()+'">':dateField()}
   <div class="full">${field(quick?'الوصف (اختياري)':'على ماذا صرفت؟','note','text','',quick?'maxlength="120" placeholder="مثلاً: قهوة أو مشتريات"':'required maxlength="120" placeholder="مثلاً شراء خضروات للمنزل"')}</div>
   <div class="field full"><label><input type="checkbox" name="duplicateApproved" value="yes"> أؤكد أن العملية مستقلة إذا سبق تسجيل مبلغ ووصف مطابقين اليوم</label></div></div>
   <div class="notice">المتاح غير المحجوز: <b>${money(stats.unallocated)}</b>. إذا كانت المحفظة لا تكفي، يمول فِرزة فقط مقدار النقص من المتبقي عند تأكيد الصرف، دون حجز إضافي أو خصم مزدوج.</div>`,
  f=>{
   const wallet=livingCategories().find(w=>w.id===f.walletId);
   if(!wallet|| (state.wallets.find(w=>w.id===wallet.id)?.kind||wallet.kind)!=='spend')throw Error('الطوارئ محمية من المصروف اليومي؛ افتح خزنة الطوارئ.');
   const value=amount(f.amount);
   if(duplicateExpense(state,{walletId:f.walletId,date:f.date,amount:value,method:f.method,note:f.note.trim()||'صرف سريع'})&&f.duplicateApproved!=='yes')
    throw Error('هذا المصروف مطابق لحركة أخرى اليوم. فعّل تأكيد العملية المستقلة إذا كان صرفاً مختلفاً.');
   if(!['cash','card'].includes(f.method))throw Error('اختر البطاقة أو النقد.');
   act(n=>{
    const now=E.stats(n),balance=now.wallets[wallet.id]||0,fromRemaining=Math.max(0,value-balance);
    if(fromRemaining>now.unallocated)throw Error('رصيد المعيشة المتاح لا يكفي. المبلغ المتبقي '+money(now.unallocated)+'، والمتوفر في هذه المحفظة '+money(balance)+'.');
    if(value>now[f.method])throw Error('رصيد '+(f.method==='card'?'البطاقة':'النقد')+' غير كافٍ لهذا المصروف.');
    let next=n;
    if(!next.wallets.some(x=>x.id===wallet.id)){
     next.wallets.push({id:wallet.id,name:wallet.label,kind:wallet.kind,color:wallet.color,weight:0});
    }
    const salary=S.receipts(next,'salary',f.date.slice(0,7)).slice().sort((a,b)=>a.date.localeCompare(b.date))[0];
    const stage=salary&&f.date>=salary.date?'الراتب':'الحوافز';
    if(fromRemaining)next=commitEvent(next,{type:'allocate',walletId:wallet.id,amount:fromRemaining,date:f.date,
      note:'تمويل مصروف مباشر · من '+stage+' · '+wallet.label});
    return commitEvent(next,{type:'expense',walletId:wallet.id,amount:value,method:f.method,
      date:f.date,note:f.note.trim()||'صرف سريع'});
   },'تم تسجيل المصروف من المتبقي واحتسابه ضمن ميزانية الشهر');
  },'تأكيد صرف المبلغ');
}
function quickExpenseBuild(original,draft){
 if(JSON.stringify(original)!==draft.base)throw Error('تغيّرت بياناتك أثناء إعداد السلة؛ أعد فتح الصرف السريع.');
 if(original.demo)throw Error('ابدأ الخطة الفعلية أولاً.');
 if(draft.date!==today()||draft.date<original.cycle.start||
    original.settings.closedMonths?.[draft.date.slice(0,7)])
  throw Error('تاريخ الصرف خارج الدورة الحالية المفتوحة.');
 if(!['card','cash'].includes(draft.method))throw Error('اختر طريقة دفع صحيحة.');
 if(!Array.isArray(draft.items)||!draft.items.length||draft.items.length>20)
  throw Error('عدد البنود يجب أن يكون بين 1 و20 بنداً.');
 const available=livingCategories(original).filter(w=>(original.wallets.find(x=>x.id===w.id)?.kind||w.kind)==='spend');
 const wallets=new Map(available.map(w=>[w.id,w]));
 const items=draft.items.map(row=>{
  const wallet=wallets.get(row.walletId),value=Number(row.amount),note=String(row.note||'').trim();
  if(!wallet)throw Error('القسم غير صالح أو محمي من الصرف السريع.');
  if(!Number.isSafeInteger(value)||value<=0)throw Error('أدخل مبلغاً صحيحاً موجباً لكل بند.');
  if(note.length>120)throw Error('وصف البند يجب ألا يتجاوز 120 حرفاً.');
  return {walletId:wallet.id,label:wallet.label,amount:value,note:note||'صرف سريع'};
 });
 const total=items.reduce((n,row)=>n+row.amount,0),availableCash=E.stats(original)[draft.method];
 if(!Number.isSafeInteger(total)||total>availableCash)
  throw Error('مجموع البنود أكبر من رصيد '+(draft.method==='cash'?'النقد':'البطاقة')+' المتوفر.');
 let next=structuredClone(original),funded=0,duplicates=0;
 for(const row of items){
  if(duplicateExpense(next,{...row,date:draft.date,method:draft.method})){
   duplicates++;
   if(!draft.duplicateApproved)throw Error('يوجد بند مطابق في السجل أو داخل السلة. أكّد أن البنود المتشابهة عمليات مستقلة.');
  }
  const stats=E.stats(next),wallet=wallets.get(row.walletId);
  const current=stats.wallets[row.walletId]||0,required=Math.max(0,row.amount-current);
  if(required>stats.unallocated)throw Error('رصيد المعيشة غير المحجوز لا يكفي لبند '+wallet.label+'؛ المتاح '+stats.unallocated+'.');
  if(row.amount>stats[draft.method])throw Error('رصيد طريقة الدفع غير كافٍ لبند '+wallet.label+'.');
  if(!next.wallets.some(w=>w.id===wallet.id))
   next.wallets.push({id:wallet.id,name:wallet.label,kind:wallet.kind,color:wallet.color,weight:0});
  if(required){
   next=commitEvent(next,{type:'allocate',date:draft.date,walletId:wallet.id,amount:required,
    note:'تمويل الصرف السريع المجمع · '+wallet.label});
   funded+=required;
  }
  next=commitEvent(next,{type:'expense',walletId:wallet.id,amount:row.amount,
   method:draft.method,date:draft.date,note:row.note});
 }
 E.validate(next);
 return {next,total,items,funded,duplicates,before:E.stats(original),after:E.stats(next)};
}
function quickExpenseItemHtml(row,index,options){
 return `<div class="thukhr-quick-item" data-quick-item="${index}">
 <div class="thukhr-quick-item-head"><strong>البند <span data-quick-number>${index+1}</span></strong>
 <button type="button" class="btn small secondary" data-quick-remove aria-label="حذف البند">حذف</button></div>
 <div class="thukhr-quick-item-grid">
 ${select('القسم','quick-wallet-'+index,options,row.walletId).replace('<select ','<select data-quick-wallet ')}
 ${moneyField('المبلغ','quick-amount-'+index,row.amount?inputMoney(row.amount):'','required').replace('<input ','<input data-quick-amount ')}
 <div class="thukhr-quick-note">${field('تفاصيل البند (اختياري)','quick-note-'+index,'text',row.note||'','maxlength="120" placeholder="مثلاً: خضروات أو قهوة"').replace('<input ','<input data-quick-note ')}</div>
 </div></div>`;
}
function quickExpenseEditor(draft){
 if(state.demo)throw Error('ابدأ الخطة الفعلية أولاً.');
 const options=livingCategories().filter(w=>(state.wallets.find(x=>x.id===w.id)?.kind||w.kind)==='spend').map(w=>[w.id,w.label]);
 if(!options.length)throw Error('أضف قسماً للصرف اليومي أولاً؛ الطوارئ خارج الصرف السريع.');
 let counter=0;
 const rowHtml=(row)=>quickExpenseItemHtml(row,counter++,options);
 const monthly=livingBudgetSummary(today().slice(0,7));
 const stats=currentStats();
 modal('صرف سريع · عدة بنود','سجّل عدة مشتريات دفعة واحدة، ثم راجع المجموع قبل اعتماد أي حركة.',
 `<div class="thukhr-quick-month">
  <span>ميزانية المصروف المحددة للشهر <b>${money(monthly.total)}</b></span>
  <small>سقف تخطيطي؛ ليس رصيداً إضافياً للإنفاق</small></div>
  <div id="quickItems" class="thukhr-quick-items">${draft.items.map(rowHtml).join('')}</div>
  <button type="button" id="quickAddItem" class="btn secondary thukhr-quick-add">+ إضافة بند آخر</button>
  <div class="thukhr-quick-paymethod">${select('طريقة الدفع لجميع البنود','method',methodOptions,draft.method)}</div>
  <div class="thukhr-quick-total"><span>مجموع سلة الصرف</span><strong id="quickTotal" aria-live="polite">0</strong></div>
  <div class="notice">المتاح غير المحجوز: <b>${money(stats.unallocated)}</b> · رصيد طريقة الدفع يُراجع عند التأكيد. لا يُسحب من خزنة الطوارئ.</div>
  <div class="field"><label><input type="checkbox" name="duplicateApproved" value="yes" ${draft.duplicateApproved?'checked':''}> أؤكد أن البنود المتشابهة، إن وجدت، مصروفات منفصلة فعلاً</label></div>`,
 (f,form)=>{
  const nodes=[...form.querySelectorAll('.thukhr-quick-item')];
  const items=nodes.map(node=>({
   walletId:node.querySelector('[data-quick-wallet]').value,
   amount:amount(node.querySelector('[data-quick-amount]').value),
   note:node.querySelector('[data-quick-note]').value.trim()
  }));
  const nextDraft={...draft,items,method:f.method,duplicateApproved:f.duplicateApproved==='yes'};
  const result=quickExpenseBuild(state,nextDraft);
  quickExpenseReview(nextDraft,result);
 },'مراجعة مجموع الصرف');
 const itemsRoot=$('quickItems'),addButton=$('quickAddItem'),totalNode=$('quickTotal');
 const refresh=()=>{
  const nodes=[...itemsRoot.querySelectorAll('.thukhr-quick-item')];let sum=0;
  nodes.forEach((node,i)=>{
   node.querySelector('[data-quick-number]').textContent=i+1;
   const input=node.querySelector('[data-quick-amount]');
   try{sum+=amount(input.value,true)}catch{}
  });
  totalNode.textContent=fmt(sum)+' '+unit();
  addButton.disabled=nodes.length>=20;
  for(const remove of itemsRoot.querySelectorAll('[data-quick-remove]'))remove.disabled=nodes.length===1;
 };
 itemsRoot.addEventListener('input',refresh);
 itemsRoot.addEventListener('change',refresh);
 itemsRoot.addEventListener('click',e=>{
  const remove=e.target.closest('[data-quick-remove]');
  if(!remove)return;
  if(itemsRoot.querySelectorAll('.thukhr-quick-item').length<=1)return;
  remove.closest('.thukhr-quick-item').remove();refresh();
 });
 addButton.onclick=()=>{
  if(itemsRoot.querySelectorAll('.thukhr-quick-item').length>=20)return;
  const markup=rowHtml({walletId:options[0][0],amount:0,note:''});
  itemsRoot.insertAdjacentHTML('beforeend',markup);
  wireMoneyInputs(itemsRoot);
  refresh();
  itemsRoot.lastElementChild?.querySelector('[data-quick-amount]')?.focus({preventScroll:true});
 };
 wireMoneyInputs(itemsRoot);refresh();
}
function quickExpenseReview(draft,result){
 const monthly=livingBudgetSummary(draft.date.slice(0,7)),method=draft.method==='cash'?'النقد':'البطاقة';
 modal('مراجعة سلة الصرف','لن تُحفظ أي حركة قبل موافقتك النهائية.',
 `<div class="thukhr-quick-review">${result.items.map((item,i)=>`<div class="thukhr-quick-review-line">
  <span>${i+1}. ${safe(item.label)}<small>${safe(item.note)}</small></span><b>${money(item.amount)}</b></div>`).join('')}</div>
 <div class="thukhr-quick-total"><span>إجمالي الصرف من ${method}</span><strong>${money(result.total)}</strong></div>
 <p class="wf-help">ميزانية المعيشة الشهرية: ${money(monthly.total)} · التمويل الإضافي من المتاح: ${money(result.funded)}. التمويل الداخلي ليس مصروفاً ثانياً.</p>
 <div class="field"><label><input type="checkbox" name="confirm" value="yes" required> أوافق على تسجيل ${result.items.length} بنداً وإجمالي ${fmt(result.total)} ${unit()} مرة واحدة</label></div>`,
 f=>{
  if(f.confirm!=='yes')throw Error('الموافقة على سلة الصرف إلزامية.');
  act(n=>quickExpenseBuild(n,draft).next,'تم تسجيل '+result.items.length+' مصروفات بمجموع '+fmt(result.total)+' '+unit());
 },'تأكيد صرف المجموع');
 $('modalForm').insertAdjacentHTML('beforeend','<button type="button" class="btn secondary thukhr-quick-back" id="quickBack">الرجوع لتعديل البنود</button>');
 $('quickBack').onclick=()=>quickExpenseEditor(draft);
}
function wfLivingQuick(){
 const spend=livingCategories().filter(w=>(state.wallets.find(x=>x.id===w.id)?.kind||w.kind)==='spend');
 if(!spend.length)throw Error('أضف قسماً للصرف اليومي أولاً.');
 const last=state.transactions.filter(t=>t.type==='expense'&&['cash','card'].includes(t.method)).slice(-1)[0];
 quickExpenseEditor({base:JSON.stringify(state),date:today(),method:last?.method||'card',
  items:[{walletId:spend[0].id,amount:0,note:''}],duplicateApproved:false});
}
function wfLivingExpense(id){
 if(!livingCategories().some(w=>w.id===id))throw Error('اختر قسماً من أقسام المصروف.');
 if(state.wallets.find(w=>w.id===id)?.kind==='emergency')throw Error('الطوارئ محمية. افتح خزنة الطوارئ للصرف الموثق.');
 if(!state.wallets.some(w=>w.id===id))throw Error('المحفظة لم تُنشأ بعد؛ خصص لها مبلغاً أولاً.');
 if((currentStats().wallets[id]||0)<=0)throw Error('رصيد هذه المحفظة صفر؛ خصص مبلغاً قبل تسجيل مصروف.');
 openExpense(id);
}

function wfPay(id){
 if(!monthlyAllFields().some(x=>id===wfObId(wfMonth,x.key)))throw Error('هذا الحجز ليس ضمن دورة الشهر المعروضة.');
 obligationAction('pay',id);
}
