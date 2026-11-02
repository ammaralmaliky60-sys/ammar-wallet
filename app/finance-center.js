/* وين راحت؟ — app/finance-center.js
 * Reporting periods, month closing, finance center, reconciliation, profiles and statement.
 * Classic script: shares the global scope with the other app/*.js files, loaded in the order listed in index.html. */
'use strict';
function reportingPeriod(month=wfMonth){
 const start=month+'-01';
 const nextMonth=new Date(start+'T12:00:00Z');
 nextMonth.setUTCMonth(nextMonth.getUTCMonth()+1);
 const exclusive=nextMonth.toISOString().slice(0,10);
 const end=addDays(exclusive,-1)<today()?addDays(exclusive,-1):today();
 if(end<start)throw Error('لا يمكن إعداد كشف عن شهر مستقبلي.');
 return {start,end,previous:addDays(start,-1)};
}
function wfCloseMonth(){
 if(state.demo)throw Error('أنهِ الخطة التوضيحية أولاً.');
 if(wfMonth>=today().slice(0,7))throw Error('إغلاق الشهر متاح بعد انتهاء الشهر فقط.');
 if(state.settings.closedMonths?.[wfMonth])throw Error('الشهر مغلق بالفعل.');
 const {start,end}=reportingPeriod();
 const closing=E.statsAt(state,end);
 confirmModal('إغلاق شهر '+wfMonth+'؟',
  'ستُثبت نهاية الشهر برصيد '+fmt(closing.total)+' '+unit()+
  '، وتُمنع إضافة أو حذف حركات مؤرخة داخله. احفظ نسخة JSON قبل الإغلاق.',
  ()=>act(n=>{
   if(n.settings.closedMonths?.[wfMonth])throw Error('الشهر مغلق بالفعل.');
   n.settings.closedMonths={...(n.settings.closedMonths||{}),
    [wfMonth]:{closedAt:today(),from:start,to:end,closingTotal:E.statsAt(n,end).total}};
   return n;
  },'تم إغلاق الشهر دون تغيير أي مبلغ'),'اعتماد الإغلاق');
}
function financeCenter(){
 const s=currentStats();
 const lastBackup=(()=>{try{return localStorage.getItem('thukhr-last-backup-'+activeProfile)}catch{return null}})();
 const withholding=Object.values(s.withheld||{}).reduce((n,v)=>n+v,0);
 return `<section class="panel">
 ${section('الموقف المالي','بطاقة، نقد، حجوزات، أقساط، ومطابقات في مكان واحد.')}
 <div class="wf-report-metrics">
 <div><span>البطاقة</span><strong>${money(s.card)}</strong></div>
 <div><span>النقد</span><strong>${money(s.cash)}</strong></div>
 <div><span>المتاح</span><strong>${money(s.unallocated)}</strong></div>
 <div><span>محجوز</span><strong>${money(Object.values(s.reserved).reduce((n,v)=>n+v,0))}</strong></div>
 <div><span>مستقطع من المصدر</span><strong>${money(withholding)}</strong></div>
 </div>
 ${lastBackup&&diff(today(),lastBackup)<=7?'':'<div class="notice warn">نزّل نسخة احتياطية JSON واحفظها خارج الهاتف، وكرر ذلك كل أسبوع.</div>'}
 ${btn('finance-reconcile','مطابقة البطاقة أو النقد','check','secondary')}
 ${section('متابعة الأقساط','تُظهر التسوية النقدية والاستقطاع السابق للإيداع بصورة منفصلة')}
 ${state.obligations.filter(o=>!o.archived).slice(-18).map(o=>{
  const pay=s.paid[o.id]||0,held=s.reserved[o.id]||0,withheld=s.withheld?.[o.id]||0;
  const open=Math.max(0,o.amount-pay-withheld-held),covered=o.amount-open,pct=o.amount?Math.min(100,Math.round(covered/o.amount*100)):0;
  const status=open<=0?'covered':covered>0?'partial':'open';
  return `<div class="fz-installment" data-status="${status}"><div class="fz-installment-head"><strong>${safe(o.name)}</strong><b>${money(o.amount)}</b></div>
  <span class="fz-installment-due">${icon('calendar')}${date(o.due,true)}</span>
  <div class="fz-ob-meta"><span>مدفوع <b>${money(pay)}</b></span><span>مستقطع <b>${money(withheld)}</b></span><span>محجوز <b>${money(held)}</b></span><span>غير مغطى <b>${money(open)}</b></span></div>
  <div class="fz-lite-progress fz-ob-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="نسبة تغطية ${safe(o.name)}"><i style="width:${pct}%"></i></div></div>`;
 }).join('')}
 ${section('سجل المطابقات','لا يحدث تعديل للأموال لمجرد وجود فرق')}
 ${state.reconciliations.slice(-7).reverse().map(r=>`<div class="keyval"><span>${safe(r.date)} · ${r.method==='card'?'البطاقة':'النقد'} · ${safe(r.note||'مطابقة')}</span>
 <b>فرق ${fmt(r.delta)} ${unit()} ${r.resolved?'· عولج':r.delta?`<button type="button" class="btn small secondary" data-action="finance-resolve" data-id="${safe(r.id)}">توثيق المعالجة</button>`:'· مطابق'}</b></div>`).join('')||'<p class="wf-help">لا توجد مطابقات محفوظة.</p>'}
 </section>`;
}
function financeReconcile(){
 if(state.demo)throw Error('هذا سجل توضيحي.');
 modal('مطابقة الرصيد','نسجل الفرق للمراجعة دون تعديل الرصيد تلقائياً.',
 `<div class="form-grid">${select('الحساب','method',methodOptions)}${moneyField('الرصيد الفعلي','actual','','required')}
 ${field('مرجع المطابقة','note','text','','required minlength="5" maxlength="120"')}</div>`,
 f=>act(s=>{
  if(f.note.trim().length<5)throw Error('أدخل مرجع كشف الحساب.');
  if(!['card','cash'].includes(f.method))throw Error('الحساب غير صالح.');
  const expected=E.stats(s)[f.method],actual=amount(f.actual,true);
  s.reconciliations.push({id:uid(),date:today(),method:f.method,expected,actual,delta:actual-expected,note:f.note.trim(),transactionIds:s.transactions.map(t=>t.id)});
  return s;
 },'تم توثيق المطابقة والفرق'),'حفظ المطابقة');
}
function financeResolve(id){
 const r=state.reconciliations.find(x=>x.id===id);
 if(!r||r.resolved)throw Error('هذه المطابقة غير متاحة.');
 modal('توثيق معالجة الفرق','لا نُنشئ تسوية نقدية تلقائية.',
 `<div class="field">${field('سبب الفرق والإجراء المتخذ','reason','text','','required minlength="8" maxlength="200"')}</div>
 <div class="field"><label><input type="checkbox" name="approved" value="yes" required> تأكيد التوثيق بعد مراجعة الكشف</label></div>`,
 f=>{if(f.approved!=='yes'||f.reason.trim().length<8)throw Error('السبب والموافقة مطلوبان.');
 act(s=>{const item=s.reconciliations.find(x=>x.id===id);if(!item||item.resolved)throw Error('تمت المعالجة سابقاً.');
 item.resolved=true;item.resolvedAt=today();item.resolution=f.reason.trim();return s;},'تم توثيق معالجة الفرق');},'توثيق المعالجة');
}
function profilesPanel(){
 const choices=localProfiles().map(p=>`<button type="button" class="btn ${p.id===activeProfile?'':'secondary'}" data-action="profile-switch" data-id="${safe(p.id)}">${safe(p.name)}${p.id===activeProfile?' · الحالي':''}</button>`).join('');
 return `<section class="panel">${section('ملفات مالية مستقلة','كل ملف يحفظ دفتره المالي الخاص دون دمج الأرصدة مع الآخرين.')}
 <div class="settings-actions">${choices}</div>
 <div class="settings-actions">${btn('profile-create','إنشاء ملف جديد','plus','secondary')}</div>
 <p class="help-text">فصل محلي على هذا الجهاز، وليس حساباً مشفراً أو محمياً بكلمة مرور. احفظ نسخة JSON مستقلة من كل ملف.</p></section>`;
}
function profileCreate(){
 modal('ملف مالي جديد','لن تُحذف بيانات الملف الحالي. سيُنشأ دفتر مستقل وفارغ.',
 `<div class="form-grid">${field('اسم الملف','profileName','text','','required minlength="2" maxlength="36"')}</div>
 <div class="field"><label><input type="checkbox" name="approve" value="yes" required> أوافق على إنشاء ملف مالي مستقل</label></div>`,
 f=>{
  const name=(f.profileName||'').trim();
  if(f.approve!=='yes'||name.length<2)throw Error('أدخل اسم الملف وأكد الموافقة.');
  const list=localProfiles();
  if(list.length>=8)throw Error('الحد الأقصى 8 ملفات في هذا الجهاز.');
  const id='p'+uid().replace(/[^a-z0-9]/gi,'').slice(0,24);
  if(list.some(p=>p.id===id))throw Error('حدث تعارض في معرف الملف.');
  const fresh=E.initial();fresh.demo=false;E.validate(fresh);
  try{
   localStorage.setItem(BASE_KEY+'-profile-'+id,JSON.stringify(fresh));
   localStorage.setItem(PROFILES_KEY,JSON.stringify([...list.filter(p=>p.id!=='default'),{id,name}]));
   localStorage.setItem(ACTIVE_PROFILE_KEY,id);
  }catch(e){throw Error('تعذر إنشاء الملف بسبب مساحة التخزين. بقيت بيانات الملف الحالي دون تغيير.')}
  location.reload();
 },'إنشاء الملف');
}
function profileSwitch(id){
 const match=localProfiles().find(p=>p.id===id);
 if(!match)throw Error('الملف المطلوب غير موجود.');
 if(id===activeProfile)return;
 confirmModal('فتح ملف '+match.name+'؟','كل ملف يحتفظ برصيده وحركاته بصورة منفصلة. لن تُدمج البيانات.',
 ()=>{try{localStorage.setItem(ACTIVE_PROFILE_KEY,id);location.reload()}catch(e){showError(e.message)}},'فتح الملف');
}
function statementPage(){
 const {start,end,previous}=reportingPeriod(),opening=E.statsAt(state,previous),closing=E.statsAt(state,end);
 const rows=state.transactions.filter(t=>t.date>=start&&t.date<=end);
 const total=k=>rows.filter(t=>t.type===k).reduce((n,t)=>n+t.amount,0);
 const locked=state.settings.closedMonths?.[wfMonth];
 return head('التقارير','تقرير محاسبي لفترة شهرية محددة، من دون خلط أرصدة الأشهر اللاحقة.')+
 `<section class="wf-report-dashboard">
  <div class="wf-report-eyebrow">الفترة ${safe(start)} — ${safe(end)}</div>
  <h2>كشف شهر ${arabicMonth(wfMonth)}</h2>
  <p>الرصيد الافتتاحي والختامي محسوبان من الحركات حتى نهاية الشهر، وليس من رصيد اليوم عند عرض شهر سابق.</p>
  <div class="wf-report-metrics">
   <div><span>الرصيد الافتتاحي</span><strong>${money(opening.total)}</strong></div>
   <div><span>الرصيد الختامي</span><strong>${money(closing.total)}</strong></div>
   <div><span>الدخل المستلم</span><strong>${money(total('income'))}</strong></div>
   <div><span>المصروفات</span><strong>${money(total('expense'))}</strong></div>
   <div><span>مدفوعات الالتزامات</span><strong>${money(total('pay'))}</strong></div>
   <div><span>استقطاعات قبل الإيداع</span><strong>${money(total('withheld'))}</strong></div>
  </div>
  <div class="notice">${locked?'الشهر مغلق مالياً ولا يقبل حركات جديدة مؤرخة فيه.':'الشهر مفتوح؛ قد تتغير الأرقام إذا سُجلت حركات تخصه.'} عدد الحركات: ${rows.length}.</div>
  <div class="wf-living-actions">
   ${btn('wf-living-pdf','تنزيل PDF','download')}
   ${btn('finance-csv','تصدير القيود CSV','download','secondary')}
   ${!locked&&wfMonth<today().slice(0,7)?btn('close-finance-month','إغلاق الشهر','check','secondary'):''}
  </div>
  <p class="wf-report-foot">البيانات محلية. الفلترة وفق تاريخ الحركة المسجل، وعمليات الاستقطاع قبل الإيداع ليست خصماً من الرصيد الصافي.</p>
 </section>`+financeCenter();
}
