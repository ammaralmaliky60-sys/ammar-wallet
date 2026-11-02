/* وين راحت؟ — app/emergency.js
 * Emergency vault: protected spending, moves, corrections and page.
 * Classic script: shares the global scope with the other app/*.js files, loaded in the order listed in index.html. */
'use strict';
function emergencyWallets(st=state){return st.wallets.filter(w=>w.kind==='emergency');}

function emergencyAuth(form){
 const reason=String(form.reason||"").trim();
 if(form.confirm!=="yes")throw Error("يجب تأكيد عملية الطوارئ.");
 if(reason.length<8||reason.length>240)throw Error("أدخل سبباً واضحاً من 8 أحرف على الأقل.");
 if(!["medical","repair","family","other"].includes(form.category))throw Error("اختر نوع الحالة الطارئة.");
 return {category:form.category,reason,confirmed:true};
}

function emergencyReasonFields(){
 return `<div class="field"><label for="f-category">نوع الحالة</label><select id="f-category" name="category" required>
 <option value="medical">علاج أو حالة صحية</option><option value="repair">إصلاح أو صيانة ضرورية</option>
 <option value="family">ظرف عائلي</option><option value="other">سبب آخر</option></select></div>
 <div class="field full"><label for="f-reason">السبب المفصل (إلزامي)</label>
 <textarea id="f-reason" name="reason" required minlength="8" maxlength="240" rows="3" placeholder="اكتب لماذا تحتاج المال من الطوارئ"></textarea></div>
 <div class="field full"><label class="emergency-agreement"><input type="checkbox" name="confirm" value="yes" required> أؤكد الموافقة على استخدام أموال الطوارئ لهذا السبب</label></div>`;
}

function emergencyPage(){
 const wallets=emergencyWallets(),stats=currentStats();
 const total=wallets.reduce((a,w)=>a+(stats.wallets[w.id]||0),0);
 const emergencyIds=new Set(wallets.map(w=>w.id));
 const movements=state.transactions.filter(t=>emergencyIds.has(t.walletId)||emergencyIds.has(t.from)||emergencyIds.has(t.to)).slice().reverse();
 const corrections=Array.isArray(state.settings.emergencyCorrections)?state.settings.emergencyCorrections.slice().reverse():[];
 const isProtected=t=>t.type==='expense'&&emergencyIds.has(t.walletId)||t.type==='release'&&emergencyIds.has(t.walletId)||t.type==='transfer'&&emergencyIds.has(t.from);
 const history=movements.slice(0,35).map(t=>{
  const target=state.wallets.find(w=>w.id===t.walletId||w.id===t.from||w.id===t.to);
  const operation=t.type==='expense'?'صرف طارئ':t.type==='allocate'||t.type==='transfer'&&emergencyIds.has(t.to)?'تغذية الخزنة':t.type==='release'?'إعادة للمتاح':'إعادة تخصيص';
  const sign=t.type==='expense'||t.type==='release'||t.type==='transfer'&&emergencyIds.has(t.from)?'−':'+';
  return `<div class="emergency-history-row"><div><strong>${safe(operation)}</strong><small>${safe(t.date)} · ${safe(target?.name||'الطوارئ')}</small><p>${safe(t.emergencyAuthorization?.reason||t.note||'عملية سابقة')}</p></div><div class="emergency-history-amount"><b>${sign}${fmt(t.amount)} ${unit()}</b>${isProtected(t)?`<button type="button" class="text-btn" data-action="emergency-correct" data-id="${safe(t.id)}">تصحيح موثق</button>`:''}</div></div>`;
 }).join('');
 return head('خزنة الطوارئ','احتياطي مالي محمي؛ لا يظهر في الصرف السريع أو المصروف اليومي.','', 'emergency-page-head')+
 `<section class="emergency-vault" aria-label="خزنة الطوارئ">
 <div class="emergency-vault-top"><span>${icon('shield')} خزنة محمية</span><span>مستبعدة من الصرف اليومي</span></div>
 <p>الرصيد الإجمالي لخزائن الطوارئ</p><h2>${money(total)}</h2>
 <div class="emergency-vault-wallets">${wallets.map(w=>`<div><span>${safe(w.name)}</span><strong>${money(stats.wallets[w.id]||0)}</strong></div>`).join('')||'<p>لا توجد محفظة طوارئ. أنشئ محفظة من صفحة المحافظ.</p>'}</div>
 <div class="emergency-vault-actions">
 ${wallets.length?`${btn('emergency-feed','تغذية الخزنة','plus')}${btn('emergency-spend','صرف طارئ','shield','secondary')}${btn('emergency-move','إعادة تخصيص محمية','transfer','secondary')}`:btn('emergency-create','إنشاء خزنة طوارئ','plus')}
 </div>
 </section><section class="panel emergency-history">${section('سجل الخزنة','الإيداعات والسحوبات والتحويلات الموثقة')}
 ${history||empty('لا توجد حركات طوارئ','ستظهر حركات التغذية والسحب هنا.')}
 </section>${corrections.length?`<section class="panel emergency-history">${section('تصحيحات موثقة','حركات أعيدت محاسبياً مع الاحتفاظ بنسخة منها في سجل التدقيق')}
 ${corrections.map(c=>`<div class="emergency-history-row"><div><strong>تصحيح ${safe(c.original.type)}</strong><small>${safe(c.correctedAt)} · المبلغ الأصلي ${fmt(c.original.amount)} ${unit()}</small><p>${safe(c.reason)}</p></div></div>`).join('')}</section>`:''}
 <div class="notice">تغذية الخزنة تحويل داخلي وليست مصروفاً. الصرف الطارئ وحده ينقص رصيد النقد أو البطاقة. الخصوصية هنا مالية داخل التطبيق وليست تشفيراً لبيانات الجهاز.</div>`;
}

function emergencyFeed(){
 if(state.demo)throw Error("ابدأ خطتك الفعلية أولاً.");
 const wallets=emergencyWallets();if(!wallets.length)throw Error("أنشئ محفظة طوارئ أولاً.");
 const sources=[["unallocated","المتاح غير الموزع"],...state.wallets.filter(w=>w.kind!=='emergency').map(w=>[w.id,w.name])];
 modal("تغذية خزنة الطوارئ","عملية تخصيص أو تحويل داخلي: لا تخصم من البطاقة أو النقد.",
 `<div class="form-grid">${select('الخزنة','vaultId',wallets.map(w=>[w.id,w.name]))}${select('المبلغ من','source',sources)}${amountField()}${dateField()}</div>`,
 f=>act(n=>{
  const target=n.wallets.find(w=>w.id===f.vaultId&&w.kind==='emergency');
  if(!target)throw Error("اختر خزنة صالحة.");
  const v=amount(f.amount);
  if(f.source==="unallocated")return commitEvent(n,{type:'allocate',walletId:target.id,amount:v,date:f.date,note:'تغذية خزنة الطوارئ'});
  const src=n.wallets.find(w=>w.id===f.source&&w.kind!=='emergency');
  if(!src)throw Error("مصدر المبلغ غير صالح.");
  return commitEvent(n,{type:'transfer',from:src.id,to:target.id,amount:v,date:f.date,note:'تغذية خزنة الطوارئ من '+src.name});
 },'تمت تغذية الخزنة دون تسجيل مصروف'),'تأكيد التغذية');
}

function emergencySpend(){
 if(state.demo)throw Error("ابدأ خطتك الفعلية أولاً.");
 const wallets=emergencyWallets(),stats=currentStats();
 if(!wallets.length)throw Error("أنشئ محفظة طوارئ أولاً.");
 if(!wallets.some(w=>(stats.wallets[w.id]||0)>0))throw Error("رصيد الخزنة صفر.");
 modal("صرف طارئ محمي","هذا صرف فعلي من الخزنة ويتطلب سبباً مفصلاً وموافقة. لا يتم التمويل من غير الموزع تلقائياً.",
 `<div class="form-grid">${select('خزنة الطوارئ','vaultId',wallets.map(w=>[w.id,`${w.name} · ${fmt(stats.wallets[w.id]||0)} ${unit()}`]))}${amountField()}${select('طريقة الدفع','method',methodOptions)}${dateField()}${emergencyReasonFields()}</div>`,
 f=>{const auth=emergencyAuth(f);act(n=>{
  const w=n.wallets.find(w=>w.id===f.vaultId&&w.kind==='emergency');if(!w)throw Error("الخزنة غير موجودة.");
  if(!["card","cash"].includes(f.method))throw Error("طريقة الدفع غير صحيحة.");
  return commitEvent(n,{type:'expense',walletId:w.id,amount:amount(f.amount),date:f.date,method:f.method,
   note:'صرف طارئ: '+auth.reason,emergencyAuthorization:auth});
 },'تم تسجيل الصرف الطارئ وسبب العملية');},'تأكيد الصرف الطارئ');
}

function emergencyMove(){
 if(state.demo)throw Error("ابدأ خطتك الفعلية أولاً.");
 const wallets=emergencyWallets(),stats=currentStats();
 if(!wallets.some(w=>(stats.wallets[w.id]||0)>0))throw Error("لا يوجد رصيد طوارئ لإعادة تخصيصه.");
 const destinations=[["unallocated","المتاح غير الموزع"],...state.wallets.filter(w=>w.kind!=='emergency').map(w=>[w.id,w.name])];
 modal("إعادة تخصيص من الطوارئ","لا تعد عملية صرف، لكنها تفك الحماية عن المبلغ؛ لذلك يلزم سبب وموافقة.",
 `<div class="form-grid">${select('من الخزنة','vaultId',wallets.map(w=>[w.id,w.name]))}${select('الوجهة','destination',destinations)}${amountField()}${dateField()}${emergencyReasonFields()}</div>`,
 f=>{const auth=emergencyAuth(f);act(n=>{
  const from=n.wallets.find(w=>w.id===f.vaultId&&w.kind==='emergency');if(!from)throw Error("خزنة غير صالحة.");
  const v=amount(f.amount);
  if(f.destination==="unallocated")return commitEvent(n,{type:'release',walletId:from.id,amount:v,date:f.date,
   note:'إعادة مبلغ الطوارئ للمتاح: '+auth.reason,emergencyAuthorization:auth});
  const to=n.wallets.find(w=>w.id===f.destination&&w.kind!=='emergency');
  if(!to)throw Error("اختر محفظة وجهة صحيحة.");
  return commitEvent(n,{type:'transfer',from:from.id,to:to.id,amount:v,date:f.date,
   note:'تحويل محمي من الطوارئ: '+auth.reason,emergencyAuthorization:auth});
 },'تمت إعادة تخصيص المبلغ مع توثيق السبب');},'تأكيد إعادة التخصيص');
}

function emergencyCorrection(id){
 const t=state.transactions.find(t=>t.id===id);
 if(!t)throw Error("الحركة غير موجودة.");
 const w=state.wallets.find(w=>w.id===(t.type==='transfer'?t.from:t.walletId));
 if(!w||w.kind!=='emergency'||!['expense','release','transfer'].includes(t.type))throw Error("التصحيح المحمي مخصص لعمليات خروج الطوارئ.");
 modal("تصحيح حركة طوارئ","سيُعاد احتساب الرصيد بعد سحب الحركة من الدفتر، وستُحفظ نسخة الحركة وسبب تصحيحها في سجل تدقيق الخزنة.",
 `<div class="notice">المبلغ الأصلي: <b>${money(t.amount)}</b> · ${safe(t.date)}</div>
 <div class="field"><label for="f-correction">سبب التصحيح (إلزامي)</label><textarea id="f-correction" name="reason" required minlength="8" maxlength="240" rows="3" placeholder="ما سبب تصحيح هذه الحركة؟"></textarea></div>
 <div class="field"><label><input type="checkbox" name="confirm" value="yes" required> أوافق على تصحيح الحركة وتوثيق أصلها</label></div>`,
 f=>{
  if(f.confirm!=='yes')throw Error("يجب تأكيد التصحيح.");
  act(n=>E.correctEmergency(n,id,f.reason),'تم التصحيح مع حفظ الحركة السابقة في سجل التدقيق');
 },'تأكيد التصحيح');
}
