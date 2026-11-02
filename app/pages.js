/* وين راحت؟ — app/pages.js
 * Advanced pages (dashboard, income, commitments, ledger, settings) and the main render().
 * Classic script: shares the global scope with the other app/*.js files, loaded in the order listed in index.html. */
'use strict';
function dashboardPage(){
 const m=dashboardFinancialSummary(),s=m.stats,p=m.projection;
 const moneyState=p.grossAfterAll<0?'fz-negative':'fz-positive';
 const monthlyTx=state.transactions.filter(t=>t.date?.slice(0,7)===m.month).slice().reverse().slice(0,5);
 const incomeCard=(stage,title,description,ic)=>{
  const disabled=stage==='incentives'&&m.isSalaryOnly,got=m.income[stage],rec=m.receipts[stage];
  return `<a class="fz-stream-card ${disabled?'fz-stream-muted':''}" href="#${stage}" aria-label="فتح صفحة ${title}">
   <div class="fz-stream-top"><span class="fz-stream-icon" aria-hidden="true">${icon(ic)}</span>
    <span class="fz-status ${disabled?'fz-neutral':rec.length?'fz-success':'fz-warning'}">${disabled?'غير معتمد':rec.length?'تم الاستلام':'بانتظار الاستلام'}</span></div>
   <h3>${title}</h3><strong>${disabled?'غير مشمول':rec.length?money(got):'لم يسجل'}</strong>
   <p>${description}</p><span class="fz-card-link">فتح تفاصيل ${title} <span aria-hidden="true">←</span></span>
   </a>`;
 };
 return head('لوحة التحكم','كل الأرقام المهمة في مكان واحد، مع فصل الدخل والالتزامات والمصروفات.',
  `<a class="btn secondary" href="#workflow">${icon('calendar')}الدورة الذكية</a>${state.demo?'':btn('wf-living-quick','صرف سريع','plus')}`,'fz-dashboard-heading')+
 `<div class="fz-dashboard">
 <section class="fz-dashboard-hero" aria-label="الملخص المالي الحالي">
  <div class="fz-hero-main"><span class="fz-hero-eyebrow">${icon('wallet')} الرصيد الفعلي الحالي</span>
   <strong class="fz-hero-number">${money(s.total)}</strong>
   <span class="fz-hero-caption">${safe(arabicMonth(m.month))} · الرصيد المحسوب من سجل الحركات، وليس دخلاً متوقعاً</span></div>
  <div class="fz-hero-balances"><div><span>البطاقة</span><strong>${money(s.card)}</strong></div>
   <div><span>النقد</span><strong>${money(s.cash)}</strong></div>
   <div><span>الحر غير الموزع</span><strong>${money(s.unallocated)}</strong></div></div>
  <div class="fz-hero-decoration" aria-hidden="true"></div>
 </section>
 <section class="fz-dashboard-kpis" aria-label="مؤشرات المال">
  <article class="fz-kpi"><span>${icon('wallet')} المتاح غير الموزع</span><strong>${money(s.unallocated)}</strong><small>بعد التخصيص والحجز، وليس صافي الخطة</small></article>
  <article class="fz-kpi"><span>${icon('shield')} محجوز للالتزامات</span><strong>${money(m.reserved)}</strong><small>محجوز فقط، لم يُسدد بعد</small></article>
  <article class="fz-kpi"><span>${icon('chart')} مصروفات هذا الشهر</span><strong>${money(m.spent)}</strong><small>صرف فعلي مسجل، دون الحجز</small></article>
  <article class="fz-kpi ${moneyState}"><span>${icon('calendar')} المتبقي التخطيطي</span>
   <strong>${money(p.grossAfterAll)}</strong><small>الرصيد الحالي − الثوابت − سقف المصروف</small></article>
 </section>
 <div class="fz-dashboard-section-head"><div><span class="fz-eyebrow">مراكز مستقلة</span><h2>إدارة الدخل والالتزامات</h2></div><a href="#workflow">مراجعة الدورة الذكية ←</a></div>
 <section class="fz-dashboard-streams" aria-label="الراتب والحافز والالتزامات">
  ${incomeCard('salary','الراتب','مبلغ الراتب المستلم وحالة التسوية الخاصة به.','wallet')}
  ${incomeCard('incentives','الحوافز','تُحسب فقط عند اعتماد نمط الراتب والحوافز.','income')}
  <a href="#fixed" class="fz-stream-card fz-fixed-stream" aria-label="فتح الالتزامات الثابتة">
   <div class="fz-stream-top"><span class="fz-stream-icon" aria-hidden="true">${icon('calendar')}</span>
    <span class="fz-status ${p.uncovered?'fz-warning':'fz-success'}">${p.uncovered?'توجد مبالغ غير مغطاة':'المغطى محسوب'}</span></div>
   <h3>الثوابت والالتزامات</h3><strong>${money(p.plannedTotal)}</strong>
   <p>${p.count} بنود لهذا الشهر · المغطى ${money(m.covered)}</p>
   <span class="fz-card-link">تفاصيل الالتزامات ←</span></a>
 </section>
 <div class="fz-dashboard-section-head"><div><span class="fz-eyebrow">التخطيط الشهري</span><h2>الميزانية والإنفاق</h2></div><a href="#living">إدارة سقوف المصروف ←</a></div>
 <section class="fz-dashboard-budget">
  <div class="fz-budget-overview">
   <div class="fz-budget-figures"><div><span>سقف المصروف المحدد</span><strong>${money(m.living.total)}</strong></div>
    <div><span>المصروف المسجل من الأقسام</span><strong>${money(m.livingSpent)}</strong></div>
    <div><span>المتبقي من السقوف</span><strong>${money(Math.max(0,m.living.total-m.livingSpent))}</strong></div></div>
   <div class="fz-track" role="progressbar" aria-valuenow="${m.livingPct}" aria-valuemin="0" aria-valuemax="100" aria-label="نسبة استخدام سقوف المصروف"><i style="width:${m.livingPct}%"></i></div>
   <p>${m.living.total?`استُخدم ${m.livingPct}% من الميزانية المدخلة. السقف ليس رصيداً مودعاً.`:'لم تُحفظ ميزانية المصروف لهذا الشهر بعد. حدّد الأقسام والمبالغ من صفحة المصروف.'}</p>
  </div>
  <div class="fz-budget-breakdown"><strong>توزيع الميزانية على الأقسام</strong>
   ${m.monthRows.length?m.monthRows.map(row=>{
    const level=row.spent>row.amount?'over':row.pct>=80?'warn':'ok',color=categoryColor(row.id);
    return `<div class="fz-budget-line" data-level="${level}"${color?` style="--cat:${color}"`:''}>
    <div class="fz-budget-line-head"><span>${safe(row.label)}</span><b>${money(row.spent)} <small>من ${money(row.amount)}</small></b></div>
    <div class="fz-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${row.pct}" aria-label="${safe(row.label)}"><i style="width:${row.pct}%"></i></div></div>`}).join(''):'<p class="fz-empty-note">لم تُحدد أي مبالغ للأقسام بعد.</p>'}</div>
 </section>
 <section class="fz-dashboard-bottom">
  <article class="fz-glance">
   <div class="fz-dashboard-section-head"><div><span class="fz-eyebrow">الالتزامات والاحتياجات</span><h2>موقف الشهر</h2></div><a href="#fixed">التفاصيل ←</a></div>
   <div class="fz-glance-row"><span>الثوابت الشهرية</span><strong>${money(p.plannedTotal)}</strong></div>
   <div class="fz-glance-row"><span>ميزانية المصروف</span><strong>${money(p.livingTotal)}</strong></div>
   <div class="fz-glance-row"><span>إجمالي المطلوب للشهر</span><strong>${money(p.combinedTotal)}</strong></div>
   <div class="fz-glance-row fz-glance-total ${moneyState}"><span>المتبقي التخطيطي</span><strong>${money(p.grossAfterAll)}</strong></div>
   <small>المتبقي التخطيطي للمقارنة فقط؛ لا يُطرح من الرصيد الفعلي مرة ثانية ولا يُسمح بصرفه كرصيد جديد.</small>
  </article>
  <article class="fz-glance">
   <div class="fz-dashboard-section-head"><div><span class="fz-eyebrow">الحركات المسجلة</span><h2>آخر العمليات</h2></div><a href="#ledger">السجل الكامل ←</a></div>
   ${monthlyTx.length?`<div class="fz-activity">${monthlyTx.map(t=>activityRow(activityEntry(t))).join('')}</div>`:
    '<p class="fz-empty-note">لا توجد عمليات مسجلة لهذا الشهر بعد.</p>'}
  </article>
 </section>
 </div>`;
}
function incomeStagePage(stage){
 const salary=stage==='salary',month=wfMonth,mode=wfIncomeMode(month);
 const disabled=!salary&&mode==='salary-only';
 const receipts=disabled?[]:S.receipts(state,stage,month),received=receipts.reduce((n,t)=>n+t.amount,0);
 const plan=wfPlan(),steps=disabled?[]:plan?wfAmount(plan,stage):[],amountDue=steps.reduce((n,r)=>n+r.amount,0);
 const done=wfDone(stage),readonly=month<today().slice(0,7)||!!state.settings.closedMonths?.[month],summary=done?.summary||{};
 const headerActions=btn('wf-income-mode','نوع الدخل','settings','secondary')+
  (!disabled&&!receipts.length&&!readonly?btn(salary?'wf-salary-receipt':'wf-incentives-receipt','تأكيد الاستلام','income'):'' );
 return head(salary?'الراتب الشهري':'الحوافز الشهرية',
  'مساحة مستقلة لعرض الاستلام والاستقطاعات والحجوزات، دون تكرار الدخل أو تسجيله تلقائياً.',headerActions)+
 `<div class="fz-finance-page">${firzaMonthSelector()}
  <div class="fz-stage-summary">
   <article class="fz-stage-primary"><span>${salary?'الراتب المستلم فعلياً':'الحوافز المستلمة فعلياً'}</span>
    <strong>${disabled?'غير معتمد لهذا الشهر':receipts.length?money(received):'لم يُسجَّل بعد'}</strong>
    <small>${disabled?'نمط هذا الشهر راتب فقط. لا تُحتسب حوافز افتراضية.':receipts.length?'المبلغ مأخوذ من قيود الدخل الموثقة':'لا يضاف المبلغ المتوقع إلى الحساب'}</small></article>
   <article class="fz-stage-minor"><span>البنود المرتبطة بهذه الدفعة</span><strong>${money(amountDue)}</strong><small>قيمة البنود المخطط تسويتها من هذه الدفعة</small></article>
   <article class="fz-stage-minor"><span>حالة التسوية</span><strong>${done?'معتمدة':'لم تعتمد'}</strong>
    <small>مستقطع ${money(summary.withheld||0)} · مدفوع ${money(summary.paid||0)} · محجوز ${money(summary.reserved||0)}</small></article>
  </div>
  ${disabled?`<section class="fz-income-notice"><h2>الحوافز غير مفعلة</h2><p>أنت اخترت خطة «راتب فقط». تقدر تغيّر نوع الدخل للشهر المفتوح قبل اعتماد التسوية، وما راح ينشئ التطبيق أي دخل وهمي.</p>${btn('wf-income-mode','تغيير نوع الدخل','settings')}</section>`:
   `<div class="fz-dashboard-section-head"><div><h2>الاستلام والتسوية</h2><p>الإجراءات تعتمد على حالة الدفعة الفعلية.</p></div>
    <a href="#workflow">فتح الدورة الذكية ←</a></div>${wfStageSummary(stage)}
    <section class="fz-finance-info">${section('بنود هذه الدفعة','قيم خطة الشهر للراتب والحوافز حسب توزيعها المقرر.')}
    ${steps.length?steps.map(row=>`<div class="fz-glance-row"><span>${safe(row.label)}</span><strong>${money(row.amount)}</strong></div>`).join(''):
     '<p class="fz-empty-note">لا توجد بنود محددة لهذه الدفعة بعد.</p>'}
    <div class="fz-finance-footer"><a class="btn secondary" href="#fixed">إدارة الالتزامات الثابتة</a>
    <button class="btn secondary" type="button" data-action="wf-config">تعديل مبالغ الشهر</button></div></section>`}
  ${readonly?'<div class="notice">هذا شهر سابق أو مغلق؛ لا يمكن إعادة تسجيل الدخل أو تغيير تسويته من الواجهة الحالية.</div>':''}
 </div>`;
}
function fixedCommitmentsPage(){
 const month=wfMonth,projection=monthlyCommitmentProjection(state,month),total=projection.plannedTotal;
 const covered=projection.entries.reduce((n,x)=>n+x.covered,0),pct=total?Math.min(100,Math.round(covered/total*100)):0;
 const editable=month===today().slice(0,7)&&!state.settings.closedMonths?.[month]&&!state.demo&&
  (!wfDone('salary')||wfDone('salary').mode==='automatic')&&
  (!wfDone('incentives')||wfDone('incentives').mode==='automatic');
 return head('الثوابت والالتزامات','مساحة مستقلة لتحديد قيمة كل التزام ومصدر خصمه الآلي عند استلام الدفعة.',
  (editable?btn('fixed-entry','إضافة التزام ثابت','plus'):'')+btn('wf-fields-manage','إدارة البنود','settings','secondary')+(editable?btn('wf-config','تحديد مبالغ الشهر','wallet','secondary'):'') )+
 `<div class="fz-finance-page">${firzaMonthSelector()}
 <section class="fz-fixed-overview">
  <article class="fz-stage-primary"><span>إجمالي الالتزامات الثابتة لهذا الشهر</span><strong>${money(total)}</strong>
   <small>${projection.count} بنود مثبتة في خطة الشهر أو مستحقة ضمن سجل الالتزامات</small></article>
  <div class="fz-fixed-stats"><div><span>مسوّى أو محجوز</span><strong>${money(covered)}</strong></div>
   <div><span>غير مغطى بعد</span><strong>${money(projection.uncovered)}</strong></div></div>
  <div class="fz-track" role="progressbar" aria-label="تغطية الالتزامات الثابتة" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
  <p>نسبة التغطية ${pct}%، وتشمل السداد والحجز والاستقطاع الموثق. الحجز ليس سداداً.</p>
 </section>
 <section class="fz-finance-info">
  ${section('بنود الالتزامات الشهرية','يعرض المبلغ الأصلي وما غُطّي منه وما بقي دون احتساب مزدوج.')}
  ${projection.entries.length?projection.entries.map(item=>{
   const status=item.uncovered<=0?'covered':item.covered>0?'partial':'open',pct=item.amount?Math.min(100,Math.round(item.covered/item.amount*100)):0;
   return `<article class="fz-fixed-item" data-status="${status}">
   <div><strong>${safe(item.label)}</strong><span class="fz-ob-badge">${icon(OB_STATUS[status][0])}${OB_STATUS[status][1]}</span><span>المبلغ الكامل ${money(item.amount)}</span>
   ${monthlyAllFields().find(f=>wfObId(month,f.key)===item.id)?`<small>مصدر الخصم: ${safe(monthlyFieldStageLabel(monthlyAllFields().find(f=>wfObId(month,f.key)===item.id)))} · ${monthlyAllFields().find(f=>wfObId(month,f.key)===item.id)?.autoDeduct===true?'تلقائي':'يدوي'}</small>
   ${editable?`<button type="button" class="btn small secondary" data-action="fixed-edit" data-id="${safe(monthlyAllFields().find(f=>wfObId(month,f.key)===item.id).key)}">تعديل المبلغ ومصدر الخصم</button>`:''}`:''}
   </div>
   <div class="fz-fixed-item-amount"><b>${money(item.uncovered)}</b><small>غير مغطى</small></div>
   <div class="fz-fixed-item-meta">مغطى بالسداد أو الحجز أو الاستقطاع: ${money(item.covered)}
   <div class="fz-lite-progress fz-ob-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="نسبة تغطية ${safe(item.label)}"><i style="width:${pct}%"></i></div></div></article>`}).join(''):
    '<p class="fz-empty-note">ماكو بنود ثابتة مسجلة لهذا الشهر. أضف البنود وحدد قيمها.</p>'}
 </section>
 <div class="fz-fixed-actions">
  <a class="btn secondary" href="#salary">الراتب</a>
  ${wfIncomeMode(month)==='salary-only'?'':`<a class="btn secondary" href="#incentives">الحوافز</a>`}
  <a class="btn secondary" href="#workflow">الدورة الذكية</a>
  <a class="btn secondary" href="#obligations">الالتزامات العامة</a>
 </div>
 <div class="notice">الالتزامات الثابتة منفصلة عن المصروف اليومي. إذا فُعّل الخصم الآلي، يسجّل «وين راحت؟» سداد الالتزام تلقائياً عند توثيق استلام الراتب أو الحافز، دون تأكيد ثانٍ؛ لا يتم تحويل أي مبلغ مصرفياً، ولا يجوز تكرار قسط مستقطع قبل إيداع الراتب.</div>
 </div>`;
}
function overview(){const s=currentStats(),sum=summary(),days=left(),elapsed=state.cycle.days-days,end=addDays(state.cycle.start,state.cycle.days-1);return head(overviewIdentity()+'ملخص أموالك',state.settings.name?`مرحباً ${safe(state.settings.name)}، هذه نظرتك المالية اليوم`:'رصيدك ومصروفاتك في مكان واحد.',btn('new-cycle','دورة جديدة','calendar','secondary')+btn('expense','إضافة مصروف'),'neo-overview-heading')+`<div class="dashboard-top"><section class="hero"><div class="hero-badge">${state.demo?'خطة توضيحية':'أموالك تحت السيطرة'}</div><div><div class="hero-label">${icon('wallet')}إجمالي رصيدك الحالي</div><div class="hero-total">${money(s.total)}</div><div class="hero-sub">${icon('shield')}يشمل المحافظ والالتزامات المحجوزة والمبلغ غير الموزع</div></div><div class="hero-bottom"><div><span>رصيد البطاقة</span><b>${money(s.card)}</b></div><div><span>النقد المتوفر</span><b>${money(s.cash)}</b></div><div><span>متاح للتوزيع</span><b>${money(s.unallocated)}</b></div></div></section><div class="neo-snapshot" aria-label="ملخص المصروف والمتاح"><article class="neo-snapshot-item expense"><span class="neo-snapshot-label">${icon('chart')} المصروف الفعلي</span><strong>${money(sum.expenses+sum.paid)}</strong></article><article class="neo-snapshot-item available"><span class="neo-snapshot-label">${icon('saving')} المتاح الآمن اليوم</span><strong>${money(cap())}</strong></article></div><section class="cycle-card"><div class="card-top"><span class="eyebrow">دورة دخلك الحالية</span><span class="chip">${days?'دورة نشطة':'اكتملت الدورة'}</span></div><h2>كل يوم بخطة أوضح</h2><div class="cycle-range">${date(state.cycle.start)} — ${date(end,true)}</div><div class="cycle-progress"><div class="progress"><i style="width:${Math.min(100,elapsed/state.cycle.days*100)}%"></i></div><div class="progress-meta"><span>مضى ${elapsed} من ${state.cycle.days} يوماً</span><span>${Math.round(elapsed/state.cycle.days*100)}%</span></div></div><div class="cycle-footer"><span>${icon('clock')} <b class="num">${days}</b> يوماً متبقياً</span><button class="text-btn" data-action="new-cycle">إدارة الدورة ${icon('chevron')}</button></div></section></div>${neoOverviewBudget()}${schedulePanel(true)}<div class="stat-grid">${stat(state.migration?'الدخل والرصيد الافتتاحي':'الدخل المستلم',sum.income,'income','من بداية الدورة الحالية')}${stat('الالتزامات المتبقية',Object.values(s.reserved).reduce((a,n)=>a+n,0),'calendar',`${state.obligations.filter(o=>(s.reserved[o.id]||0)>0).length} التزامات محجوزة`,'gold')}${stat('المصروف الفعلي',sum.expenses+sum.paid,'chart','يشمل المصروفات والالتزامات المدفوعة','blue')}${stat('المتاح الآمن اليوم',cap(),'saving','يستثني الادخار والطوارئ والالتزامات','purple')}</div>${section('محافظك، لكل غرض مساحة','قسّم أموالك بوعي، وأنفق بطمأنينة.',`<a class="text-btn" href="#plan">إدارة المحافظ ${icon('arrow')}</a>`)}<div class="wallet-grid">${walletCards()}</div><div class="bottom-grid"><section class="panel">${section('آخر الحركات','خطواتك المالية، أولاً بأول',`<a class="text-btn" href="#ledger">عرض السجل ${icon('arrow')}</a>`)}${ledgerRows([...state.transactions].reverse().slice(0,4),true)}</section><section class="panel">${section('كيف تتوزّع أموالك؟','توزيع الرصيد الحالي بحسب الغرض')}${donut()}</section></div>`}
function incomePage(){const s=currentStats(),txs=[...state.transactions].reverse().filter(t=>t.type==='income');return head('الدخل والاستلام','ابدأ بما استلمته فعلياً، ثم امنح كل مبلغ غرضاً.',btn('income-sources','مواعيد الدخل','calendar','secondary')+btn('income','تسجيل دخل'))+schedulePanel()+`<div class="flow"><div class="flow-step"><span>01 / استلم</span><h3>سجّل دخلك الفعلي</h3><p>راتب، عمل حر، أو دخل إضافي. لا يُحتسب الدخل قبل استلامه.</p></div><div class="flow-step"><span>02 / احجز</span><h3>قدّم التزاماتك</h3><p>سجّل الالتزامات وحدد أنت متى وكم تحجز لها دون حجز تلقائي.</p></div><div class="flow-step"><span>03 / وزّع</span><h3>خطّط لما تبقّى</h3><p>وزّع الباقي على محافظك واحتياطي الطوارئ وأهدافك.</p></div></div><div class="stat-grid">${stat('إجمالي الدخل المسجل',s.income,'income','كل الدورات')}${stat('متاح للتوزيع',s.unallocated,'wallet','بعد الحجز والتخصيص','blue')}${stat('رصيد البطاقة',s.card,'card','الرصيد المحسوب من السجل','gold')}${stat('رصيد النقد',s.cash,'cash','النقد المتوفر فعلياً','purple')}</div><section class="panel">${section('سجل الدخل','يمكنك إدخال عدة مصادر دخل في الدورة نفسها.')}${ledgerRows(txs)}</section><div class="notice">لديك أموال سابقة؟ سجّلها مرة واحدة كـ «رصيد افتتاحي» من زر تسجيل الدخل. السحب من البطاقة حركة بين حساباتك، ويسجّل من «حركة نقد وبطاقة» في السجل.</div>`}
function obligationsPage(){const s=currentStats(),activeObligations=state.obligations.filter(o=>!o.archived),archivedObligations=state.obligations.filter(o=>o.archived),total=activeObligations.reduce((a,o)=>a+o.amount,0),res=activeObligations.reduce((a,o)=>a+(s.reserved[o.id]||0),0),paid=activeObligations.reduce((a,o)=>a+(s.paid[o.id]||0),0);return head('الالتزامات الثابتة','تسجيل الالتزام لا يحجز أي مبلغ، إلا إذا وافقت أنت على الحجز لاحقاً.',btn('obligation','إضافة التزام'))+`<div class="stat-grid">${stat('إجمالي الالتزامات النشطة',total,'calendar','المبالغ المستحقة غير المؤرشفة')}${stat('محجوز ولم يُدفع',res,'shield','يبقى ضمن الرصيد حتى السداد','gold')}${stat('تم سداده',paid,'check','مدفوعات الالتزامات المسجلة','blue')}${stat('غير مغطّى بعد',Math.max(0,total-res-paid),'clock','يحتاج إلى حجز من المتاح','purple')}</div><div class="obligation-list">${activeObligations.length?activeObligations.map(o=>{const p=s.paid[o.id]||0,r=s.reserved[o.id]||0,missing=o.amount-r-p,isPaid=p===o.amount,late=o.due<today()&&!isPaid;return `<article class="ob-card"><div class="card-top"><h3>${safe(o.name)}</h3><span class="chip ${late?'red':missing?'amber':''}">${isPaid?'مدفوع بالكامل':late?'متأخر':missing?'يحتاج حجزاً':'محجوز'}</span></div><div class="ob-detail"><span>الاستحقاق ${date(o.due,true)}${o.recurring?' · متكرر':''}</span><b>${money(o.amount)}</b></div><div class="progress"><i style="width:${(p+r)/o.amount*100}%"></i></div><div class="progress-meta"><span>مدفوع ${fmt(p)} · محجوز ${fmt(r)}</span><span>غير مغطى ${fmt(missing)}</span></div><div class="ob-actions">${r>0?`<button class="btn small" data-action="pay" data-id="${safe(o.id)}">${icon('check')}سداد الالتزام</button>`:''}${missing>0?`<button class="btn small soft" data-action="reserve" data-id="${safe(o.id)}">حجز مبلغ</button>`:''}${r>0?`<button class="btn small secondary" data-action="unreserve" data-id="${safe(o.id)}">إلغاء حجز</button>`:''}${o.recurring?`<button class="text-btn" data-action="renew" data-id="${safe(o.id)}">تجديد الاستحقاق</button>`:''}${state.transactions.some(t=>t.obligationId===o.id)?`<button class="btn small secondary" data-action="archive-obligation" data-id="${safe(o.id)}"${r>0?' title="ألغِ الحجز أولاً"':''}>أرشفة</button>`:`<button class="btn small danger" data-action="delete-obligation" data-id="${safe(o.id)}">${icon('trash')}حذف الالتزام</button>`}</div></article>`}).join(''):empty('مساحة خالية من الالتزامات','أضف الإيجار أو الأقساط أو الخدمات وحدد تاريخ الاستحقاق.')}</div>${archivedObligations.length?`<section class="panel"><div class="section-heading"><div><h2>الالتزامات المؤرشفة (${archivedObligations.length})</h2><p>محفوظة مع حركاتها المالية ولا تدخل في مجموع الالتزامات النشطة.</p></div></div><div class="obligation-list">${archivedObligations.map(o=>`<article class="ob-card"><div class="card-top"><h3>${safe(o.name)}</h3><span class="chip">مؤرشف</span></div><div class="ob-detail"><span>الاستحقاق ${date(o.due,true)}</span><b>${money(o.amount)}</b></div><div class="progress-meta"><span>مدفوع ${fmt(s.paid[o.id]||0)}</span><span>محجوز ${fmt(s.reserved[o.id]||0)}</span></div><div class="ob-actions"><button class="btn small secondary" data-action="restore-obligation" data-id="${safe(o.id)}">إعادة للقائمة النشطة</button></div></article>`).join('')}</div></section>`:''}<div class="notice">تسجيل أي التزام لا يخصم شيئاً من البطاقة أو النقد أو المحافظ أو المتاح للتوزيع. يمكنك الحجز فقط بعد اختيار المبلغ والموافقة عليه. الحجز ينقل من «المتاح للتوزيع» إلى الالتزام، والسداد الفعلي وحده يخفض رصيد البطاقة أو النقد.</div>`}
function weeklyTable(){const count=Math.ceil(state.cycle.days/7);return `<div class="table-wrap"><table><thead><tr><th>الأسبوع</th><th>الفترة</th><th>المخصص النسبي</th><th>الصرف الفعلي</th><th class="align-left">الفرق</th></tr></thead><tbody>${Array.from({length:count},(_,i)=>{const start=addDays(state.cycle.start,i*7),n=Math.min(7,state.cycle.days-i*7),end=addDays(start,n-1);let base=state.transactions.filter(t=>t.type==='allocate'&&t.date>=state.cycle.start&&state.wallets.some(w=>w.id===t.walletId&&w.kind==='spend')).reduce((a,t)=>a+t.amount,0);const target=Math.floor(base*Math.min(state.cycle.days,(i+1)*7)/state.cycle.days)-Math.floor(base*i*7/state.cycle.days),spent=state.transactions.filter(t=>t.type==='expense'&&t.date>=start&&t.date<=end&&state.wallets.some(w=>w.id===t.walletId&&w.kind==='spend')).reduce((a,t)=>a+t.amount,0);return `<tr><td>الأسبوع ${i+1}</td><td class="muted">${date(start)} — ${date(end)}</td><td>${money(target)}</td><td>${money(spent)}</td><td class="align-left ${target<spent?'expense-color':'income-color'}">${money(target-spent)}</td></tr>`}).join('')}</tbody></table></div>`}
function planPage(){const s=currentStats();return head('المحافظ والخطة','خطة مرنة تناسب حياتك، تبدأ بعد تغطية التزاماتك.',btn('wallet','محفظة جديدة','plus','secondary')+btn('allocate','توزيع المتاح','wallet'))+`<div class="notice">متاح للتوزيع الآن: <b>${money(s.unallocated)}</b> · أرصدة المحافظ هي تخصيصات من رصيدك، والتحويل بينها لا يُعدّ دخلاً أو مصروفاً.</div><div class="wallet-grid">${walletCards()}</div><div class="row" style="margin-bottom:23px;flex-wrap:wrap">${btn('transfer','تحويل بين المحافظ','transfer','secondary')}${btn('release','إرجاع مبلغ إلى المتاح','wallet','secondary')}${btn('expense','تسجيل مصروف','plus')}</div><div class="two-col"><section class="panel">${section('توزيع يناسبك','اختر أسلوبك وعدّل أوزان محافظك كما تريد.')}<p class="help-text">خطة الملف الأصلي محفوظة كقالب اختياري: المنزل 125,000، الشخصية 120,000، الأسرة 60,000، والطوارئ 30,000. يمكنك تطبيق نسبها على أي مبلغ أو إدخال مبالغك الخاصة.</p><div class="settings-actions">${btn('allocate','اختيار توزيع','wallet','soft')}</div></section><section class="panel">${section('سقف يومي يحمي خطتك','يتكيّف مع المصروف الفعلي والأيام المتبقية.')}<div class="stat-amount">${money(cap())}</div><p class="help-text">الرصيد المتاح لمحافظ الصرف موزّع على الأيام المتبقية، مع خصم ما صُرف اليوم. الفائض يبقى في محفظتك. الادخار والطوارئ والالتزامات خارج هذا السقف.</p></section></div><section class="panel">${section('المراجعة الأسبوعية','مخصص نسبي بحسب أيام الأسبوع الفعلية، بما فيها الأسبوع الأخير القصير.')}${weeklyTable()}${state.transactions.some(t=>t.date>addDays(state.cycle.start,state.cycle.days-1))?'<div class="notice warn">توجد حركات بعد انتهاء المدة؛ تظهر في السجل وإجماليات التقارير. ابدأ دورة جديدة لتحديث حدود الصرف والتقسيم الأسبوعي.</div>':''}<div class="notice">المخصص النسبي مبني على التخصيصات الجديدة خلال الدورة. التحويلات والترحيل تغيّر الرصيد الفعلي والسقف اليومي؛ راجعها في السجل ولا تعتبر فرق الأسبوع رصيداً مصرفياً.</div></section>`}
const LEDGER_PERIODS=[['all','كل الفترات'],['month','هذا الشهر'],['last-month','الشهر الماضي'],['week','آخر 7 أيام'],['custom','فترة مخصصة']];
function ledgerPeriodRange(key,day=today()){
 const month=day.slice(0,7);
 if(key==='month')return {from:month+'-01',to:day};
 if(key==='week')return {from:addDays(day,-6),to:day};
 if(key==='last-month'){const end=addDays(month+'-01',-1);return {from:end.slice(0,7)+'-01',to:end}}
 return {from:'',to:''};
}
/* Quick period chips write to the original date filters, so the existing filter logic stays the single path. */
function ledgerPeriod(key){
 const from=$('fromFilter'),to=$('toFilter');
 if(!from||!to||!LEDGER_PERIODS.some(([k])=>k===key))return;
 document.querySelectorAll('.fz-period-chip').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===key)));
 $('ledgerDates').hidden=key!=='custom';
 if(key==='custom'){from.focus();return}
 const range=ledgerPeriodRange(key);
 from.value=range.from;to.value=range.to;
 from.dispatchEvent(new Event('input',{bubbles:true}));
}
function countText(n){return new Intl.NumberFormat(state.settings.digits==='ar'?'ar-IQ':'en-US').format(n)}
function ledgerSummary(txs){
 const total=types=>txs.filter(t=>types.includes(t.type)).reduce((n,t)=>n+t.amount,0);
 return `<div><span>الحركات</span><strong>${countText(txs.length)}</strong></div>`+
  `<div data-kind="in"><span>الدخل</span><strong>${signedMoney(total(['income']),'+')}</strong></div>`+
  `<div data-kind="out"><span>المصروف والسداد</span><strong>${signedMoney(total(['expense','pay']),'−')}</strong></div>`;
}
function ledgerPage(){const all=[...state.transactions].reverse();return head('سجل الحركات','كل حركة محفوظة بتاريخها ومبلغها وغرضها، مع بحث وفلاتر دقيقة.')+`<section class="panel">${section('دفترك المالي',`${countText(state.transactions.length)} حركة مسجلة`,btn('csv','تصدير CSV','download','secondary small'))}<div class="filters fz-ledger-filters">
 <label class="fz-search">${icon('search')}<input id="search" type="search" placeholder="ابحث بالوصف أو المحفظة…" aria-label="البحث في السجل" autocomplete="off"></label>
 <select id="typeFilter" data-choice="scroll" aria-label="نوع الحركة"><option value="all">جميع الحركات</option><option value="income">الدخل</option><option value="expense">المصروفات</option><option value="pay">سداد الالتزامات</option><option value="withheld">استقطاع قبل الإيداع</option><option value="reserve">الحجز</option><option value="allocate">التخصيص</option><option value="transfer">التحويلات</option><option value="account">النقد والبطاقة</option></select>
 <div class="fz-period" role="group" aria-label="الفترة">${LEDGER_PERIODS.map(([key,label])=>`<button type="button" class="fz-period-chip" data-action="ledger-period" data-id="${key}" aria-pressed="${key==='all'}">${label}</button>`).join('')}</div>
 <div id="ledgerDates" class="fz-ledger-dates" hidden><label class="thukhr-date-filter" for="fromFilter"><span>من تاريخ</span>
 <input type="date" id="fromFilter" lang="ar-IQ" aria-label="من تاريخ">
 <small id="fromFilterReadable">التاريخ اختياري</small></label>
 <label class="thukhr-date-filter" for="toFilter"><span>إلى تاريخ</span>
 <input type="date" id="toFilter" lang="ar-IQ" aria-label="إلى تاريخ">
 <small id="toFilterReadable">التاريخ اختياري</small></label></div></div>
 <div id="ledgerSummary" class="fz-ledger-summary" aria-live="polite">${ledgerSummary(all)}</div>
 <div id="ledgerResults" class="thukhr-ledger-table">${ledgerRows(all)}</div><div id="ledgerMobileResults" class="thukhr-ledger-mobile">${ledgerMobileRows(all)}</div></section><div class="notice">عند حذف عملية، تُفحص الحركات التي تليها. إذا كان الحذف يجعل أي حساب أو محفظة سالبة، يُرفض لحماية دقة السجل.</div>`}
function settingsPage(){const html= head('الإعدادات','الحساب والمظهر ومواعيد الدخل والنسخ الاحتياطية.')+`<div class="two-col"><section class="panel">${section('مساحتك الشخصية','خصّص تجربتك حسب احتياجك.')}<form id="settingsForm" class="form-grid"><div class="field full"><label for="userName">الاسم المفضل</label><input name="name" id="userName" maxlength="40" value="${safe(state.settings.name)}" placeholder="كيف تحب أن نناديك؟"></div><div class="field"><label for="currency">العملة الأساسية</label><select id="currency" name="currency" ${state.transactions.length?'disabled':''}>${Object.entries(currencies).map(([k,c])=>`<option value="${k}" ${k===state.settings.currency?'selected':''}>${c.label} (${k})</option>`).join('')}</select><small>لعملة جديدة، ابدأ خطة مستقلة. لا تُحوَّل الأرصدة بتغيير الاسم.</small></div><div class="field"><label for="digits">عرض الأرقام</label><select id="digits" name="digits"><option value="en" ${state.settings.digits==='en'?'selected':''}>123,456</option><option value="ar" ${state.settings.digits==='ar'?'selected':''}>١٢٣٬٤٥٦</option></select></div><div class="full"><button class="btn" type="submit">حفظ التفضيلات</button></div></form></section><section class="panel">${section('صورة العائلة','اختيارية، ولا تغادر جهازك أو تُرفع إلى GitHub.')}
 <p class="thukhr-privacy">يمكنك اختيار صورتك العائلية لتظهر في قسم الأهداف العائلية فقط. تُحفظ في مساحة المتصفح نفسها فقط. حذف بيانات الموقع يمحوها.</p>
 <div class="thukhr-family-settings">
 <img class="thukhr-photo-preview" data-thukhr-family-photo alt="معاينة الصورة العائلية">
 <label class="btn soft" for="thukhrFamilyFile">اختيار صورة من الجهاز</label>
 <input type="file" id="thukhrFamilyFile" accept="image/jpeg,image/png,image/webp" style="position:absolute;width:1px;height:1px;opacity:0;overflow:hidden">
 <button type="button" id="thukhrFamilyRemove" class="btn secondary" hidden>إزالة الصورة</button>
 </div><p id="thukhrFamilyStatus" class="thukhr-privacy" role="status">لم تُضف صورة.</p>
 </section><section class="panel">${section('بياناتك تحت سيطرتك','تخزين محلي، دون مزامنة تلقائية.')}<p class="help-text">البيانات المالية محفوظة داخل هذا المتصفح. كل جهاز له سجل مستقل. نزّل نسخة JSON دورياً وقبل الانتقال إلى جهاز آخر. الاستعادة تستبدل السجل بعد التحقق منه.</p><div class="settings-actions">${btn('backup','نسخة احتياطية JSON','download')}${btn('restore','استعادة نسخة','upload','secondary')}${btn('csv','تصدير CSV','ledger','secondary')}</div><div class="notice">يمكن استيراد نسخة JSON من تطبيق «محافظ عمار» القديم. تبقى الأرصدة والحركات، وتُحفظ الدورات القديمة ضمن ملف النسخة الاحتياطية.</div></section><section class="panel">${section('دورة الدخل','ابدأ من يوم الاستلام الفعلي.')}<div class="keyval"><span>بداية الدورة</span><b>${date(state.cycle.start,true)}</b></div><div class="keyval"><span>المدة</span><b>${state.cycle.days} يوماً</b></div><div class="settings-actions">${btn('income-sources','مواعيد الدخل الشهري','calendar','soft')}${btn('new-cycle','بدء دورة تخطيط جديدة','calendar','secondary')}</div><p class="help-text" style="margin-top:14px">حدد نوع الدخل من «خطة الدخل» (راتب فقط أو راتب وحوافز)، وسجّل المبالغ التي استلمتها فعلياً. بدء دورة تخطيط جديدة إجراء مستقل، وتُرحّل فيه كل الأرصدة والالتزامات غير المدفوعة. تجديد الالتزام المتكرر متاح من بطاقته، مع منع تكرار الاستحقاق نفسه.</p></section><section class="panel">${section('التثبيت والاستخدام','واجهة متجاوبة على الهاتف والحاسوب.')}<p class="help-text">على iPhone: افتح Safari ثم مشاركة ← إضافة إلى الشاشة الرئيسية.<br>على Android أو Windows: قائمة المتصفح ← تثبيت التطبيق.<br>يتوفر العمل دون اتصال بعد اكتمال حفظ ملفات التطبيق، بحسب دعم المتصفح.</p><div class="settings-actions">${btn('help','دليل الحسابات','help','secondary')}<button class="btn secondary" id="installBtn" hidden>تثبيت «وين راحت؟»</button></div></section></div><section class="panel">${section('بداية جديدة','الدورة الجديدة تختلف عن التهيئة الكاملة للسجل.')}<div class="settings-actions">${btn('setup','إنشاء خطة جديدة','plus','secondary')}${!state.demo?btn('demo','عرض مثال توضيحي','grid','secondary'):''}</div>
 <div class="thukhr-reset-section"><strong>تهيئة البيانات والبدء من جديد</strong>
 <p class="help-text">تصفير جميع الحركات والأرصدة والخطط المالية في الملف الحالي فقط. يلزم تنزيل نسخة احتياطية وتأكيدان. الملفات الأخرى تبقى محفوظة.</p>
 ${btn('financial-reset','تهيئة البيانات والبدء من الصفر','trash','danger')}
 </div></section>`;
 const sections=['account','account','backup','income','account','income'];let i=0;
 const tagged=html.replace(/<section class="panel"/g,m=>{
  const key=sections[i++]||'account';
  return m+' data-settings-group="'+key+'"'+(settingsTab===key?'':' hidden');
 });
 const choices=[['account','الحساب'],['appearance','المظهر'],['income','الدخل'],['backup','النسخ']];
 const tabs=`<div class="thukhr-settings-tabs" role="group" aria-label="أقسام الإعدادات">
  ${choices.map(([k,label])=>`<button type="button" class="${settingsTab===k?'is-active':''}" data-action="settings-tab" data-id="${k}" aria-pressed="${settingsTab===k}">${label}</button>`).join('')}</div>`;
 const appearance=`<section class="panel thukhr-appearance-panel" data-settings-group="appearance" ${settingsTab==='appearance'?'':'hidden'}>
  ${section('مظهر «وين راحت؟»','اختر المظهر الفاتح أو الداكن، دون تغيير البيانات أو الأرصدة.')}
  ${thukhrThemePicker()}
  <p class="help-text">يُحفظ اختيار المظهر على هذا الجهاز فقط. الألوان المالية والأرصدة لا تتغير.</p></section>`;
 const mode=firzaViewMode();
 const viewSection=`<section class="panel fz-view-settings">
 ${section('طريقة عرض «وين راحت؟»','اختَر واجهة مختصرة أو استعد كل التفاصيل المتقدمة. لا يُعدّل هذا الاختيار أياً من المبالغ أو الحركات.')}
 <div class="fz-view-options" role="group" aria-label="اختيار طريقة العرض">
 <button type="button" class="btn ${mode==='simple'?'':'secondary'}" data-action="firza-view" data-id="simple" aria-pressed="${mode==='simple'}">الوضع البسيط</button>
 <button type="button" class="btn ${mode==='advanced'?'':'secondary'}" data-action="firza-view" data-id="advanced" aria-pressed="${mode==='advanced'}">الوضع المتقدم</button>
 </div><p class="help-text">الوضع البسيط: الرئيسية، الثوابت، المصروف، التقارير. المتقدم: الدورة الذكية والالتزامات والمحافظ والطوارئ وسجل الحركات.</p>
 </section>`;
 return viewSection+tagged.replace('<div class="two-col">',tabs+'<div class="two-col">')+appearance+
 (settingsTab==='account'?profilesPanel():'')+(settingsTab==='backup'?localSnapshotsPanel():'');
}
function render(){
 page=location.hash.slice(1)||page;
 const simple=firzaViewMode()==='simple';
 document.body.dataset.firzaView=simple?'simple':'advanced';
 const extraRoutes={overview:'الملخص السابق',income:'سجل الدخل',obligations:'الالتزامات العامة',plan:'المحافظ'};
 const activeNavs=simple?SIMPLE_NAVS:navs;
 if(simple&&['dashboard','fixed','living'].includes(page))wfMonth=today().slice(0,7);
 if(simple&&!['dashboard','fixed','living','reports','settings'].includes(page))page='dashboard';
 else if(!simple&&!navs.some(n=>n[0]===page)&&!extraRoutes[page])page='dashboard';
 $('nav').innerHTML=activeNavs.map(([p,ic,label])=>'<a class="nav-link '+(page===p?'active':'')+
 '" href="#'+p+'" data-page="'+p+'">'+icon(ic)+'<span>'+label+'</span>'+
 (page===p?'<i class="nav-dot"></i>':'')+'</a>').join('')+
 (simple?'<button type="button" class="nav-link fz-simple-settings-link" data-action="settings">'+icon('settings')+'<span>الإعدادات</span></button>':'');
 $('breadcrumb').textContent=activeNavs.find(n=>n[0]===page)?.[2]||
  (page==='settings'?'الإعدادات':extraRoutes[page]||'الرئيسية');
 let banner=state.demo?'<div class="demo-banner"><span><b>أنت تتصفح خطة توضيحية</b> · الأرقام مثال للتجربة، ابدأ بخطة تحمل أرقامك.</span><button class="text-btn" data-action="setup">ابدأ خطتك '+icon('arrow')+'</button></div>':'';
 if(storageError)banner+='<div class="notice warn">'+safe(storageError)+
  (brokenRaw?'<button class="text-btn" data-action="rescue">تنزيل البيانات الأصلية</button>':'')+'</div>';
 const advancedRenders={dashboard:dashboardPage,salary:()=>incomeStagePage('salary'),
  incentives:()=>incomeStagePage('incentives'),fixed:fixedCommitmentsPage,
  workflow:workflowPage,living:livingPage,emergency:emergencyPage,
  reports:statementPage,overview,income:incomePage,obligations:obligationsPage,
  plan:planPage,ledger:ledgerPage,settings:settingsPage};
 const simpleRenders={dashboard:simpleDashboardPage,fixed:simpleFixedPage,
  living:simpleLivingPage,reports:simpleReportPage,settings:settingsPage};
 $('main').innerHTML=banner+(simple?simpleRenders[page]:advancedRenders[page])();
 paintIcons();window.ThukhrFamily?.sync();
 document.querySelectorAll('[data-neo-page]').forEach(a=>{
  const active=a.dataset.neoPage===page;
  a.classList.toggle('active',active);
  if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
 });
 const more=$('thukhrMoreButton'),moreMenu=$('thukhrMoreMenu');
 if(more){const active=!simple&&['salary','incentives','fixed','workflow','ledger','emergency','settings','obligations','plan','income'].includes(page);
  more.classList.toggle('active',active);more.setAttribute('aria-expanded','false');
  more.setAttribute('aria-current',active?'page':'false');
 }
 if(moreMenu)moreMenu.hidden=true;
 bindPage();
}
