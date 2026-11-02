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
/* A signed amount. The sign follows the number in source order so that, in right-to-left text,
   it renders on the number's left ("+150,000"), as in Latin financial notation. */
function signedMoney(amount,sign){
 return '<span class="num">'+fmt(amount)+'</span>'+(sign?'<span class="fz-sign">'+sign+'</span>':'')+' <small>'+unit()+'</small>';
}
function relativeDay(day){
 if(day===today())return 'اليوم';
 if(day===addDays(today(),-1))return 'أمس';
 return date(day);
}
function activityRow(entry){
 const sign=entry.sign>0?'+':entry.sign<0?'−':'';
 return '<button type="button" class="fz-activity-row" data-action="ledger-detail" data-id="'+safe(entry.id)+'" data-type="'+safe(entry.type)+'">'+
  '<span class="fz-activity-ic"'+(entry.color?' style="--dot:'+entry.color+'"':'')+'>'+icon(entry.icon)+'</span>'+
  '<span class="fz-activity-text"><strong>'+safe(entry.label)+'</strong><small>'+safe([entry.detail,relativeDay(entry.date)].filter(Boolean).join(' · '))+'</small></span>'+
  '<b class="fz-activity-amount" data-sign="'+(entry.sign>0?'in':'out')+'">'+signedMoney(entry.amount,sign)+'</b></button>';
}
function greeting(){
 const name=String(state.settings.name||'').trim(),hour=new Date().getHours();
 return (hour<12?'صباح الخير':'مساء الخير')+(name?'، '+safe(name):'');
}
const PACE_STATUS={ok:['check','ضمن الخطة'],fast:['clock','أسرع من الخطة'],over:['trend','تجاوزت الميزانية']};
function paceCard(info,month){
 const pace=spendingPace(info.plan.total,info.expenses,month,today());
 if(pace.status==='none')return '';
 const [glyph,text]=PACE_STATUS[pace.status];
 const bar=(label,value)=>'<div class="fz-pace-bar"><span>'+label+'</span><b>'+value+'%</b>'+
  '<div class="fz-lite-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.min(100,value)+'" aria-label="'+label+'"><i style="width:'+Math.min(100,value)+'%"></i></div></div>';
 return '<section class="fz-pace" data-status="'+pace.status+'"><div class="fz-lite-section-header"><h2>وتيرة الصرف</h2>'+
  '<span class="fz-status">'+icon(glyph)+text+'</span></div>'+
  (pace.status==='over'?
   '<div class="fz-pace-daily"><span>صرفت أكثر من ميزانية المصروف بـ</span><strong>'+money(pace.over)+'</strong><small>راجع الأقسام أو حدّث الميزانية من صفحة المصروف.</small></div>':
   '<div class="fz-pace-daily"><span>تقدر تصرف يومياً</span><strong>'+money(pace.daily)+'</strong><small>الأيام المتبقية في الشهر: '+pace.daysLeft+'</small></div>')+
  '<div class="fz-pace-bars">'+bar('مضى من الشهر',pace.elapsed)+bar('صُرف من الميزانية',pace.used)+'</div></section>';
}
function activitySection(month){
 const items=recentActivity(state,month);
 return '<section class="fz-lite-list fz-activity"><div class="fz-lite-section-header"><h2>آخر الحركات</h2><span>'+safe(arabicMonth(month))+'</span></div>'+
  (items.length?items.map(activityRow).join(''):
   '<div class="fz-lite-empty"><span class="fz-empty-art">'+icon('ledger')+'</span><strong>ما سجلت حركات هذا الشهر</strong><p>ابدأ بـ«صرف سريع» أو سجّل استلام الراتب.</p></div>')+
  '</section>';
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
 return head(greeting(),'اليوم '+safe(date(today(),true))+' · استلم دخلك، أضف ثوابتك، وسجّل مصروفك.',
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
  paceCard(info,m)+
  '<section class="fz-lite-quick"><button class="btn" data-action="wf-living-quick">'+icon('plus')+' صرف سريع · عدة بنود</button>'+
    '<button class="btn secondary" data-action="simple-extra-income">'+icon('income')+' إضافة دخل آخر</button></section>'+
  activitySection(m)+
  '<section class="fz-lite-summary"><div class="fz-lite-section-header"><h2>ملخص الشهر</h2><a href="#reports">التقرير ←</a></div>'+
    lines.map(([label,value,href])=>'<a class="fz-lite-summary-row" href="'+href+'"><span>'+label+'</span><b>'+money(value)+'</b></a>').join('')+
    '<div class="fz-lite-summary-row"><span>الثوابت التي ما زالت دون تغطية</span><b>'+money(info.projection.uncovered)+'</b></div>'+
    '<div class="fz-lite-note">المصروفات والثوابت المدفوعة فعلياً تنعكس في الرصيد الحالي. لا يُطرح المبلغ المدفوع مرة ثانية.</div></section>'+
  '<section class="fz-lite-shortcuts"><a href="#fixed">'+icon('calendar')+' إدارة الثوابت</a><a href="#living">'+icon('wallet')+' ميزانية المصروف</a><a href="#reports">'+icon('chart')+' تقرير الشهر</a></section>'+
  '</div>';
}
const OB_STATUS={covered:['check','مغطى'],partial:['clock','مغطى جزئياً'],open:['calendar','غير مغطى']};
function simpleFixedPage(){
 const month=today().slice(0,7),p=monthlyCommitmentProjection(state,month),fields=monthlyAllFields();
 const rows=p.entries.map(item=>{
  const f=fields.find(f=>wfObId(month,f.key)===item.id);
  const status=item.uncovered<=0?'covered':item.covered>0?'partial':'open';
  const pct=item.amount?Math.min(100,Math.round(item.covered/item.amount*100)):0;
  return '<article class="fz-lite-ob-row" data-status="'+status+'"><div><strong>'+safe(item.label)+'</strong>'+
   '<span class="fz-ob-badge">'+icon(OB_STATUS[status][0])+OB_STATUS[status][1]+'</span>'+
   '<small>'+(f?monthlyFieldStageLabel(f):'استحقاق مسجل')+
    (f?' · '+(f.autoDeduct===true?'سداد تلقائي':'سداد يدوي'):'')+'</small>'+
   '<span class="fz-ob-meta"><span>أصل المبلغ <b>'+money(item.amount)+'</b></span><span>المغطى <b>'+money(item.covered)+'</b></span></span>'+
   '<div class="fz-lite-progress fz-ob-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'" aria-label="نسبة التغطية"><i style="width:'+pct+'%"></i></div></div>'+
   '<div class="fz-lite-ob-side"><b>'+money(item.uncovered)+'</b><small>غير مغطى</small>'+
   (f&&!state.demo?'<button class="btn small secondary" data-action="fixed-edit" data-id="'+safe(f.key)+'">تعديل</button>':'')+
   '</div></article>';
 }).join('');
 const editable=month===today().slice(0,7)&&!state.settings.closedMonths?.[month]&&!state.demo;
 const covered=p.plannedTotal-p.uncovered,coveredPct=p.plannedTotal?Math.round(covered/p.plannedTotal*100):0;
 const meter=p.plannedTotal?'<div class="fz-lite-meter" data-level="'+(coveredPct>=100?'ok':'warn')+'">'+
  '<div class="fz-lite-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+coveredPct+'" aria-label="نسبة تغطية الثوابت"><i style="width:'+coveredPct+'%"></i></div>'+
  '<span><b>'+coveredPct+'%</b> من الثوابت مغطى</span></div>':'';
 return head('الثوابت','اسم الالتزام، المبلغ، ومن وين ينخصم. تختارها مرة والباقي تلقائي.',
  (editable?'<button class="btn" data-action="fixed-entry">'+icon('plus')+' إضافة التزام</button>':''))+
  '<div class="fz-lite"><section class="fz-lite-fixed-overview"><span>إجمالي الثوابت الشهرية</span>'+
  '<strong>'+money(p.plannedTotal)+'</strong>'+meter+
  '<div class="fz-lite-fixed-metrics"><span>المغطى <b>'+money(covered)+'</b></span>'+
  '<span>المتبقي <b>'+money(p.uncovered)+'</b></span></div>'+
  '</section><section class="fz-lite-list">'+(rows||'<div class="fz-lite-empty"><span class="fz-empty-art">'+icon('calendar')+'</span>'+
    '<strong>بعدك ما أضفت ثوابت</strong><p>أضف الإيجار أو القسط أو الاشتراكات، وحدد مبلغها ومصدر الخصم.</p>'+
    (editable?'<button class="btn" data-action="fixed-entry">'+icon('plus')+' إضافة أول التزام</button>':'')+'</div>')+'</section>'+
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
function spendingBreakdown(month){
 const {total,rows}=spendingByCategory(state,month),max=Math.max(1,...rows.map(r=>r.amount));
 return '<section class="fz-lite-list fz-breakdown"><div class="fz-lite-section-header"><h2>أين ذهب مصروفك؟</h2><span>'+money(total)+'</span></div>'+
  (rows.length?rows.map(r=>{
   const share=Math.round(r.share*100);
   return '<button type="button" class="fz-bar-row" data-action="report-category" data-id="'+safe(r.id)+'" aria-label="'+safe(r.label)+': '+safe(fmt(r.amount))+' '+safe(unit())+'، '+share+'% — عرض التفاصيل">'+
    '<span class="fz-bar-head"><span class="fz-bar-name"><i'+(r.color?' style="--dot:'+r.color+'"':'')+'></i>'+safe(r.label)+'</span>'+
    '<span class="fz-bar-value">'+money(r.amount)+'<small>'+share+'%</small></span></span>'+
    '<span class="fz-bar-track"><span class="fz-bar-fill" style="width:'+Math.max(2,Math.round(r.amount/max*100))+'%"></span></span></button>';
  }).join('')+'<p class="fz-breakdown-hint">اضغط على أي قسم لعرض مصروفاته.</p>':
  '<div class="fz-lite-empty"><span class="fz-empty-art">'+icon('chart')+'</span><strong>لا يوجد مصروف في هذا الشهر</strong><p>عند تسجيل مصروف يظهر هنا توزيعه على الأقسام.</p></div>')+
  '</section>';
}
function reportCategoryDetail(id){
 const month=wfMonth,info=categoryInfo(id);
 const rows=state.transactions.filter(t=>t.type==='expense'&&t.walletId===id&&t.date?.slice(0,7)===month)
  .map((t,index)=>({t,index})).sort((a,b)=>b.t.date.localeCompare(a.t.date)||b.index-a.index).map(({t})=>activityEntry(t));
 if(!rows.length)throw Error('لا توجد مصروفات لهذا القسم في الشهر المختار.');
 const total=rows.reduce((sum,r)=>sum+r.amount,0);
 modal(info.label,arabicMonth(month)+' · عدد الحركات: '+rows.length,
  '<div class="fz-detail-total"'+(info.color?' style="--dot:'+info.color+'"':'')+'><span>مجموع مصروف القسم</span><strong>'+money(total)+'</strong></div>'+
  '<div class="fz-activity">'+rows.map(activityRow).join('')+'</div>',null);
}
const NET_STATUS={up:['trend','زيادة في رصيدك'],down:['arrow','نقص في رصيدك'],flat:['check','بدون تغيير']};
function simpleReportPage(){
 const month=wfMonth;
 const period=reportingPeriod(month),rows=state.transactions.filter(t=>t.date>=period.start&&t.date<=period.end),
   opening=E.statsAt(state,period.previous),closing=E.statsAt(state,period.end);
 const sum=type=>rows.filter(t=>t.type===type).reduce((s,t)=>s+t.amount,0);
 const net=closing.total-opening.total,direction=net>0?'up':net<0?'down':'flat',[glyph,netText]=NET_STATUS[direction];
 return head('التقرير الشهري','كشف واضح للدخل والمصروف والثوابت دون تفاصيل محاسبية معقدة.',
  '<button class="btn" data-action="wf-living-pdf">'+icon('download')+' تنزيل PDF</button>')+
  '<div class="fz-lite"><section class="fz-lite-report-head">'+firzaMonthSelector(month)+
  '<h2>'+safe(arabicMonth(month))+'</h2><p>الحركات حتى نهاية الشهر المختار.</p></section>'+
  '<section class="fz-net" data-direction="'+direction+'"><span>صافي الشهر</span>'+
   '<strong>'+signedMoney(Math.abs(net),net>0?'+':net<0?'−':'')+'</strong>'+
   '<small>'+icon(glyph)+netText+'</small></section>'+
  '<section class="fz-lite-report-grid fz-flow">'+[
    ['بداية الشهر',opening.total,''],['الدخل المستلم',sum('income'),'+'],
    ['المصروف',sum('expense'),'−'],['الثوابت المسددة',sum('pay'),'−'],
    ['نهاية الشهر',closing.total,'']
  ].map(([label,v,sign])=>'<article'+(sign?' data-sign="'+sign+'"':'')+'><span>'+(sign?'<i class="fz-flow-sign">'+sign+'</i>':'')+label+'</span><strong>'+money(v)+'</strong></article>').join('')+
  '</section>'+spendingBreakdown(month)+
  '<div class="fz-lite-note">الاستقطاعات من المصدر قبل وصول الصافي توثيق فقط، ولا تخصم مرة ثانية من رصيد الحساب. يمكنك مراجعة الحركات الكاملة في الوضع المتقدم.</div></div>';
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
