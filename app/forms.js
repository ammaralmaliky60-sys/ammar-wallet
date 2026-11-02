/* فِرزة — app/forms.js
 * Form field builders, modal dialogs and transaction/obligation/wallet dialogs.
 * Classic script: shares the global scope with the other app/*.js files, loaded in the order listed in index.html. */
'use strict';
function field(label,name,type='text',value='',extra=''){return `<div class="field"><label for="f-${name}">${label}</label><input id="f-${name}" name="${name}" type="${type}" value="${safe(value)}" ${extra}></div>`}
function select(label,name,options,value=''){return `<div class="field"><label for="f-${name}">${label}</label><select id="f-${name}" name="${name}">${options.map(([v,l])=>`<option value="${safe(v)}" ${v===value?'selected':''}>${safe(l)}</option>`).join('')}</select></div>`}
const walletOptions=()=>state.wallets.map(w=>[w.id,w.name]);const methodOptions=[['card','البطاقة المصرفية'],['cash','نقداً']];
function moneyField(label,name,value='',extra='',dec=ccy().dec){
 return field(label,name,'text',formatMoneyTyping(value),
  `data-money inputmode="${dec?'decimal':'numeric'}" autocomplete="off" oninput="window.mizanFormatMoneyInput(this)" onkeyup="window.mizanFormatMoneyInput(this)" onchange="window.mizanFormatMoneyInput(this)" ${extra}`);
}
function amountField(value='',max=''){
 return moneyField(`المبلغ (${unit()})`,'amount',value,
  `required ${max?`data-max="${safe(max)}"`:''}`);
}
function validateMoneyMax(form){
 for(const el of form.querySelectorAll('input[data-money][data-max]')){
  if(el.value.trim()&&parseMoney(el.value,ccy().dec,true)>parseMoney(el.dataset.max,ccy().dec,true))
   throw Error('المبلغ أكبر من الحد المتاح لهذه العملية.');
 }
}
const dateField=()=>field('تاريخ العملية','date','date',today(),`required max="${today()}" min="${state.cycle.start}"`);
function modal(title,sub,body,submit,label='حفظ'){const d=$('modal');$('modalContent').innerHTML=`<div class="modal-head"><div><h2>${safe(title)}</h2><p>${safe(sub)}</p></div><button class="icon-btn" data-action="close" aria-label="إغلاق">${icon('close')}</button></div><div class="modal-body"><form id="modalForm">${body}<div id="modalError" class="modal-error" role="alert"></div>${submit?`<div class="form-actions"><button class="btn secondary" type="button" data-action="close">إلغاء</button><button class="btn" type="submit">${label}</button></div>`:''}</form></div>`;wireMoneyInputs($('modalContent'));if(!d.open)d.showModal();if(submit)$('modalForm').onsubmit=e=>{e.preventDefault();$('modalError').classList.remove('show');try{validateMoneyMax(e.target);submit(Object.fromEntries(new FormData(e.target)),e.target)}catch(ex){showError(ex.message)}};}
document.addEventListener('input',e=>{
 const el=e.target;
 if(el instanceof HTMLInputElement&&el.matches('input[data-money]'))formatMoneyInput(el);
});
function showError(msg){const el=$('modalError');if(el&&$('modal').open){el.textContent=msg;el.classList.add('show')}else toast(msg)}function closeModal(){$('modal').close()}
function openIncome(sourceId='',requestedPeriod=''){const source=S.sources(state).find(x=>x.id===sourceId),periodValue=requestedPeriod||today().slice(0,7);modal(source?'تأكيد استلام '+source.name:'تسجيل دخل مستلم','يدخل المبلغ الفعلي في خطتك الحالية دون تصفير الأرصدة.',`<div class="form-grid">${select('مصدر الدخل','sourceId',[['','دخل إضافي / رصيد افتتاحي'],...S.sources(state).filter(x=>wfIncomeMode(periodValue)!=='salary-only'||x.id!=='incentives').map(x=>[x.id,x.name])],source?.id||'')}${field('استحقاق أي شهر؟','incomePeriod','month',periodValue,`max="${today().slice(0,7)}"`)}${amountField()}${select('مكان الاستلام','method',methodOptions)}${dateField()}${field('الوصف','note','text',source?.name||'','required maxlength="100" placeholder="راتب، حوافز، عمل حر…"')}</div><div class="notice">الموعد المتوقع لا يزيد الرصيد. بعد تسجيل الاستلام تُخصم البنود الثابتة التي فعّلت لها السداد الآلي فوراً من الحساب المحدد، من دون نافذة تأكيد ثانية. لا يتم خصم البنود اليدوية. لا تضف قسطاً مستقطعاً مسبقاً إلى الخصم التلقائي كي لا يُخصم مرتين.</div>`,f=>act(s=>{const selected=S.sources(s).find(x=>x.id===f.sourceId);
 if(selected?.id==='incentives'&&wfIncomeMode(f.incomePeriod,s)==='salary-only')throw Error('هذا الشهر راتب فقط؛ غيّر نوع الدخل أولاً.');
 const newAmount=amount(f.amount);
 const similar=s.transactions.find(t=>t.type==='income'&&!t.sourceId&&t.amount===newAmount&&t.date.slice(0,7)===f.incomePeriod);
 if(selected&&similar)throw Error('دخل سابق بنفس المبلغ والشهر غير مرتبط. استخدم «ربط دخل مسجّل سابقاً» بدلاً من إضافة مبلغ مكرر.');
 if(s.settings.closedMonths?.[f.date.slice(0,7)])throw Error('الشهر مغلق مالياً.');
 const mode=selected?wfIncomeMode(f.incomePeriod,s):null;
 const next=commitEvent(s,{type:'income',amount:newAmount,method:f.method,date:f.date,note:f.note.trim(),...(selected?{sourceId:selected.id,sourceName:selected.name,incomePeriod:f.incomePeriod}:{})});
 if(selected)next.settings.wfIncomeModes={...(next.settings.wfIncomeModes||{}),[f.incomePeriod]:mode};
 if(selected&&['salary','incentives'].includes(selected.id)){
  const result=autoFixedSettlement(next,selected.id,f.incomePeriod,f.method,f.date);
  return result.next;
 }
 return next},'تم تأكيد الاستلام والخصم التلقائي للبنود المفعّلة'),'تأكيد الاستلام');const form=$('modalForm');const update=()=>{const selected=S.sources(state).find(x=>x.id===form.elements.sourceId.value);form.elements.incomePeriod.disabled=!selected;form.elements.incomePeriod.required=!!selected;if(selected)form.elements.note.value=selected.name};form.elements.sourceId.addEventListener('change',update);update();}

function duplicateExpense(st,operation){
 return st.transactions.some(t=>t.type==='expense'&&t.walletId===operation.walletId&&t.date===operation.date&&
  t.amount===operation.amount&&t.method===operation.method&&
  (t.note||'').trim()===(operation.note||'').trim());
}
function openExpense(preselectedWalletId=null){
 const options=state.wallets.filter(w=>w.kind==='spend').map(w=>[w.id,w.name]);
 if(!options.length)throw Error('لا توجد محفظة صرف يومي. الطوارئ متاحة فقط من خزنتها.');
 modal('تسجيل مصروف','محافظ الطوارئ غير متاحة في هذه الشاشة.',`<div class="form-grid">${select('المحفظة','walletId',options,options.some(w=>w[0]===preselectedWalletId)?preselectedWalletId:options[0][0])}${select('طريقة الدفع','method',methodOptions)}${amountField()}${dateField()}<div class="full">${field('الوصف','note','text','','required maxlength="120" placeholder="على ماذا صرفت؟"')}</div>
 <div class="field full"><label><input type="checkbox" name="duplicateApproved" value="yes"> هذه حركة مستقلة حتى لو تطابق المبلغ والوصف مع حركة اليوم</label></div></div>`,
 f=>act(n=>{if(duplicateExpense(n,{walletId:f.walletId,date:f.date,amount:amount(f.amount),method:f.method,note:f.note.trim()})&&f.duplicateApproved!=='yes')
 throw Error('توجد حركة مصروف مطابقة في اليوم نفسه. إن كانت عملية مستقلة، فعّل خانة التأكيد.');
 const w=n.wallets.find(w=>w.id===f.walletId&&w.kind==='spend');if(!w)throw Error('اختر محفظة صرف يومي صحيحة.');return commitEvent(n,{type:'expense',walletId:w.id,amount:amount(f.amount),method:f.method,date:f.date,note:f.note.trim()})},'تم تسجيل المصروف وتحديث الأرصدة'),'حفظ المصروف');
}
function openObligation(copy=null){
 const due=copy?nextMonth(copy.due):today();
 modal(copy?'تجديد استحقاق دون حجز':'إضافة التزام دون حجز','التسجيل للتوثيق فقط، ولا يغير أي رصيد.',
 `<div class="form-grid">${field('اسم الالتزام','name','text',copy?.name||'','required maxlength="70" placeholder="الإيجار، قسط، إنترنت…"')}${amountField(copy?inputMoney(copy.amount):'')}${field('تاريخ الاستحقاق','due','date',due,'required')}${select('التكرار','recurring',[['no','التزام لمرة واحدة'],['yes','استحقاق متكرر (تجديد يدوي)']],copy?.recurring?'yes':'no')}</div><div class="notice">لا حجز تلقائياً ولو تجاوزت قيمة الالتزام الدخل. بعد الحفظ اضغط «حجز مبلغ» عندما تقرر المبلغ الذي توافق على تخصيصه.</div>`,
 f=>act(x=>{if(copy&&x.obligations.some(o=>(o.sourceId||o.id)===(copy.sourceId||copy.id)&&o.due===f.due))throw Error('هذا الاستحقاق مسجل بالفعل لهذا التاريخ.');const o={id:uid(),name:f.name.trim(),amount:amount(f.amount),due:f.due,recurring:f.recurring==='yes',...(copy?{sourceId:copy.sourceId||copy.id}:{})};if(!o.name)throw Error('أدخل اسم الالتزام.');x.obligations.push(o);return x},'تم تسجيل الالتزام دون حجز أي مبلغ'),'تسجيل الالتزام فقط')
}
function deleteObligation(id){
 const o=state.obligations.find(o=>o.id===id);
 if(!o)throw Error('الالتزام غير موجود.');
 if(state.transactions.some(t=>t.obligationId===id))throw Error('لا يمكن حذف التزام مرتبط بحركات مالية؛ استخدم الأرشفة بعد إلغاء المبلغ المحجوز.');
 confirmModal('حذف الالتزام نهائياً؟',`سيُحذف الالتزام «${o.name}» بقيمة ${fmt(o.amount)} ${unit()} نهائياً. لا تتغيّر الأرصدة، ولكن لا يمكن استرجاعه إلا من نسخة احتياطية.`,()=>act(x=>{
  if(x.transactions.some(t=>t.obligationId===id))throw Error('الالتزام مرتبط بحركات مالية.');
  const i=x.obligations.findIndex(v=>v.id===id);
  if(i<0)throw Error('الالتزام غير موجود.');
  x.obligations.splice(i,1);
  return x;
 },'تم حذف الالتزام دون التأثير على الرصيد'),'تأكيد الحذف');
}
function archiveObligation(id){
 const o=state.obligations.find(o=>o.id===id);
 if(!o)throw Error('الالتزام غير موجود.');
 if(o.archived)throw Error('الالتزام مؤرشف أصلاً.');
 if((currentStats().reserved[id]||0)>0)throw Error('لأرشفة الالتزام، اضغط «إلغاء حجز» أولاً حتى يرجع المبلغ للمتاح للتوزيع.');
 confirmModal('أرشفة الالتزام؟',`سيُنقل الالتزام «${o.name}» إلى الأرشيف، مع الاحتفاظ بكل حركاته المالية وإمكانية استعادته لاحقاً.`,()=>act(x=>{
  if((E.stats(x).reserved[id]||0)>0)throw Error('يجب إلغاء المبلغ المحجوز أولاً.');
  const item=x.obligations.find(v=>v.id===id);
  if(!item)throw Error('الالتزام غير موجود.');
  item.archived=true;
  return x;
 },'تمت أرشفة الالتزام دون التأثير على الرصيد'),'تأكيد الأرشفة');
}
function restoreObligation(id){
 act(x=>{const item=x.obligations.find(v=>v.id===id);if(!item||!item.archived)throw Error('الالتزام غير موجود في الأرشيف.');delete item.archived;return x;},'تمت إعادة الالتزام إلى القائمة النشطة');
}
function nextMonth(str){const d=new Date(str+'T12:00:00'),day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+1);const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,last));return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function obligationAction(type,id){
 const o=state.obligations.find(o=>o.id===id),stats=currentStats();
 if(!o)throw Error('الالتزام غير موجود.');
 const missing=Math.max(0,o.amount-(stats.reserved[id]||0)-(stats.paid[id]||0));
 if(type==='reserve'){
  const available=stats.unallocated,proposed=Math.min(available,missing);
  const sources=[['salary','الراتب الشهري'],['incentives','الحوافز الشهرية'],['other','رصيد متاح / مصدر آخر']];
  const labels={salary:'الراتب الشهري',incentives:'الحوافز الشهرية',other:'رصيد متاح / مصدر آخر'};
  modal('الموافقة على حجز مبلغ',o.name,
   `<div class="wizard-summary"><div class="keyval"><span>المتبقي من الالتزام</span><b>${money(missing)}</b></div><div class="keyval"><span>المتاح للتوزيع الآن</span><b>${money(available)}</b></div><div class="keyval"><span>محجوز سابقاً</span><b>${money(stats.reserved[id]||0)}</b></div></div><div class="form-grid">${amountField(proposed?inputMoney(proposed):'',inputMoney(proposed))}${select('مصدر المبلغ للتوثيق','fundSource',sources,'other')}${dateField()}</div><div class="notice">الحجز يُخصم فقط من «المتاح للتوزيع» بعد موافقتك، ولا ينقص رصيد البطاقة ولا أرصدة المحافظ. اختيار «راتب» أو «حوافز» وصف للسجل، وليس تحققاً مصرفياً من مصدر الأموال.</div><div class="field"><label><input type="checkbox" name="approve" value="yes" required> أوافق على حجز المبلغ المحدد من الرصيد المتاح لهذا الالتزام</label></div>`,
    f=>{if(f.approve!=='yes')throw Error('لا يمكن تنفيذ الحجز دون موافقتك.');const n=amount(f.amount);if(n>missing)throw Error('الحجز يتجاوز المتبقي من الالتزام.');if(n>currentStats().unallocated)throw Error('الرصيد المتاح للتوزيع غير كافٍ؛ لا يتم الحجز من المحافظ. سجّل دخلاً جديداً أو أرجع مخصصاً من محفظة إلى المتاح.');act(x=>commitEvent(x,{type:'reserve',amount:n,obligationId:id,date:f.date,note:'حجز من '+(labels[f.fundSource]||labels.other)}),'تم الحجز بموافقتك')},
    'أوافق وأحجز المبلغ');
  return;
 }
 const value=stats.reserved[id]||0;
 const names={pay:'سداد الالتزام',unreserve:'إلغاء حجز المبلغ'};
 modal(names[type],o.name,`<div class="form-grid">${amountField(inputMoney(value),inputMoney(value))}${type==='pay'?select('الدفع من','method',methodOptions):''}${dateField()}</div><div class="notice">${type==='pay'?'السداد الفعلي يخفض رصيد البطاقة أو النقد ويلغي الحجز المقابل.':'إلغاء الحجز يعيد المبلغ إلى المتاح للتوزيع ويبقى الالتزام غير مغطّى.'}</div>`,f=>act(x=>commitEvent(x,{type,amount:amount(f.amount),obligationId:id,date:f.date,...(type==='pay'?{method:f.method}:{})}),'تم تحديث الالتزام'),names[type]);
}
function openAccount(){modal('حركة نقد وبطاقة','انقل مكان المال من دون احتسابه مصروفاً.',`<div class="form-grid">${select('العملية','direction',[['withdraw','سحب من البطاقة إلى النقد'],['deposit','إيداع النقد في البطاقة']])}${amountField()}${dateField()}${field('ملاحظة','note','text','','maxlength="100"')}</div>`,f=>act(s=>commitEvent(s,{type:'account',from:f.direction==='withdraw'?'card':'cash',to:f.direction==='withdraw'?'cash':'card',amount:amount(f.amount),date:f.date,note:f.note.trim()}),'تم نقل المبلغ بين البطاقة والنقد'))}
function openTransfer(){
 const opts=state.wallets.filter(w=>w.kind!=='emergency').map(w=>[w.id,w.name]);
 if(!opts.length)throw Error('لا توجد محفظة اعتيادية متاحة للتحويل.');
 modal('تحويل بين المحافظ','إخراج المال من الطوارئ يتم فقط عبر خزنة الطوارئ.',
 `<div class="form-grid">${select('من محفظة','from',opts)}${select('إلى محفظة','to',walletOptions(),opts[1]?.[0]||opts[0][0])}${amountField()}${dateField()}<div class="full">${field('السبب','note','text','','maxlength="120"')}</div></div>`,
 f=>act(n=>{if(n.wallets.find(w=>w.id===f.from)?.kind==='emergency')throw Error('لا يمكن إخراج مبلغ من الطوارئ بهذه الطريقة.');return commitEvent(n,{type:'transfer',from:f.from,to:f.to,amount:amount(f.amount),date:f.date,note:f.note.trim()})},'تم التحويل بين المحافظ'));
}
function openRelease(){
 const opts=state.wallets.filter(w=>w.kind!=='emergency').map(w=>[w.id,w.name]);
 if(!opts.length)throw Error('الطوارئ لا تُحرّر من هنا؛ افتح خزنة الطوارئ.');
 modal('إرجاع مبلغ إلى المتاح','لا تظهر هنا محافظ الطوارئ المحمية.',
 `<div class="form-grid">${select('المحفظة','walletId',opts)}${amountField()}${dateField()}</div>`,
 f=>act(s=>{if(s.wallets.find(w=>w.id===f.walletId)?.kind==='emergency')throw Error('استخدم خزنة الطوارئ.');return commitEvent(s,{type:'release',walletId:f.walletId,amount:amount(f.amount),date:f.date})},'تم إرجاع المبلغ إلى المتاح'));
}
function openWallet(id){const w=state.wallets.find(w=>w.id===id);modal(w?'إعدادات المحفظة':'محفظة جديدة','سمّها حسب احتياجاتك وحدّد دورها في خطتك.',`<div class="form-grid">${field('اسم المحفظة','name','text',w?.name||'','required maxlength="45"')}${select('نوع المحفظة','kind',[['spend','مصروفات يومية'],['saving','هدف ادخار'],['emergency','احتياطي طوارئ']],w?.kind||'spend')}${field('اللون','color','color',w?.color||'#508b74','required')}${field('وزن التوزيع','weight','number',w?.weight??10,'required min="0" max="10000" step="1"')}</div><div class="notice">الوزن يُستخدم للتوزيع النسبي. الادخار والطوارئ مستثنيان من سقف الصرف اليومي.</div>`,f=>act(s=>{if(!f.name.trim())throw Error('أدخل اسماً للمحفظة.');const v={id:w?.id||uid(),name:f.name.trim(),kind:f.kind,color:f.color,weight:Number(f.weight)};if(w&&w.kind!==v.kind&&s.transactions.some(t=>t.walletId===w.id||t.from===w.id||t.to===w.id))
 throw Error('لا يمكن تغيير نوع محفظة مرتبطة بحركات سابقة. أنشئ محفظة جديدة لحماية السجل.');
 if(w)s.wallets[s.wallets.findIndex(x=>x.id===w.id)]=v;else s.wallets.push(v);return s},'تم حفظ المحفظة'))}
function openAllocate(){const available=currentStats().unallocated;modal('توزيع المتاح على محافظك','التزاماتك أولاً، ثم خطتك المرنة.',`<div class="field"><label for="preset">طريقة التوزيع</label><select id="preset"><option value="weights">بحسب أوزان محافظي</option><option value="original">نسب الخطة الأصلية (125 / 120 / 60 / 30)</option><option value="custom">مبالغ مخصصة</option></select></div><div class="notice">المتاح ${money(available)} · يمكنك توزيع جزء منه وإبقاء الباقي دون تخصيص.</div>${state.wallets.map(w=>`<div class="allocation-row"><span>${safe(w.name)}<small>${w.kind==='spend'?'صرف يومي':'احتياطي / ادخار'}</small></span><div class="field"><input aria-label="مخصص ${safe(w.name)}" type="text" data-money inputmode="${ccy().dec?'decimal':'numeric'}" autocomplete="off" oninput="window.mizanFormatMoneyInput(this)" name="a-${safe(w.id)}" required></div></div>`).join('')}<div class="keyval"><span>مجموع التوزيع</span><b id="allocationTotal"></b></div>`,(f,form)=>act(s=>{let next=s,total=0;for(const w of state.wallets){const n=amount(f['a-'+w.id],true);total+=n;if(n)next=commitEvent(next,{type:'allocate',walletId:w.id,amount:n})}if(!total)throw Error('أدخل مبلغاً واحداً على الأقل.');return next},'تم توزيع المبلغ على المحافظ'),'اعتماد التوزيع');const form=$('modalForm'),preset=$('preset');function fill(){let weights=state.wallets.map(w=>({id:w.id,weight:preset.value==='original'?({home:125,personal:120,kids:60,emergency:30}[w.id]||0):w.weight}));if(preset.value!=='custom'){try{const allocation=E.distribute(available,weights);for(const w of state.wallets)form.elements['a-'+w.id].value=formatMoneyTyping(inputMoney(allocation[w.id]))}catch(e){showError(e.message)}}update()}function update(){try{let total=0;for(const w of state.wallets)total+=parseMoney(form.elements['a-'+w.id].value||'0',ccy().dec,true);if(!Number.isSafeInteger(total))throw Error();$('allocationTotal').innerHTML=money(total);$('allocationTotal').className=total>available?'expense-color':'income-color'}catch{$('allocationTotal').textContent='أدخل مبالغ صحيحة';$('allocationTotal').className='expense-color'}}preset.onchange=fill;form.addEventListener('input',update);fill()}
function openCycle(){
 const opts=[['','دخل آخر / بلا ربط بمصدر'],...S.sources(state).filter(s=>wfIncomeMode(today().slice(0,7))!=='salary-only'||s.id!=='incentives').map(s=>[s.id,s.name])];
 const hasExisting=state.transactions.some(t=>t.type==='income'&&t.date.slice(0,7)===today().slice(0,7));
 modal('بدء دورة دخل جديدة','اختر مصدر الدخل وشهر استحقاقه حتى لا يُسجَّل الراتب نفسه مرتين.',
 `<div class="form-grid">
 ${field('تاريخ بداية الدورة','start','date',today(),`required min="${addDays(state.cycle.start,1)}" max="${today()}"`)}
 ${field('مدة الدورة بالأيام','days','number',state.cycle.days,'required min="1" max="366" step="1"')}
 ${select('مصدر المبلغ المستلم','sourceId',opts,'salary')}
 ${field('شهر الاستحقاق','incomePeriod','month',today().slice(0,7),`required max="${today().slice(0,7)}"`)}
 ${amountField()}
 ${select('مكان الاستلام','method',methodOptions)}
 <div class="full">${select('فائض محافظ الصرف','policy',[['same','إبقاؤه في محافظه'],['reserve','نقله إلى محفظة الطوارئ']])}</div>
 </div>
 <div class="notice">${hasExisting?'تنبيه: لديك دخل مسجل خلال هذا الشهر.':'سيُربط هذا الدخل بالمصدر الشهري المختار.'}
 إذا سبق تسجيل المبلغ، استخدم «ربط دخل سابق» من خطة الدخل بدلاً من إضافته مجدداً.</div>
 <div class="field"><label><input type="checkbox" name="approve" value="yes" required> أؤكد أن هذا دخل جديد وصل فعلياً ولم أسجله سابقاً</label></div>`,
 f=>{
  if(f.approve!=='yes')throw Error('يجب تأكيد عدم تكرار الدخل.');
  const value=amount(f.amount),source=S.sources(state).find(x=>x.id===f.sourceId);
  if(source&&S.receipts(state,source.id,f.incomePeriod).length)throw Error('هذا المصدر مسجل بالفعل لشهر الاستحقاق.');
  const similar=state.transactions.find(t=>t.type==='income'&&t.amount===value&&t.date.slice(0,7)===f.incomePeriod);
  if(similar)throw Error('يوجد دخل سابق بنفس المبلغ والشهر. راجع الحركة وربطها بدلاً من تكرار الراتب.');
  act(s=>E.startCycle(s,{start:f.start,days:Number(f.days),income:value,method:f.method,
    policy:f.policy,sourceId:source?.id||'',incomePeriod:source?f.incomePeriod:''}),
   'تم بدء الدورة وربط الدخل بمصدره مرة واحدة');
 },'تأكيد الدخل وبدء الدورة');
}
