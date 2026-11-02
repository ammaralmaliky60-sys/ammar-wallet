/* وين راحت؟ — app/ui-shell.js
 * Navigation, themes, settings application, toast, shared widgets, ledger rows and overview widgets.
 * Classic script: shares the global scope with the other app/*.js files, loaded in the order listed in index.html. */
'use strict';
const navs=[['dashboard','grid','لوحة التحكم'],['salary','wallet','الراتب'],['incentives','income','الحوافز'],['fixed','calendar','الثوابت والالتزامات'],['workflow','check','الدورة الذكية'],['living','wallet','المصروف'],['emergency','shield','الطوارئ'],['reports','chart','التقارير'],['ledger','ledger','سجل الحركات'],['settings','settings','الإعدادات']];
let settingsTab='account';
const arabicMonth=period=>new Intl.DateTimeFormat('ar-IQ',{month:'long',year:'numeric'}).format(new Date(period+'-01T12:00:00'));
const THUKHR_THEME_KEY='thukhr-appearance-v1';
// Two appearances only. Earlier saved values ('warm', 'modern') fall back to the device setting.
const THUKHR_THEMES=[['classic','فاتح','رملي دافئ وأخضر عميق'],['night','داكن','أخضر ليلي هادئ']];
const THEME_COLORS={classic:'#F6F2EA',night:'#14201F'};
const prefersDark=()=>window.matchMedia?.('(prefers-color-scheme: dark)').matches===true;
function thukhrTheme(){
 // Without a saved choice, follow the device's light/dark setting.
 try{const v=localStorage.getItem(THUKHR_THEME_KEY);if(THUKHR_THEMES.some(a=>a[0]===v))return v}catch{/* Storage unavailable: use the device setting. */}
 return prefersDark()?'night':'classic';
}
function followDeviceTheme(){
 let saved=null;try{saved=localStorage.getItem(THUKHR_THEME_KEY)}catch{/* Storage unavailable. */}
 if(!THUKHR_THEMES.some(a=>a[0]===saved))applySettings();
}
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change',()=>followDeviceTheme());
function setThukhrTheme(v){
 if(!THUKHR_THEMES.some(a=>a[0]===v))return;
 try{localStorage.setItem(THUKHR_THEME_KEY,v)}catch{toast('تعذر حفظ النمط. قد يعود المظهر السابق عند إعادة الفتح.')}
 applySettings();render();
}
function thukhrThemePicker(){
 const t=thukhrTheme();
 return `<div class="thukhr-theme-picker" role="group" aria-label="اختر مظهر «وين راحت؟»">
 ${THUKHR_THEMES.map(([id,label,desc])=>`<button type="button" class="thukhr-theme-choice" data-action="thukhr-appearance" data-id="${id}" data-value="${id}" aria-pressed="${id===t}">
 <span class="thukhr-theme-swatch" aria-hidden="true"></span><span><strong>${label}</strong><small>${desc}</small></span></button>`).join('')}
 </div><small>يُحفظ اختيارك على هذا الجهاز، ولا يغيّر أي حركة أو مبلغ مالي.</small>`;
}
function thukhrFamilyWelcome(){
 return `<section class="firza-welcome" aria-label="ترحيب «وين راحت؟»"><div class="firza-welcome-symbol" aria-hidden="true"><img src="./icon.svg" alt=""></div>
 <div class="firza-welcome-copy"><strong>فلوسك مرتّبة، وحياتك أوضح.</strong><span>وين راحت؟ — اعرف فلوسك وين تروح</span></div></section>`;
}
function thukhrFamilyGoals(){
 return `<section class="thukhr-family-banner" aria-label="أهداف العائلة">
 <span class="thukhr-family-mark" data-thukhr-family-empty>${icon('kids')}</span>
 <img class="thukhr-family-photo" data-thukhr-family-photo alt="" loading="lazy">
 <div><h2>من أجل غدٍ أجمل لهم</h2><p>تخطيط مصاريف العائلة والطوارئ خطوة نحو مستقبل أكثر استقراراً.</p></div>
 </section>`;
}
function paintIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon)})}
function applySettings(){
 const theme=thukhrTheme(),dark=theme==='night';
 document.body.dataset.thukhrTheme=theme;
 document.body.classList.toggle('dark',dark);
 document.documentElement.style.colorScheme=dark?'dark':'light';
 // Both media-specific theme-color tags follow the chosen appearance, so an explicit choice wins over the device.
 document.querySelectorAll('meta[name="theme-color"]').forEach(meta=>meta.setAttribute('content',THEME_COLORS[theme]));
 const toggle=document.querySelector('[data-action="theme"]');
 if(toggle){toggle.dataset.icon=dark?'sun':'moon';toggle.innerHTML=icon(toggle.dataset.icon);
  toggle.setAttribute('aria-label',dark?'التحويل إلى المظهر الفاتح':'التحويل إلى المظهر الداكن');
  toggle.setAttribute('title',dark?'المظهر الفاتح':'المظهر الداكن');}
 $('profileName').textContent=state.settings.name||'مساحتك الشخصية';
 $('avatar').textContent=(state.settings.name||'وين راحت؟')[0];
}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),3600)}
function currentStats(){return E.stats(state)}
function left(){return Math.max(0,Math.min(state.cycle.days,state.cycle.days-diff(today(),state.cycle.start)))}
function cap(walletId){const s=currentStats(),ws=walletId?state.wallets.filter(w=>w.id===walletId&&w.kind==='spend'):state.wallets.filter(w=>w.kind==='spend');if(!left()||today()<state.cycle.start)return 0;const used=state.transactions.filter(t=>t.type==='expense'&&t.date===today()&&ws.some(w=>w.id===t.walletId)).reduce((n,t)=>n+t.amount,0),balance=ws.reduce((n,w)=>n+(s.wallets[w.id]||0),0);return Math.max(0,Math.floor((balance+used)/left())-used)}
function cycleTx(){return state.transactions.filter(t=>t.date>=state.cycle.start)}
function summary(){let t=cycleTx();return{income:t.filter(t=>t.type==='income'&&!t.openingBalance).reduce((a,t)=>a+t.amount,0),expenses:t.filter(t=>t.type==='expense').reduce((a,t)=>a+t.amount,0),paid:t.filter(t=>t.type==='pay').reduce((a,t)=>a+t.amount,0)}}
function head(title,sub,actions='',className=''){return `<div class="page-head ${className}"><div><h1>${title}</h1><p>${sub}</p></div><div class="head-actions">${actions}</div></div>`}
function btn(action,label,ic='plus',style=''){return `<button class="btn ${style}" data-action="${action}">${icon(ic)}${label}</button>`}
function stat(label,value,ic,note='',color=''){return `<article class="stat-card"><div class="stat-top">${label}<span class="stat-icon ${color}">${icon(ic)}</span></div><div class="stat-amount">${money(value)}</div><div class="stat-note ${color?'':'positive'}">${note}</div></article>`}
function empty(title,text){return `<div class="empty">${icon('wallet')}<strong>${title}</strong>${text}</div>`}
function section(title,sub='',action=''){return `<div class="section-heading"><div><h2>${title}</h2>${sub?`<p>${sub}</p>`:''}</div>${action}</div>`}
const walletIcon=w=>w.kind==='emergency'?'shield':w.kind==='saving'?'saving':w.id==='home'?'home':w.id==='kids'?'kids':'user';
function allocationOf(id){return state.transactions.reduce((n,t)=>n+(t.type==='allocate'&&t.walletId===id?t.amount:0)+(t.type==='transfer'&&t.to===id?t.amount:0)-(t.type==='transfer'&&t.from===id?t.amount:0)-(t.type==='release'&&t.walletId===id?t.amount:0),0)}
function walletCards(){const s=currentStats();return state.wallets.map(w=>{const bal=s.wallets[w.id]||0,budget=allocationOf(w.id),pct=budget?Math.max(0,Math.min(100,bal/budget*100)):0;return `<article class="wallet-card" style="--wc:${safe(w.color)}"><div class="wallet-top"><div class="wallet-name"><span class="wallet-icon">${icon(walletIcon(w))}</span>${safe(w.name)}</div><button class="dots" data-action="wallet-edit" data-id="${safe(w.id)}" aria-label="إعدادات ${safe(w.name)}">⋯</button></div><div class="wallet-balance">${money(bal)}</div><div class="wallet-detail">من أصل ${fmt(budget)} ${unit()}</div><div class="progress"><i style="width:${pct}%"></i></div><div class="wallet-foot"><span>${w.kind==='spend'?'المتاح اليوم':'رصيد محمي من الصرف اليومي'}</span><b>${w.kind==='spend'?`${fmt(cap(w.id))} ${unit()}`:w.kind==='emergency'?'احتياطي آمن':'هدف ادخار'}</b></div></article>`}).join('')}
function txLabel(t){const w=id=>state.wallets.find(w=>w.id===id)?.name||'',o=()=>state.obligations.find(o=>o.id===t.obligationId)?.name||'التزام';return {income:['دخل مستلم',t.sourceName?`${t.sourceName} · ${t.incomePeriod}`:t.note||'دخل جديد','income'],expense:[t.emergencyAuthorization?'صرف طارئ':t.note||'مصروف',w(t.walletId),'wallet'],reserve:['حجز التزام',o(),'calendar'],withheld:['مستقطع قبل الإيداع',o(),'check'],pay:['سداد التزام',o(),'check'],allocate:['تخصيص لمحفظة',w(t.walletId),'wallet'],transfer:['تحويل بين المحافظ',`${w(t.from)} ← ${w(t.to)}`,'transfer'],account:[t.from==='card'?'سحب نقدي':'إيداع في البطاقة','حركة داخلية بين الحسابات','transfer'],release:['إعادة للمتاح',w(t.walletId),'wallet'],unreserve:['إلغاء حجز',o(),'calendar']}[t.type]||['حركة','','ledger']}
function ledgerRows(txs,compact=false){if(!txs.length)return empty('سجلك يبدأ من أول خطوة','أضف دخلك أو سجّل أول حركة لتظهر هنا.');return `<div class="table-wrap"><table><thead><tr><th>العملية</th>${!compact?'<th>الغرض / الحساب</th>':''}<th>التاريخ</th><th class="align-left">المبلغ</th>${!compact?'<th></th>':''}</tr></thead><tbody>${txs.map(t=>{const [label,detail,ic]=txLabel(t),sign=t.type==='income'?'+':t.type==='expense'||t.type==='pay'?'−':'';return `<tr><td><div class="cell-name"><span class="cell-icon">${icon(ic)}</span><div>${safe(label)}<small>${safe(compact?detail:t.note||detail)}</small></div></div></td>${!compact?`<td>${safe(detail)}<br><small class="muted">${t.method==='card'?'البطاقة':t.method==='cash'?'نقداً':'تخصيص داخلي'}</small></td>`:''}<td class="muted">${date(t.date)}</td><td class="align-left ${t.type==='income'?'income-color':sign?'expense-color':''}"><span class="num">${fmt(t.amount)}</span>${sign?`<span class="fz-sign">${sign}</span>`:''}\u00a0<small>${unit()}</small></td>${!compact?`<td class="align-left"><button class="icon-btn" data-action="delete-tx" data-id="${safe(t.id)}" aria-label="حذف الحركة">${icon('trash')}</button></td>`:''}</tr>`}).join('')}</tbody></table></div>`}
function ledgerMobileRows(txs){
 if(!txs.length)return empty('لا توجد حركات مطابقة','عدّل البحث أو الفترة.');
 // Newest day first; within a day keep the recorded order (latest first).
 const sorted=txs.map((t,i)=>({t,i})).sort((a,b)=>b.t.date.localeCompare(a.t.date)||a.i-b.i).map(x=>x.t);
 const days=[];
 for(const t of sorted){const last=days.at(-1);if(last?.date===t.date)last.items.push(t);else days.push({date:t.date,items:[t]})}
 const method=t=>t.method==='card'?'بطاقة':t.method==='cash'?'نقداً':'';
 return `<div class="fz-ledger-days">${days.map(day=>{
  const net=day.items.reduce((n,t)=>n+(ACTIVITY_SIGNS[t.type]||0)*t.amount,0);
  const title=day.date===today()?'اليوم':day.date===addDays(today(),-1)?'أمس':date(day.date,true);
  return `<section class="fz-ledger-day"><header><strong>${title}</strong>${net?`<span data-sign="${net>0?'in':'out'}">${signedMoney(Math.abs(net),net>0?'+':'−')}</span>`:''}</header>`+
   day.items.map(t=>{const entry=activityEntry(t);entry.detail=[t.note&&t.note!==entry.label?t.note:entry.detail,method(t)].filter(Boolean).join(' · ');return activityRow(entry,{withDate:false})}).join('')+
   `</section>`;
 }).join('')}</div>`;
}
function ledgerDetail(id){
 const t=state.transactions.find(x=>x.id===id);if(!t)throw Error('الحركة غير موجودة.');
 const [label,detail]=txLabel(t);
 modal('تفاصيل الحركة','المعلومات المسجلة في دفتر «وين راحت؟»',
 `<div class="thukhr-detail-grid">
 <div><span>نوع الحركة</span><strong>${safe(label)}</strong></div>
 <div><span>المبلغ</span><strong>${money(t.amount)}</strong></div>
 <div><span>التاريخ</span><strong>${date(t.date,true)}</strong></div>
 <div><span>الغرض</span><strong>${safe(detail||'—')}</strong></div>
 <div><span>ملاحظة</span><strong>${safe(t.note||'لا توجد')}</strong></div>
 </div><p class="wf-help">للتصحيح أو الحذف يجب تأكيد العملية، ويعيد النظام تدقيق الرصيد.</p>
 <button type="button" class="btn danger" data-action="delete-tx" data-id="${safe(t.id)}">طلب حذف الحركة</button>`,null,'إغلاق');
}
function donut(){const s=currentStats(),parts=[['المحافظ المتاحة',state.wallets.filter(w=>w.kind==='spend').reduce((a,w)=>a+s.wallets[w.id],0),'#5d9a7b'],['الالتزامات المحجوزة',Object.values(s.reserved).reduce((a,n)=>a+n,0),'#c5ad7e'],['الادخار والطوارئ',state.wallets.filter(w=>w.kind!=='spend').reduce((a,w)=>a+s.wallets[w.id],0),'#9b8bb7'],['غير موزّع',s.unallocated,'#dce8e1']],total=parts.reduce((a,p)=>a+p[1],0);let at=0;const con=parts.map(p=>{let from=at;at+=total?p[1]/total*100:0;return `${p[2]} ${from}% ${at}%`}).join(',');const saving=total?Math.round(parts[2][1]/total*100):0;return `<div class="donut-content"><div class="donut" style="background:${total?`conic-gradient(${con})`:'#e9eeeb'}"><div class="donut-label"><strong class="num">${saving}%</strong><small>حصة الادخار</small></div></div><div class="legend">${parts.map(p=>`<div class="legend-row"><i style="background:${p[2]}"></i><span>${p[0]}</span><b class="num">${total?Math.round(p[1]/total*100):0}%</b></div>`).join('')}</div></div><div class="insight">${icon('bulb')}<span>${s.unallocated>0?'لديك '+fmt(s.unallocated)+' '+unit()+' غير موزّع. امنحه هدفاً في خطتك.':'كل مبلغ له غرض محدد. راجع خطتك مع تغيّر احتياجاتك.'}</span></div>`}
function schedulePanel(compact=false){const p=compact?today().slice(0,7):schedulePeriod,monthName=new Intl.DateTimeFormat('ar-IQ',{month:'long',year:'numeric'}).format(new Date(p+'-01T12:00:00'));const entries=S.month(state,p+'-01').filter(x=>wfIncomeMode(p)!=='salary-only'||x.id!=='incentives').map(x=>({...x,status:x.receiptIds.length?'received':today()<x.start?'upcoming':today()<=x.end?'due':'late'}));const labels={received:'تم الاستلام',upcoming:'منتظر',due:'ضمن موعد الاستلام',late:'لم يُؤكّد الاستلام'};return `<section class="panel schedule-panel ${compact?'compact':''}">${section('مواعيد الدخل الشهري',`${monthName} · المواعيد المتوقعة لا تُضاف إلى رصيدك.`,compact?'<a class="text-btn" href="#income">إدارة الدفعات '+icon('arrow')+'</a>':`<label class="month-control">الشهر<input id="scheduleMonth" type="month" value="${safe(p)}" aria-label="شهر مواعيد الدخل"></label>`)}<div class="scheduled-sources">${entries.length?entries.map(x=>`<article class="scheduled-source"><span class="schedule-icon">${icon(x.id==='salary'?'wallet':'income')}</span><div class="schedule-body"><div class="card-top"><h3>${safe(x.name)}</h3><span class="chip ${x.status==='late'?'amber':''}">${labels[x.status]}</span></div><p>من ${date(x.start)} إلى ${date(x.end)} من كل شهر</p><div class="schedule-bottom">${x.status==='received'?`<b class="income-color">${money(x.receivedAmount)}</b><span class="muted">مبلغ مستلم فعلياً</span>`:`<span class="muted">المبلغ يُدخل عند وصوله</span><div class="row"><button class="btn small soft" data-action="receipt" data-id="${safe(x.id)}" data-period="${safe(p)}">تأكيد الاستلام</button>${!compact?`<button class="text-btn" data-action="link-receipt" data-id="${safe(x.id)}" data-period="${safe(p)}">ربط دخل مسجّل</button>`:''}</div>`}</div></div></article>`).join(''):empty('أضف مواعيد دخلك','حدد أيام الاستلام من إعدادات مواعيد الدخل.')}</div>${!compact?'<p class="schedule-note">تدخل الحوافز والراتب في الخطة نفسها، مع استمرار المحافظ والالتزامات. إذا سجّلت دفعة سابقاً، استخدم «ربط دخل مسجّل» لتظهر هنا دون إضافة أموال مرة ثانية.</p>':''}</section>`}
function openIncomeSources(){modal('مواعيد الدخل الشهري','يمكنك إضافة مصادر متعددة وتخصيص نافذة وصول كل منها.',`<div id="incomeSourcesRows"></div><button class="btn soft small" id="addIncomeSource" type="button">${icon('plus')}إضافة مصدر</button><div class="notice">الجدول الحالي يبدأ بالحوافز 10–12 ثم الراتب 22–24. هذه مواعيد متوقعة؛ لا تُنشئ مالاً أو حركات تلقائية.</div>`,(f,form)=>act(s=>{const list=[...form.querySelectorAll('.income-source-row')].map(row=>({id:row.dataset.id,name:row.querySelector('[data-source-name]').value.trim(),fromDay:Number(row.querySelector('[data-source-from]').value),toDay:Number(row.querySelector('[data-source-to]').value)}));S.validateSources(list);s.settings.incomeSources=list;return s},'تم حفظ مواعيد الدخل'),'حفظ المواعيد');const add=(x={id:uid(),name:'',fromDay:1,toDay:1})=>{const row=document.createElement('div');row.className='income-source-row';row.dataset.id=x.id;row.innerHTML=`<div class="source-row-name">${field('اسم المصدر','sourceName','text',x.name,'data-source-name required maxlength="100"')}<button type="button" class="icon-btn" data-remove-source aria-label="إزالة المصدر">${icon('trash')}</button></div><div class="form-grid">${field('من يوم في الشهر','fromDay','number',x.fromDay,'data-source-from required min="1" max="31" step="1"')}${field('إلى يوم في الشهر','toDay','number',x.toDay,'data-source-to required min="1" max="31" step="1"')}</div>`;row.querySelectorAll('.field').forEach(f=>{const input=f.querySelector('input');if(input){input.id='source-'+x.id+'-'+input.name;f.querySelector('label').htmlFor=input.id}});row.querySelector('[data-remove-source]').onclick=()=>row.remove();$('incomeSourcesRows').append(row)};S.sources(state).forEach(add);$('addIncomeSource').onclick=()=>add()}
function openLinkReceipt(id,p){const source=S.sources(state).find(x=>x.id===id);if(!source)throw Error('مصدر الدخل غير موجود.');const eligible=state.transactions.filter(t=>t.type==='income'&&!t.sourceId&&t.date.slice(0,7)>=(p||schedulePeriod));modal('ربط دخل مسجّل',source.name,eligible.length?`<div class="form-grid"><div class="full">${select('حركة الدخل الموجودة','transactionId',eligible.map(t=>[t.id,`${date(t.date,true)} · ${fmt(t.amount)} ${unit()} · ${t.note||'دخل'}`]))}</div>${field('استحقاق أي شهر؟','incomePeriod','month',p||schedulePeriod,`required max="${today().slice(0,7)}"`)}</div><div class="notice">تُربط الحركة بهذا المصدر والشهر فقط؛ يبقى مبلغ الدخل ورصيد حساباتك كما هو.</div>`:empty('لا توجد حركة دخل متاحة للربط','ستظهر هنا حركات الدخل غير المرتبطة التي يعود تاريخها إلى هذا الشهر أو بعده.'),eligible.length?f=>act(s=>{const t=s.transactions.find(t=>t.id===f.transactionId),linked={...t,sourceId:id,sourceName:source.name,incomePeriod:f.incomePeriod};S.guardReceipt(s,linked);if(id==='incentives'&&wfIncomeMode(f.incomePeriod,s)==='salary-only')throw Error('هذا الشهر راتب فقط.');
 const mode=wfIncomeMode(f.incomePeriod,s);Object.assign(t,linked);
 s.settings.wfIncomeModes={...(s.settings.wfIncomeModes||{}),[f.incomePeriod]:mode};
 return ['salary','incentives'].includes(id)?autoFixedSettlement(s,id,f.incomePeriod,t.method,t.date).next:s},'تم ربط الدخل السابق دون تغيير الأرصدة'):null,'ربط الحركة')}

function overviewIdentity(){return `<span class="neo-title-mark" role="img" aria-label="شعار «وين راحت؟»">${BRAND_MARK}</span>`}
function neoOverviewBudget(){
 const s=currentStats(),spendWallets=state.wallets.filter(w=>w.kind==='spend');
 const spendIds=new Set(spendWallets.map(w=>w.id));
 const remain=spendWallets.reduce((total,w)=>total+Math.max(0,s.wallets[w.id]||0),0);
 const used=state.transactions.filter(t=>t.type==='expense'&&t.date>=state.cycle.start&&spendIds.has(t.walletId)).reduce((total,t)=>total+t.amount,0);
 const total=used+remain,pct=total?Math.min(100,Math.max(0,Math.round(used/total*100))):0;
 return `<section class="neo-budget-panel" aria-label="ملخص ميزانية المحافظ اليومية">
 <div><div class="neo-budget-title">${icon('chart')} ميزانية المحافظ اليومية</div>
 <p class="neo-budget-sub">${total?'الصرف من بداية الدورة الحالية، والمتاح حالياً في محافظ الإنفاق.':'لم تخصص مبالغ لمحافظ الإنفاق بعد.'}</p>
 <div class="neo-budget-track" role="progressbar" aria-label="نسبة الصرف من ميزانية المحافظ" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
 <div class="neo-budget-numbers"><span>المصروف <b>${money(used)}</b></span><span>المتاح <b>${money(remain)}</b></span></div>
 </div><div class="neo-budget-pct" style="--neo-pct:${pct}%" aria-hidden="true"><b class="num">${pct}%</b><small>مُستخدم</small></div>
 </section>`+
 `<div class="neo-quick-actions" aria-label="اختصارات مالية">
 <a class="neo-action" href="#plan">${icon('wallet')}المحافظ</a>
 <button type="button" class="neo-action" data-action="income">${icon('income')}إضافة دخل</button>
 <a class="neo-action" href="#reports">${icon('chart')}التحليلات</a>
 </div>`;
}
