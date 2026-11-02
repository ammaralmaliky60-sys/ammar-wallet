/* فِرزة — app/lite.js
 * Firza Lite (simple mode): view mode, simplified numbers, pages, onboarding and budget editing.
 * Classic script: shares the global scope with the other app/*.js files, loaded in the order listed in index.html. */
'use strict';
function dashboardFinancialSummary(st=state,month=today().slice(0,7)){
 const stats=E.stats(st),projection=monthlyCommitmentProjection(st,month),living=livingBudgetSummary(month,st);
 const receipts={salary:S.receipts(st,'salary',month),incentives:S.receipts(st,'incentives',month)};
 const income={salary:receipts.salary.reduce((n,t)=>n+t.amount,0),
  incentives:receipts.incentives.reduce((n,t)=>n+t.amount,0)};
 const spent=st.transactions.filter(t=>t.type==='expense'&&t.date?.slice(0,7)===month)
  .reduce((n,t)=>n+t.amount,0);
 const livingSpent=st.transactions.filter(t=>t.type==='expense'&&t.date?.slice(0,7)===month&&
  living.rows.some(r=>r.id===t.walletId)).reduce((n,t)=>n+t.amount,0);
 const reserved=Object.values(stats.reserved).reduce((n,v)=>n+v,0);
 const allocated=Object.values(stats.wallets).reduce((n,v)=>n+v,0);
 const covered=projection.entries.reduce((n,o)=>n+o.covered,0);
 const isSalaryOnly=wfIncomeMode(month,st)==='salary-only';
 const monthRows=living.rows.map(row=>{
  const actual=st.transactions.filter(t=>t.type==='expense'&&t.walletId===row.id&&t.date?.slice(0,7)===month).reduce((n,t)=>n+t.amount,0);
  return {...row,spent:actual,remaining:Math.max(0,row.amount-actual),pct:row.amount?Math.min(100,Math.round(actual/row.amount*100)):0};
 });
 return {month,stats,projection,living,receipts,income,spent,livingSpent,
  reserved,allocated,covered,monthRows,isSalaryOnly,
  coveragePct:projection.plannedTotal?Math.min(100,Math.round(covered/projection.plannedTotal*100)):0,
  livingPct:living.total?Math.min(100,Math.round(livingSpent/living.total*100)):0};
}
function firzaMonthSelector(month=wfMonth){
 return `<div class="fz-month-select"><label for="wfMonth">شهر المتابعة</label><input type="month" id="wfMonth" value="${safe(month)}" max="${today().slice(0,7)}"><small>${safe(arabicMonth(month))}</small></div>`;
}

const FIRZA_VIEW_KEY='firza-view-mode-v1';
function firzaViewMode(){
 try{return localStorage.getItem(FIRZA_VIEW_KEY)==='advanced'?'advanced':'simple'}
 catch{return 'simple'}
}
function setFirzaViewMode(mode){
 if(!['simple','advanced'].includes(mode))throw Error('وضع العرض غير معروف.');
 try{localStorage.setItem(FIRZA_VIEW_KEY,mode)}
 catch{toast('تعذّر حفظ تفضيل الواجهة؛ سيعود الوضع البسيط عند إعادة الفتح.')}
 location.hash='dashboard';render();
}
const SIMPLE_NAVS=[['dashboard','grid','الرئيسية'],['fixed','calendar','الثوابت'],['living','wallet','المصروف'],['reports','chart','التقارير']];
function simpleFinancialNumbers(st=state,month=today().slice(0,7)){
 const stats=E.stats(st),projection=monthlyCommitmentProjection(st,month),plan=livingBudgetSummary(month,st);
 const paid=st.transactions.filter(t=>t.type==='pay'&&t.date?.slice(0,7)===month)
   .reduce((sum,t)=>sum+t.amount,0);
 const expenses=st.transactions.filter(t=>t.type==='expense'&&t.date?.slice(0,7)===month)
   .reduce((sum,t)=>sum+t.amount,0);
 const income=st.transactions.filter(t=>t.type==='income'&&(t.incomePeriod||t.date?.slice(0,7))===month)
   .reduce((sum,t)=>sum+t.amount,0);
 const ready=Math.max(0,stats.unallocated-projection.uncovered);
 return {stats,projection,plan,paid,expenses,income,ready,
  shortage:Math.max(0,projection.uncovered-stats.unallocated)};
}
function simpleDashboardPage(){
 const info=simpleFinancialNumbers(),m=today().slice(0,7),mode=wfIncomeMode(m);
 const receipt=source=>S.receipts(state,source,m);
 const cash=info.stats;
 const salary=receipt('salary'),incentive=mode==='salary-only'?[]:receipt('incentives');
 const totalIncome=(xs)=>xs.reduce((sum,x)=>sum+x.amount,0);
 const lines=[
 ['الثوابت لهذا الشهر',info.projection.plannedTotal,'#fixed'],
 ['ميزانية المصروف المحددة',info.plan.total,'#living'],
 ['المصروف المسجّل',info.expenses,'#living']
 ];
 return head('فِرزة · الرئيسية','استلم دخلك، أضف ثوابتك، وسجّل مصروفك. الباقي يحسبه التطبيق.',
  '<button class="btn secondary" type="button" data-action="settings">'+icon('settings')+'الإعدادات</button>','fz-simple-heading')+
  '<div class="fz-lite">'+
  '<section class="fz-lite-hero"><span>المتاح بعد الالتزامات غير المغطاة</span>'+
    '<strong>'+money(info.ready)+'</strong>'+
    '<p>المبلغ الحر غير المخصص بعد طرح الالتزامات غير المغطاة، وليس مجموع أموال المحفظة. إذا كان عندك عجز، يظهر أدناه.</p>'+
    '<div class="fz-lite-hero-split"><span>الرصيد الفعلي <b>'+money(cash.total)+'</b></span>'+
    '<span>المتاح غير الموزع <b>'+money(cash.unallocated)+'</b></span></div></section>'+
  (info.shortage?'<div class="notice warn">توجد التزامات غير مغطاة تتجاوز المتاح بمقدار <b>'+money(info.shortage)+'</b>. لا يضيف النظام رصيداً وهمياً.</div>':'')+
  '<section class="fz-lite-income"><div class="fz-lite-section-header"><h2>الدخل</h2><span>'+safe(arabicMonth(m))+'</span></div><div class="fz-lite-two">'+
    '<article class="fz-lite-income-card"><span>الراتب</span><strong>'+money(totalIncome(salary))+'</strong>'+
    '<small>'+(salary.length?'تم تسجيل الاستلام':'لم يُستلم بعد')+'</small>'+
    (!salary.length&&!state.demo?'<button class="btn" data-action="simple-salary-income">استلمت الراتب</button>':'<span class="fz-lite-text-link">الراتب مسجل</span>')+'</article>'+
    '<article class="fz-lite-income-card"><span>الحافز</span><strong>'+(mode==='salary-only'?'غير مشمول':money(totalIncome(incentive)))+'</strong>'+
    '<small>'+(mode==='salary-only'?'خطة راتب فقط':incentive.length?'تم تسجيل الاستلام':'اختياري')+'</small>'+
    (mode!=='salary-only'&&!incentive.length&&!state.demo?'<button class="btn secondary" data-action="simple-incentive-income">استلمت الحافز</button>':
     mode==='salary-only'?'<button class="btn secondary" data-action="wf-income-mode">تفعيل الحافز</button>':'<span class="fz-lite-text-link">الحافز مسجل</span>')+'</article>'+
  '</div></section>'+
  '<section class="fz-lite-quick"><button class="btn" data-action="wf-living-quick">'+icon('plus')+' صرف سريع · عدة بنود</button>'+
    '<button class="btn secondary" data-action="simple-extra-income">'+icon('income')+' إضافة دخل آخر</button></section>'+
  '<section class="fz-lite-summary"><div class="fz-lite-section-header"><h2>ملخص الشهر</h2><a href="#reports">التقرير ←</a></div>'+
    lines.map(([label,value,href])=>'<a class="fz-lite-summary-row" href="'+href+'"><span>'+label+'</span><b>'+money(value)+'</b></a>').join('')+
    '<div class="fz-lite-summary-row"><span>الثوابت التي ما زالت دون تغطية</span><b>'+money(info.projection.uncovered)+'</b></div>'+
    '<div class="fz-lite-note">المصروفات والثوابت المدفوعة فعلياً تنعكس في الرصيد الحالي. لا يُطرح المبلغ المدفوع مرة ثانية.</div></section>'+
  '<section class="fz-lite-shortcuts"><a href="#fixed">'+icon('calendar')+' إدارة الثوابت</a><a href="#living">'+icon('wallet')+' ميزانية المصروف</a><a href="#reports">'+icon('chart')+' تقرير الشهر</a></section>'+
  '</div>';
}
function simpleFixedPage(){
 const month=today().slice(0,7),p=monthlyCommitmentProjection(state,month),fields=monthlyAllFields();
 const rows=p.entries.map(item=>{
  const f=fields.find(f=>wfObId(month,f.key)===item.id);
  return '<article class="fz-lite-ob-row"><div><strong>'+safe(item.label)+'</strong>'+
   '<small>'+(f?monthlyFieldStageLabel(f):'استحقاق مسجل')+
    (f?' · '+(f.autoDeduct===true?'سداد تلقائي':'سداد يدوي'):'')+'</small>'+
   '<small>أصل المبلغ '+money(item.amount)+' · المغطى '+money(item.covered)+'</small></div>'+
   '<div class="fz-lite-ob-side"><b>'+money(item.uncovered)+'</b><small>غير مغطى</small>'+
   (f&&!state.demo?'<button class="btn small secondary" data-action="fixed-edit" data-id="'+safe(f.key)+'">تعديل</button>':'')+
   '</div></article>';
 }).join('');
 const editable=month===today().slice(0,7)&&!state.settings.closedMonths?.[month]&&!state.demo;
 return head('الثوابت','اسم الالتزام، المبلغ، ومن وين ينخصم. تختارها مرة والباقي تلقائي.',
  (editable?'<button class="btn" data-action="fixed-entry">'+icon('plus')+' إضافة التزام</button>':''))+
  '<div class="fz-lite"><section class="fz-lite-fixed-overview"><span>إجمالي الثوابت الشهرية</span>'+
  '<strong>'+money(p.plannedTotal)+'</strong>'+
  '<div class="fz-lite-fixed-metrics"><span>المغطى <b>'+money(p.plannedTotal-p.uncovered)+'</b></span>'+
  '<span>المتبقي <b>'+money(p.uncovered)+'</b></span></div>'+
  '</section><section class="fz-lite-list">'+(rows||'<div class="fz-lite-empty">'+icon('calendar')+
    '<strong>بعدك ما أضفت ثوابت</strong><p>اضغط «إضافة التزام» وحدد اسمه ومبلغه ومصدر الخصم.</p></div>')+'</section>'+
  '<p class="fz-lite-note">الخصم الآلي يسجّل سداداً داخل فِرزة عند تسجيل استلام الدفعة، إذا كان الحساب يكفي. لا يحوّل الأموال مصرفياً، ولا تُخصم مبالغ الاستقطاعات السابقة للإيداع مرتين.</p></div>';
}
function simpleLivingPage(){
 const month=today().slice(0,7),info=simpleFinancialNumbers();
 const rows=livingCategories().filter(w=>w.kind==='spend').map(w=>{
  const planned=Number(livingTargets(month)[w.id]||0);
  const spent=state.transactions.filter(t=>t.type==='expense'&&t.walletId===w.id&&t.date?.slice(0,7)===month)
    .reduce((sum,t)=>sum+t.amount,0);
  const leftover=Math.max(0,planned-spent),pct=planned?Math.min(100,Math.round(spent/planned*100)):0;
  const level=!planned?(spent?'over':'empty'):spent>planned?'over':pct>=80?'warn':'ok';
  const color=/^#[0-9a-f]{3,8}$/i.test(w.color||'')?w.color:'var(--th-accent)';
  return '<article class="fz-lite-living-row" data-level="'+level+'" style="--cat:'+color+'"><div class="fz-lite-living-head"><strong>'+safe(w.label)+'</strong>'+
   '<span>'+money(spent)+' من '+money(planned)+'</span></div>'+
   '<div class="fz-lite-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'" aria-label="'+safe(w.label)+'"><i style="width:'+pct+'%"></i></div>'+
   '<div class="fz-lite-living-foot">'+(level==='over'?'تجاوزت السقف بـ '+money(spent-planned):'المتبقي من السقف '+money(leftover))+'</div></article>';
 }).join('');
 const used=info.plan.total?Math.round(info.expenses/info.plan.total*100):0;
 const usedLevel=used>100?'over':used>=80?'warn':'ok';
 const meter=info.plan.total?'<div class="fz-lite-meter" data-level="'+usedLevel+'">'+
  '<div class="fz-lite-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.min(100,used)+'" aria-label="نسبة الصرف من الميزانية"><i style="width:'+Math.min(100,used)+'%"></i></div>'+
  '<span><b>'+used+'%</b> من الميزانية مصروف</span></div>':'';
 return head('المصروف','حدّد سقف كل قسم، ثم سجل مشترياتك اليومية بسهولة.',
  '<button class="btn" data-action="wf-living-quick">'+icon('plus')+' صرف سريع</button>')+
  '<div class="fz-lite"><section class="fz-lite-fixed-overview"><span>الميزانية الشهرية المحددة</span>'+
  '<strong>'+money(info.plan.total)+'</strong>'+meter+
  '<div class="fz-lite-fixed-metrics"><span>المصروف المسجّل <b>'+money(info.expenses)+'</b></span>'+
  '<span>المتاح غير الموزع <b>'+money(info.stats.unallocated)+'</b></span></div></section>'+
  '<section class="fz-lite-quick"><button class="btn" data-action="simple-budget-edit">'+icon('settings')+' تحديد الميزانية</button>'+
  '<button class="btn secondary" data-action="wf-category-manage">إدارة الأقسام</button></section>'+
  '<section class="fz-lite-list">'+(rows||'<p class="fz-lite-empty">ماكو أقسام صرف؛ أضف أول قسم من إدارة الأقسام.</p>')+'</section>'+
  '<p class="fz-lite-note">الميزانية سقف للتخطيط، وليست مالاً يضاف للحساب. الصرف الفعلي فقط ينقص الرصيد، وتبقى الطوارئ محمية.</p></div>';
}
function simpleReportPage(){
 const month=wfMonth;
 const period=reportingPeriod(month),rows=state.transactions.filter(t=>t.date>=period.start&&t.date<=period.end),
   opening=E.statsAt(state,period.previous),closing=E.statsAt(state,period.end);
 const sum=type=>rows.filter(t=>t.type===type).reduce((s,t)=>s+t.amount,0);
 return head('التقرير الشهري','كشف واضح للدخل والمصروف والثوابت دون تفاصيل محاسبية معقدة.',
  '<button class="btn" data-action="wf-living-pdf">'+icon('download')+' تنزيل PDF</button>')+
  '<div class="fz-lite"><section class="fz-lite-report-head">'+firzaMonthSelector(month)+
  '<h2>'+safe(arabicMonth(month))+'</h2><p>الحركات حتى نهاية الشهر المختار.</p></section>'+
  '<section class="fz-lite-report-grid">'+[
    ['بداية الشهر',opening.total],['الدخل المستلم',sum('income')],
    ['المصروف',sum('expense')],['الثوابت المسددة',sum('pay')],
    ['نهاية الشهر',closing.total]
  ].map(([label,v])=>'<article><span>'+label+'</span><strong>'+money(v)+'</strong></article>').join('')+
  '</section><div class="fz-lite-note">الاستقطاعات من المصدر قبل وصول الصافي توثيق فقط، ولا تخصم مرة ثانية من رصيد الحساب. يمكنك مراجعة الحركات الكاملة في الوضع المتقدم.</div></div>';
}
function simpleReceiveIncome(stage='salary'){
 if(state.demo)throw Error('ابدأ حسابك الفعلي أولاً.');
 if(!['salary','incentives','other'].includes(stage))throw Error('نوع الدخل غير صالح.');
 const month=today().slice(0,7),chosen=stage!=='other'?S.sources(state).find(x=>x.id===stage):null;
 if(stage!=='other'&&!chosen)throw Error('مصدر الدخل غير متاح.');
 if(stage==='incentives'&&wfIncomeMode(month)==='salary-only')throw Error('خطة هذا الشهر تعتمد راتباً فقط.');
 if(chosen&&S.receipts(state,stage,month).length)throw Error('هذه الدفعة مستلمة ومسجلة بالفعل.');
 if(state.settings.closedMonths?.[month])throw Error('شهر الاستلام مغلق.');
 const title=stage==='salary'?'الراتب':stage==='incentives'?'الحافز':'دخل آخر';
 const msg=stage==='other'?'يدخل المبلغ الفعلي في رصيدك عند الحفظ.':'بعد حفظ الاستلام تُسجّل خصومات الثوابت المفعّلة تلقائياً، دون خطوة سداد ثانية.';
 modal('استلام '+title,'أدخل فقط المبلغ الذي وصل فعلياً ومكان وصوله.',
  '<div class="form-grid">'+amountField()+
  select('استلمت المبلغ في','method',methodOptions,'card')+
  (stage==='other'?field('وصف مختصر','note','text','دخل إضافي','maxlength="90"'):'')+
  '</div><div class="notice">'+msg+' لا تُنشئ هذه الشاشة راتباً أو حافزاً متوقعاً.</div>',
  f=>act(st=>{
   if(st.settings.closedMonths?.[month])throw Error('شهر الاستلام مغلق.');
   if(chosen&&S.receipts(st,stage,month).length)throw Error('تم تسجيل الدفعة سابقاً؛ لا تكررها.');
   if(stage==='incentives'&&wfIncomeMode(month,st)==='salary-only')throw Error('خطة راتب فقط.');
   if(!['card','cash'].includes(f.method))throw Error('اختر حساب الاستلام.');
   const value=amount(f.amount);
   let next=commitEvent(st,{type:'income',amount:value,date:today(),method:f.method,
    note:stage==='other'?String(f.note||'دخل إضافي').trim():chosen.name,
    ...(chosen?{sourceId:stage,sourceName:chosen.name,incomePeriod:month}:{})});
   if(chosen){
    next.settings.wfIncomeModes={...(next.settings.wfIncomeModes||{}),[month]:wfIncomeMode(month,st)};
    next=autoFixedSettlement(next,stage,month,f.method,today()).next;
   }
   return next;
  },'تم تسجيل '+title+' ومحاسبة الثوابت المفعّلة تلقائياً.'),'حفظ الاستلام');
}

function simpleSetupStart(){
 if(state.transactions.length||state.obligations.length||state.history.length){
  throw Error('هذه المساحة تحتوي بيانات سابقة. لاستبدالها استخدم «تهيئة البيانات» من الإعدادات مع نسخة احتياطية.');
 }
 modal('ابدأ مع فِرزة','ثلاث معلومات تكفي. تقدر تضيف الثوابت والميزانية بعد البداية.',
  '<div class="form-grid">'+
   field('اسم اختياري','name','text',state.settings.name||'','maxlength="40"')+
   select('نوع دخلك','incomeMode',[['salary-only','راتب فقط'],['both','راتب وحافز']],state.settings.wfDefaultIncomeMode||'salary-only')+
   moneyField('رصيد البداية الموجود فعلياً','opening','0','required')+
   select('مكان الرصيد','method',methodOptions,'card')+
  '</div><div class="notice">رصيد البداية مبلغ موجود فعلياً، مو راتب مستقبلي. إذا ما عندك مبلغ حالياً خله صفر، وبعدها سجّل الراتب أو الحافز وقت استلامه. ما نضيف أي التزامات جاهزة.</div>',
  f=>{
   if(state.transactions.length||state.obligations.length||state.history.length)
    throw Error('تغيّرت بيانات المساحة. أعد فتح النموذج.');
   if(!['both','salary-only'].includes(f.incomeMode))throw Error('اختر نوع الدخل.');
   const opening=amount(f.opening,true);
   if(!['card','cash'].includes(f.method))throw Error('اختر مكان الرصيد.');
   let next=E.initial();next.demo=false;
   next.settings={...next.settings,name:String(f.name||'').trim().slice(0,40),
    currency:state.settings.currency,digits:state.settings.digits,
    wfDefaultIncomeMode:f.incomeMode,wfIncomeModeSince:today().slice(0,7),
    wfIncomeModes:{[today().slice(0,7)]:f.incomeMode},
    wfFields:[],wfHiddenFields:[]};
   next.cycle={...next.cycle,start:today(),days:30};
   if(opening)next=commitEvent(next,{type:'income',date:today(),amount:opening,
    method:f.method,note:'رصيد البداية · مبلغ موجود فعلياً'});
   E.validate(next);
   save(next,'تم إنشاء ميزانيتك البسيطة دون التزامات أو مصروفات افتراضية.',false);
   closeModal();needsFirstSetup=false;location.hash='dashboard';
  },'بدء الميزانية');
}

function simpleBudgetEdit(){
 if(state.demo)throw Error('ابدأ الخطة الفعلية أولاً.');
 const month=today().slice(0,7);
 if(state.settings.closedMonths?.[month])throw Error('الشهر مغلق.');
 const available=livingCategories(),targets=livingTargets(month);
 if(!available.length)throw Error('أضف قسماً للمصروف أولاً.');
 modal('ميزانية المصروف','حدّد سقفاً شهرياً لكل قسم. لا يحجز النظام المبلغ ولا يخصمه عند حفظ الميزانية.',
  '<div class="form-grid">'+available.map(w=>moneyField(w.label,'budget-'+w.id,
  inputMoney(targets[w.id]||0),'required')).join('')+'</div>'+
  '<p class="fz-lite-note">يمكنك تعديل السقوف في أي وقت قبل إغلاق الشهر. لا تسجّل هذه الخطوة مصروفاً.</p>',
  f=>act(st=>{
   if(st.settings.closedMonths?.[month])throw Error('الشهر مغلق.');
   const vals=Object.fromEntries(available.map(w=>[w.id,amount(f['budget-'+w.id],true)]));
   st.settings.livingTargets={...(st.settings.livingTargets||{}),[month]:vals};
   return st;
  },'تم حفظ ميزانية الشهر دون سحب أو تخصيص جديد.'),'حفظ الميزانية');
}
