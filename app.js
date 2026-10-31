(()=>{'use strict';
const E=window.FinanceEngine, S=window.IncomeSchedule, BASE_KEY='mizan-finance-v2', $=id=>document.getElementById(id);
const PROFILES_KEY='thukhr-local-profiles-v1',ACTIVE_PROFILE_KEY='thukhr-active-profile-v1';
function localProfiles(){
 try{
  const saved=JSON.parse(localStorage.getItem(PROFILES_KEY)||'[]');
  const list=Array.isArray(saved)?saved.filter(p=>p&&typeof p.id==='string'&&/^p[a-z0-9]{4,25}$/i.test(p.id)&&typeof p.name==='string'&&p.name.trim()):[];
  return [{id:'default',name:'المساحة الأساسية'},...list];
 }catch{return [{id:'default',name:'المساحة الأساسية'}]}
}
let activeProfile='default';
try{const id=localStorage.getItem(ACTIVE_PROFILE_KEY);if(localProfiles().some(p=>p.id===id))activeProfile=id}catch{}
let KEY=activeProfile==='default'?BASE_KEY:BASE_KEY+'-profile-'+activeProfile;

const paths={grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',income:'M12 3v12m-4-4 4 4 4-4 M4 15v5h16v-5',calendar:'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2 M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2',wallet:'M4 6h14V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h15V7H5a2 2 0 0 1-2-2 M16 12h5v5h-5a2.5 2.5 0 0 1 0-5z',ledger:'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 7h6m-6 4h6m-6 4h3',chart:'M4 3v18h17M8 16v-5m5 5V6m5 10v-8',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M10 3h4l1 3 3 1 3 1v4l-3 1-1 3-1 3h-4l-1-3-3-1-3-1v-4l3-1 1-3z',plus:'M12 5v14M5 12h14',arrow:'M18 12H6m5-5-5 5 5 5',chevron:'m14 7-5 5 5 5',shield:'M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7z M8 12l3 3 5-5',moon:'M20 14a8 8 0 0 1-10-10 9 9 0 1 0 10 10z',sun:'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',help:'M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3h.01 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',home:'m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7',user:'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 21v-3a8 8 0 0 1 16 0v3',kids:'M9 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M16 6a2.5 2.5 0 1 0 0 5 M3 20v-3a6 6 0 0 1 12 0v3m2-6a4 4 0 0 1 4 4v2',saving:'M5 9h13l3 3-2 5h-2v3h-3v-2H9v2H6v-4l-3-2v-3z M8 9V6h5M16 12h.01',trend:'m3 17 6-6 4 4 8-10m-6 0h6v6',clock:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M12 6v6l4 2',check:'m5 12 4 4L19 6',close:'m6 6 12 12M6 18 18 6',transfer:'M3 7h17m-5-5 5 5-5 5 M21 17H4m5-5-5 5 5 5',download:'M12 3v12m-5-5 5 5 5-5 M4 15v6h16v-6',upload:'M12 16V4m-5 5 5-5 5 5 M4 16v5h16v-5',trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',bulb:'M8 15a6 6 0 1 1 8 0l-1 3H9z M9 21h6',card:'M3 5h18v14H3z M3 10h18m-14 5h4',cash:'M2 6h20v13H2z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M5 9v7m14-7v7',print:'M6 8V3h12v5M6 17H3V9h18v8h-3M6 14h12v7H6z',edit:'m4 16 12-12 4 4-12 12-5 1z M14 6l4 4'};
const icon=(name)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.wallet}"/></svg>`;
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{let d=new Date;return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const addDays=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const diff=(a,b)=>Math.round((new Date(a+'T12:00:00')-new Date(b+'T12:00:00'))/86400000);
const date=(s,long=false)=>new Intl.DateTimeFormat('ar-IQ',{day:'numeric',month:long?'long':'short',...(long?{year:'numeric'}:{})}).format(new Date(s+'T12:00:00'));
const uid=()=>crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
const currencies={IQD:{label:'دينار عراقي',unit:'د.ع',dec:0},USD:{label:'دولار أمريكي',unit:'$',dec:2},SAR:{label:'ريال سعودي',unit:'ر.س',dec:2},AED:{label:'درهم إماراتي',unit:'د.إ',dec:2},EUR:{label:'يورو',unit:'€',dec:2}};
let state,storageError='',brokenRaw='',page='workflow',wizard={},wizardStep=0,schedulePeriod=today().slice(0,7);
function load(){try{const raw=localStorage.getItem(KEY);if(raw){try{const s=JSON.parse(raw);E.validate(s);return s}catch(e){brokenRaw=raw;storageError='تعذر قراءة البيانات المحفوظة. احتفظ بنسخة منها قبل بدء خطة جديدة.';return E.initial()}}return makeDemo()}catch(e){storageError='الحفظ المحلي غير متاح في هذا المتصفح. صدّر نسخة قبل المغادرة.';return E.initial()}}
function ccy(){return currencies[state.settings.currency]||currencies.IQD}const unit=()=>ccy().unit;
function inputMoney(n,dec=ccy().dec){const b=BigInt(n||0),neg=b<0n,a=neg?-b:b,p=10n**BigInt(dec);return (neg?'-':'')+(a/p).toString()+(dec?'.'+(a%p).toString().padStart(dec,'0'):'')}
const formatMinor=(n,dec=ccy().dec)=>{const raw=inputMoney(n,dec),[whole,frac='']=raw.split('.'),locale=state.settings.digits==='ar'?'ar-IQ':'en-US',nf=new Intl.NumberFormat(locale),part=frac.replace(/0+$/,'');let result=nf.format(BigInt(whole));if(n<0&&BigInt(whole)===0n)result='−'+result;if(part){const dp=new Intl.NumberFormat(locale).formatToParts(1.1).find(p=>p.type==='decimal').value;const digits=part.replace(/\d/g,d=>new Intl.NumberFormat(locale,{useGrouping:false}).format(Number(d)));result+=dp+digits}return result};
const fmt=n=>formatMinor(n);
const money=n=>`<span class="num">${fmt(n)}</span> <small>${unit()}</small>`;
function normalizeMoneyText(raw){
 const arabic='٠١٢٣٤٥٦٧٨٩',persian='۰۱۲۳۴۵۶۷۸۹';
 const str=String(raw).trim()
  .replace(/[٠-٩]/g,c=>String(arabic.indexOf(c)))
  .replace(/[۰-۹]/g,c=>String(persian.indexOf(c)))
  .replace(/٫/g,'.').replace(/٬/g,',');
 if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(str))
   throw Error('أدخل مبلغاً صحيحاً، مثل 35,890 أو 35890.');
 return str.replace(/,/g,'');
}
function formatMoneyTyping(raw){
 const arabic='٠١٢٣٤٥٦٧٨٩',persian='۰۱۲۳۴۵۶۷۸۹';
 const str=String(raw??'')
   .replace(/[٠-٩]/g,c=>String(arabic.indexOf(c)))
   .replace(/[۰-۹]/g,c=>String(persian.indexOf(c)))
   .replace(/٫/g,'.').replace(/٬/g,',');
 if(!/^[\d,.]*$/.test(str) || str.split('.').length>2)return str;
 const [whole,frac]=str.split('.'),digits=whole.replace(/,/g,'');
 if(!/^\d*$/.test(digits)|| (frac!==undefined&&!/^\d*$/.test(frac)))return str;
 return digits.replace(/\B(?=(\d{3})+(?!\d))/g,',')+(frac!==undefined?'.'+frac:'');
}
function formatMoneyInput(el){
 const original=el.value,selection=el.selectionStart??original.length;
 const marker=(str)=>[...str].filter(c=>/[0-9.٠-٩۰-۹٫]/.test(c)).length;
 const count=marker(original.slice(0,selection)),next=formatMoneyTyping(original);
 if(next===original)return;
 el.value=next;
 let pos=0,seen=0;
 while(pos<next.length&&seen<count){if(/[0-9.]/.test(next[pos]))seen++;pos++}
 try{el.setSelectionRange(pos,pos)}catch{}
}
// Public input hook plus direct listeners support Android keyboards and dynamic modal fields.
window.mizanFormatMoneyInput=formatMoneyInput;
function wireMoneyInputs(root){
 for(const el of root.querySelectorAll('input[data-money]')){
  if(el.dataset.moneyWired==='1')continue;
  el.dataset.moneyWired='1';
  for(const type of ['input','keyup','change','blur','compositionend']){
   el.addEventListener(type,()=>formatMoneyInput(el));
  }
  formatMoneyInput(el);
 }
}
function parseMoney(raw,dec,zero=false){const str=normalizeMoneyText(raw);if(!/^(\d+)(\.\d+)?$/.test(str))throw Error('أدخل مبلغاً صحيحاً غير سالب.');const [whole,fraction='']=str.split('.');if(fraction.length>dec)throw Error(`العملة تدعم ${dec} منازل عشرية.`);const n=BigInt(whole)*10n**BigInt(dec)+BigInt(fraction.padEnd(dec,'0')||'0');if(n>BigInt(Number.MAX_SAFE_INTEGER)||(!zero&&n===0n))throw Error('أدخل مبلغاً موجباً ضمن الحدود المسموحة.');return Number(n)}
function amount(raw,zero=false){return parseMoney(raw,ccy().dec,zero)}
function save(next,message='تم الحفظ بنجاح',replaceBroken=false){if(brokenRaw&&!replaceBroken)throw Error('توجد بيانات محفوظة تعذر قراءتها. نزّلها من زر الإنقاذ، ثم ابدأ خطة جديدة أو استعد نسخة صحيحة.');E.validate(next);try{localStorage.setItem(KEY,JSON.stringify(next))}catch(e){throw Error('تعذر حفظ التغيير. صدّر نسخة احتياطية أو أتح مساحة تخزين ثم حاول مجدداً.')}state=next;storageError='';brokenRaw='';applySettings();render();if(message)toast(message)}
function act(fn,msg){try{save(fn(structuredClone(state)),msg);closeModal()}catch(e){showError(e.message)}}
function event(s,t){return E.commit(s,{id:uid(),date:today(),...t})}
function makeDemo(){let s=E.initial();s.demo=true;s.settings.name='';s.cycle.start=addDays(today(),-9);s.cycle.days=30;
s.wallets=[{id:'home',name:'المنزل والمعيشة',kind:'spend',color:'#4a9776',weight:125},{id:'personal',name:'المصاريف الشخصية',kind:'spend',color:'#7297ba',weight:120},{id:'kids',name:'الأسرة والأطفال',kind:'spend',color:'#c6a569',weight:60},{id:'emergency',name:'الطوارئ والادخار',kind:'emergency',color:'#9a86bc',weight:30}];
const start=s.cycle.start;s=event(s,{type:'income',date:start,amount:1500000,method:'card',note:'الراتب الشهري'});
s.obligations=[{id:'rent',name:'إيجار السكن',amount:350000,due:addDays(start,2),recurring:true},{id:'installment',name:'قسط شهري',amount:200000,due:addDays(start,15),recurring:true},{id:'services',name:'الإنترنت والخدمات',amount:100000,due:addDays(start,12),recurring:true}];
for(const o of s.obligations)s=event(s,{type:'reserve',date:start,obligationId:o.id,amount:o.amount});
s=event(s,{type:'pay',date:addDays(start,2),obligationId:'rent',amount:350000,method:'card',note:'سداد إيجار السكن'});
for(const [walletId,n]of Object.entries({home:125000,personal:120000,kids:60000,emergency:230000}))s=event(s,{type:'allocate',date:start,walletId,amount:n});
s=event(s,{type:'account',date:addDays(start,3),from:'card',to:'cash',amount:100000,note:'سحب نقدي'});
s=event(s,{type:'expense',date:addDays(start,4),walletId:'home',amount:18500,method:'card',note:'مشتريات المنزل'});
s=event(s,{type:'expense',date:addDays(start,6),walletId:'personal',amount:12000,method:'cash',note:'مواصلات ومصاريف شخصية'});
s=event(s,{type:'expense',date:addDays(start,8),walletId:'kids',amount:7500,method:'cash',note:'احتياجات الأسرة'});return s}
state=load();
// Apply the new visual identity once, preserving all financial entries and calculations.
// Afterwards, the user's light/dark choice remains fully under their control.
try {
  const skinKey='mizan-charcoal-gold-v1';
  if(!brokenRaw&&localStorage.getItem(skinKey)!=='1'){
    const visual=structuredClone(state);
    visual.settings.theme='dark';
    E.validate(visual);
    if(localStorage.getItem(KEY)!==null)localStorage.setItem(KEY,JSON.stringify(visual));
    state=visual;
    localStorage.setItem(skinKey,'1');
  }
}catch(e){state.settings.theme='dark'}
const navs=[['workflow','calendar','خطة الدخل'],['living','wallet','المعيشة'],['emergency','shield','الطوارئ'],['reports','chart','التقارير'],['ledger','ledger','سجل الحركات'],['settings','settings','الإعدادات']];
let settingsTab='account';
const arabicMonth=period=>new Intl.DateTimeFormat('ar-IQ',{month:'long',year:'numeric'}).format(new Date(period+'-01T12:00:00'));
const THUKHR_THEME_KEY='thukhr-appearance-v1';
const THUKHR_THEMES=[['classic','الأساسي','عاجي وذهبي'],['night','الليلي','فحمي وذهبي'],['warm','الدافئ','عائلي وهادئ'],['modern','العصري','بنفسجي وذهبي']];
function thukhrTheme(){
 try{const v=localStorage.getItem(THUKHR_THEME_KEY);return THUKHR_THEMES.some(a=>a[0]===v)?v:'classic'}
 catch{return 'classic'}
}
function setThukhrTheme(v){
 if(!THUKHR_THEMES.some(a=>a[0]===v))return;
 try{localStorage.setItem(THUKHR_THEME_KEY,v)}catch{toast('تعذر حفظ النمط. قد يعود المظهر السابق عند إعادة الفتح.')}
 applySettings();render();
}
function thukhrThemePicker(){
 const t=thukhrTheme();
 return `<div class="thukhr-theme-picker" role="group" aria-label="اختر مظهر ذُخر">
 ${THUKHR_THEMES.map(([id,label,desc])=>`<button type="button" class="thukhr-theme-choice" data-action="thukhr-appearance" data-id="${id}" data-value="${id}" aria-pressed="${id===t}">
 <span class="thukhr-theme-swatch" aria-hidden="true"></span><span><strong>${label}</strong><small>${desc}</small></span></button>`).join('')}
 </div><small>يُحفظ اختيارك على هذا الجهاز، ولا يغيّر أي حركة أو مبلغ مالي.</small>`;
}
function thukhrFamilyWelcome(){
 return `<section class="thukhr-intro" aria-label="رسالة ذُخر">
 <div class="thukhr-welcome"><div class="thukhr-mini-logo"><img src="./icon.svg" alt=""></div>
 <div><h2>ذُخر — مالك اليوم، أمانك غداً</h2><p>خطتك المالية من أجل حياة أكثر أماناً لك ولعائلتك.</p></div></div>
 <img class="thukhr-family-photo" data-thukhr-family-photo alt="" loading="lazy">
 </section>`;
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
 const theme=thukhrTheme(),dark=theme==='night'||theme==='modern';
 document.body.dataset.thukhrTheme=theme;
 document.body.classList.toggle('dark',dark);
 document.documentElement.style.colorScheme=dark?'dark':'light';
 const meta=document.querySelector('meta[name="theme-color"]');
 const colors={classic:'#faf7f0',night:'#090d13',warm:'#f5ead9',modern:'#120b22'};
 if(meta)meta.setAttribute('content',colors[theme]);
 const toggle=document.querySelector('[data-action="theme"]');
 if(toggle){toggle.dataset.icon=dark?'sun':'moon';toggle.innerHTML=icon(toggle.dataset.icon);
  toggle.setAttribute('aria-label',dark?'المظهر الأساسي الفاتح':'المظهر الليلي');
  toggle.setAttribute('title',dark?'التحويل إلى المظهر الأساسي':'التحويل إلى المظهر الليلي');}
 $('profileName').textContent=state.settings.name||'مساحتك الشخصية';
 $('avatar').textContent=(state.settings.name||'ذُخر')[0];
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
function ledgerRows(txs,compact=false){if(!txs.length)return empty('سجلك يبدأ من أول خطوة','أضف دخلك أو سجّل أول حركة لتظهر هنا.');return `<div class="table-wrap"><table><thead><tr><th>العملية</th>${!compact?'<th>الغرض / الحساب</th>':''}<th>التاريخ</th><th class="align-left">المبلغ</th>${!compact?'<th></th>':''}</tr></thead><tbody>${txs.map(t=>{const [label,detail,ic]=txLabel(t),sign=t.type==='income'?'+':t.type==='expense'||t.type==='pay'?'−':'';return `<tr><td><div class="cell-name"><span class="cell-icon">${icon(ic)}</span><div>${safe(label)}<small>${safe(compact?detail:t.note||detail)}</small></div></div></td>${!compact?`<td>${safe(detail)}<br><small class="muted">${t.method==='card'?'البطاقة':t.method==='cash'?'نقداً':'تخصيص داخلي'}</small></td>`:''}<td class="muted">${date(t.date)}</td><td class="align-left ${t.type==='income'?'income-color':sign?'expense-color':''}"><span class="num">${sign}${fmt(t.amount)}</span> <small>${unit()}</small></td>${!compact?`<td class="align-left"><button class="icon-btn" data-action="delete-tx" data-id="${safe(t.id)}" aria-label="حذف الحركة">${icon('trash')}</button></td>`:''}</tr>`}).join('')}</tbody></table></div>`}
function ledgerMobileRows(txs){
 if(!txs.length)return empty('لا توجد حركات مطابقة','عدّل البحث أو الفترة.');
 return `<div class="thukhr-transaction-cards">${txs.map(t=>{
  const [label,detail,ic]=txLabel(t),sign=t.type==='income'?'+':t.type==='expense'||t.type==='pay'?'−':'';
  const wallet=state.wallets.find(w=>w.id===t.walletId);
  return `<article class="thukhr-transaction-card">
   <div class="thukhr-transaction-icon">${icon(ic)}</div>
   <div class="thukhr-transaction-body"><strong>${safe(label)}</strong>
    <small>${safe(t.note||wallet?.name||detail||'حركة مالية')}</small>
    <span class="thukhr-transaction-date">${date(t.date,true)} · ${t.method==='card'?'بطاقة':t.method==='cash'?'نقداً':'تحويل داخلي'}</span>
   </div>
   <div class="thukhr-transaction-right"><b class="${sign?'thukhr-outgoing':''}">${sign}${fmt(t.amount)} <small>${unit()}</small></b>
    <button type="button" class="thukhr-transaction-detail" data-action="ledger-detail" data-id="${safe(t.id)}" aria-label="تفاصيل الحركة ${safe(label)}">تفاصيل</button>
   </div>
  </article>`;
 }).join('')}</div>`;
}
function ledgerDetail(id){
 const t=state.transactions.find(x=>x.id===id);if(!t)throw Error('الحركة غير موجودة.');
 const [label,detail]=txLabel(t);
 modal('تفاصيل الحركة','المعلومات المسجلة في دفتر ذُخر',
 `<div class="thukhr-detail-grid">
 <div><span>نوع الحركة</span><strong>${safe(label)}</strong></div>
 <div><span>المبلغ</span><strong>${money(t.amount)}</strong></div>
 <div><span>التاريخ</span><strong>${date(t.date,true)}</strong></div>
 <div><span>الغرض</span><strong>${safe(detail||'—')}</strong></div>
 <div><span>ملاحظة</span><strong>${safe(t.note||'لا توجد')}</strong></div>
 </div><p class="wf-help">للتصحيح أو الحذف يجب تأكيد العملية، ويعيد النظام تدقيق الرصيد.</p>
 <button type="button" class="btn danger" data-action="delete-tx" data-id="${safe(t.id)}">طلب حذف الحركة</button>`,null,'إغلاق');
}
function donut(){const s=currentStats(),sum=summary(),parts=[['المحافظ المتاحة',state.wallets.filter(w=>w.kind==='spend').reduce((a,w)=>a+s.wallets[w.id],0),'#5d9a7b'],['الالتزامات المحجوزة',Object.values(s.reserved).reduce((a,n)=>a+n,0),'#c5ad7e'],['الادخار والطوارئ',state.wallets.filter(w=>w.kind!=='spend').reduce((a,w)=>a+s.wallets[w.id],0),'#9b8bb7'],['غير موزّع',s.unallocated,'#dce8e1']],total=parts.reduce((a,p)=>a+p[1],0);let at=0;const con=parts.map(p=>{let from=at;at+=total?p[1]/total*100:0;return `${p[2]} ${from}% ${at}%`}).join(',');const saving=total?Math.round(parts[2][1]/total*100):0;return `<div class="donut-content"><div class="donut" style="background:${total?`conic-gradient(${con})`:'#e9eeeb'}"><div class="donut-label"><strong class="num">${saving}%</strong><small>حصة الادخار</small></div></div><div class="legend">${parts.map(p=>`<div class="legend-row"><i style="background:${p[2]}"></i><span>${p[0]}</span><b class="num">${total?Math.round(p[1]/total*100):0}%</b></div>`).join('')}</div></div><div class="insight">${icon('bulb')}<span>${s.unallocated>0?'لديك '+fmt(s.unallocated)+' '+unit()+' غير موزّع. امنحه هدفاً في خطتك.':'كل مبلغ له غرض محدد. راجع خطتك مع تغيّر احتياجاتك.'}</span></div>`}
function schedulePanel(compact=false){const p=compact?today().slice(0,7):schedulePeriod,monthName=new Intl.DateTimeFormat('ar-IQ',{month:'long',year:'numeric'}).format(new Date(p+'-01T12:00:00'));const entries=S.month(state,p+'-01').filter(x=>wfIncomeMode(p)!=='salary-only'||x.id!=='incentives').map(x=>({...x,status:x.receiptIds.length?'received':today()<x.start?'upcoming':today()<=x.end?'due':'late'}));const labels={received:'تم الاستلام',upcoming:'منتظر',due:'ضمن موعد الاستلام',late:'لم يُؤكّد الاستلام'};return `<section class="panel schedule-panel ${compact?'compact':''}">${section('مواعيد الدخل الشهري',`${monthName} · المواعيد المتوقعة لا تُضاف إلى رصيدك.`,compact?'<a class="text-btn" href="#income">إدارة الدفعات '+icon('arrow')+'</a>':`<label class="month-control">الشهر<input id="scheduleMonth" type="month" value="${safe(p)}" aria-label="شهر مواعيد الدخل"></label>`)}<div class="scheduled-sources">${entries.length?entries.map(x=>`<article class="scheduled-source"><span class="schedule-icon">${icon(x.id==='salary'?'wallet':'income')}</span><div class="schedule-body"><div class="card-top"><h3>${safe(x.name)}</h3><span class="chip ${x.status==='late'?'amber':''}">${labels[x.status]}</span></div><p>من ${date(x.start)} إلى ${date(x.end)} من كل شهر</p><div class="schedule-bottom">${x.status==='received'?`<b class="income-color">${money(x.receivedAmount)}</b><span class="muted">مبلغ مستلم فعلياً</span>`:`<span class="muted">المبلغ يُدخل عند وصوله</span><div class="row"><button class="btn small soft" data-action="receipt" data-id="${safe(x.id)}" data-period="${safe(p)}">تأكيد الاستلام</button>${!compact?`<button class="text-btn" data-action="link-receipt" data-id="${safe(x.id)}" data-period="${safe(p)}">ربط دخل مسجّل</button>`:''}</div>`}</div></div></article>`).join(''):empty('أضف مواعيد دخلك','حدد أيام الاستلام من إعدادات مواعيد الدخل.')}</div>${!compact?'<p class="schedule-note">تدخل الحوافز والراتب في الخطة نفسها، مع استمرار المحافظ والالتزامات. إذا سجّلت دفعة سابقاً، استخدم «ربط دخل مسجّل» لتظهر هنا دون إضافة أموال مرة ثانية.</p>':''}</section>`}
function openIncomeSources(){modal('مواعيد الدخل الشهري','يمكنك إضافة مصادر متعددة وتخصيص نافذة وصول كل منها.',`<div id="incomeSourcesRows"></div><button class="btn soft small" id="addIncomeSource" type="button">${icon('plus')}إضافة مصدر</button><div class="notice">الجدول الحالي يبدأ بالحوافز 10–12 ثم الراتب 22–24. هذه مواعيد متوقعة؛ لا تُنشئ مالاً أو حركات تلقائية.</div>`,(f,form)=>act(s=>{const list=[...form.querySelectorAll('.income-source-row')].map(row=>({id:row.dataset.id,name:row.querySelector('[data-source-name]').value.trim(),fromDay:Number(row.querySelector('[data-source-from]').value),toDay:Number(row.querySelector('[data-source-to]').value)}));S.validateSources(list);s.settings.incomeSources=list;return s},'تم حفظ مواعيد الدخل'),'حفظ المواعيد');const add=(x={id:uid(),name:'',fromDay:1,toDay:1})=>{const row=document.createElement('div');row.className='income-source-row';row.dataset.id=x.id;row.innerHTML=`<div class="source-row-name">${field('اسم المصدر','sourceName','text',x.name,'data-source-name required maxlength="100"')}<button type="button" class="icon-btn" data-remove-source aria-label="إزالة المصدر">${icon('trash')}</button></div><div class="form-grid">${field('من يوم في الشهر','fromDay','number',x.fromDay,'data-source-from required min="1" max="31" step="1"')}${field('إلى يوم في الشهر','toDay','number',x.toDay,'data-source-to required min="1" max="31" step="1"')}</div>`;row.querySelectorAll('.field').forEach(f=>{const input=f.querySelector('input');if(input){input.id='source-'+x.id+'-'+input.name;f.querySelector('label').htmlFor=input.id}});row.querySelector('[data-remove-source]').onclick=()=>row.remove();$('incomeSourcesRows').append(row)};S.sources(state).forEach(add);$('addIncomeSource').onclick=()=>add()}
function openLinkReceipt(id,p){const source=S.sources(state).find(x=>x.id===id);if(!source)throw Error('مصدر الدخل غير موجود.');const eligible=state.transactions.filter(t=>t.type==='income'&&!t.sourceId&&t.date.slice(0,7)>=(p||schedulePeriod));modal('ربط دخل مسجّل',source.name,eligible.length?`<div class="form-grid"><div class="full">${select('حركة الدخل الموجودة','transactionId',eligible.map(t=>[t.id,`${date(t.date,true)} · ${fmt(t.amount)} ${unit()} · ${t.note||'دخل'}`]))}</div>${field('استحقاق أي شهر؟','incomePeriod','month',p||schedulePeriod,`required max="${today().slice(0,7)}"`)}</div><div class="notice">تُربط الحركة بهذا المصدر والشهر فقط؛ يبقى مبلغ الدخل ورصيد حساباتك كما هو.</div>`:empty('لا توجد حركة دخل متاحة للربط','ستظهر هنا حركات الدخل غير المرتبطة التي يعود تاريخها إلى هذا الشهر أو بعده.'),eligible.length?f=>act(s=>{const t=s.transactions.find(t=>t.id===f.transactionId),linked={...t,sourceId:id,sourceName:source.name,incomePeriod:f.incomePeriod};S.guardReceipt(s,linked);if(id==='incentives'&&wfIncomeMode(f.incomePeriod,s)==='salary-only')throw Error('هذا الشهر راتب فقط.');
 const mode=wfIncomeMode(f.incomePeriod,s);Object.assign(t,linked);
 s.settings.wfIncomeModes={...(s.settings.wfIncomeModes||{}),[f.incomePeriod]:mode};return s},'تم ربط الدخل السابق دون تغيير الأرصدة'):null,'ربط الحركة')}

function overviewIdentity(){return `<span class="neo-title-mark" role="img" aria-label="شعار الذُخر الذهبي المتحرك"><svg viewBox="0 0 160 145" xmlns="http://www.w3.org/2000/svg" focusable="false">   <defs>    <linearGradient id="mizan-scale-gold" x1="0" x2="1" y1="0" y2="1">     <stop offset="0" stop-color="#ab7935"/>     <stop offset=".35" stop-color="#ffe8ad"/>     <stop offset=".68" stop-color="#dbb36b"/>     <stop offset="1" stop-color="#9b6c2e"/>    </linearGradient>   </defs>   <ellipse cx="80" cy="136" rx="34" ry="4" fill="#f3c874" opacity=".20"/>   <path d="M80 43V124" fill="none" stroke="url(#mizan-scale-gold)" stroke-width="10" stroke-linecap="round"/>   <path d="M52 130H108" fill="none" stroke="url(#mizan-scale-gold)" stroke-width="8" stroke-linecap="round"/>   <g class="mizan-scales" fill="none" stroke="url(#mizan-scale-gold)" stroke-linecap="round" stroke-linejoin="round">    <path d="M38 58Q80 48 122 58" stroke-width="9"/>    <path d="M38 58L17 103M38 58L59 103M122 58L101 103M122 58L143 103" stroke-width="3"/>    <path d="M10 105Q38 134 66 105Z" fill="url(#mizan-scale-gold)" stroke="none"/>    <path d="M94 105Q122 134 150 105Z" fill="url(#mizan-scale-gold)" stroke="none"/>   </g>   <circle class="mizan-gold-point" cx="80" cy="30" r="12" fill="url(#mizan-scale-gold)"/>  </svg></span>`}
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
let wfMonth=today().slice(0,7);
const WF_FIELDS=[
 {key:'hyper',label:'الهايبر ماركت',stage:'incentives',reserveOnly:false},
 {key:'housing',label:'الإسكان',stage:'incentives',reserveOnly:false},
 {key:'workLoan',label:'سلفة الدوام (كامل القسط الشهري)',stage:'split',reserveOnly:false},
 {key:'internet',label:'الإنترنت',stage:'incentives',reserveOnly:true},
 {key:'generator',label:'المولّدة',stage:'salary',reserveOnly:true},
 {key:'bankLoan',label:'سلفة المصرف',stage:'salary',reserveOnly:true}
];
function monthlyFields(st=state){return Array.isArray(st.settings.wfFields)?st.settings.wfFields:WF_FIELDS;}
function monthlyHiddenFields(st=state){return Array.isArray(st.settings.wfHiddenFields)?st.settings.wfHiddenFields:[];}
function monthlyAllFields(st=state){return [...monthlyFields(st),...monthlyHiddenFields(st)];}
function monthlyFieldUsed(st,key){
 const w=wfData(st);
 return Object.values(w.plans||{}).some(p=>(p[key]||0)>0)||
 st.obligations.some(o=>o.id.startsWith('wf_'+key+'_'))||
 st.history.some(h=>JSON.stringify(h).includes('"wf_'+key+'_'));
}
function monthlyFieldStageLabel(f){
 return wfIncomeMode()==='salary-only'?'من الراتب':f.stage==='split'?'نصف من الحوافز ونصف من الراتب':f.stage==='incentives'?'الحوافز':'الراتب';
}
function monthlyFieldsManage(){
 const active=monthlyFields(),hidden=monthlyHiddenFields();
 const rows=active.map(o=>{
  const used=monthlyFieldUsed(state,o.key);
  return `<div class="wf-category-row"><div class="wf-category-info">
    <strong>${safe(o.label)}</strong>
    <small>${monthlyFieldStageLabel(o)}${o.reserveOnly&&o.stage==='incentives'?' · حجز فقط':''}
    ${used?' · مرتبط بمبالغ سابقة':''}</small></div>
    <button type="button" class="btn small secondary" data-action="wf-field-edit" data-id="${safe(o.key)}">تعديل</button>
    <button type="button" class="btn small ${used?'secondary':'danger'}" data-action="${used?'wf-field-hide':'wf-field-delete'}" data-id="${safe(o.key)}">${used?'إخفاء':'حذف'}</button>
   </div>`;
 }).join('');
 const hrows=hidden.map(o=>`<div class="wf-category-row wf-category-hidden-row">
   <div class="wf-category-info"><strong>${safe(o.label)}</strong>
   <small>${monthlyFieldStageLabel(o)} · مخفي، وتبقى مبالغه القديمة محفوظة</small></div>
   <button type="button" class="btn small secondary" data-action="wf-field-restore" data-id="${safe(o.key)}">إظهار</button></div>`).join('');
 modal('إدارة بنود مبالغ الشهر','حدد البنود بنفسك. تگدر تحذف حتى آخر بند غير مستخدم، أو تخفي البنود المرتبطة بمبالغ سابقة.',
 `<div class="wf-category-list">${rows||'<div class="wf-category-empty"><strong>لا توجد بنود شهرية</strong><p>أضف أول بند وحدّد هل يُحسب من الحوافز، أو الراتب، أو بالنصف بينهما.</p></div>'}</div>
  <button type="button" class="btn wf-category-add" data-action="wf-field-add">إضافة بند جديد</button>
  ${active.length?'<button type="button" class="btn small danger wf-category-clear" data-action="wf-fields-clear">إفراغ بنود الشهر</button>':''}
  ${hidden.length?`<section class="wf-category-hidden-section"><h3>بنود مخفية (${hidden.length})</h3>
    <div class="wf-category-list">${hrows}</div></section>`:''}
  <p class="wf-help">الإخفاء لا يلغّي أي مبلغ سبق اعتماده أو حجْزه. والمبالغ لا تُحجز أو تُسدّد بمجرد تحديدها.</p>`);
}
function monthlyFieldEdit(key=''){
 const old=key?monthlyFields().find(x=>x.key===key):null;
 if(key&&!old)throw Error('هذا البند غير موجود.');
 if(!old&&monthlyFields().length>=16)throw Error('الحد الأقصى 16 بنداً ظاهراً.');
 const isUsed=!!(old&&monthlyFieldUsed(state,key));
 const stageOptions=[['incentives','من الحوافز'],['salary','من الراتب'],['split','نصف من الحوافز ونصف من الراتب']];
 modal(old?'تعديل بند الشهر':'إضافة بند للشهر',
 'يتكرر هذا البند في الأشهر القادمة، وتحدد مبلغ كل شهر لوحده.',
 `<div class="form-grid">
   ${field('اسم البند','fieldName','text',old?.label||'','required maxlength="45" placeholder="مثلاً إيجار أو قسط سيارة"')}
   ${isUsed?`<div class="field"><label>مرحلة البند</label><p class="wf-help">${monthlyFieldStageLabel(old)} (ثابتة لأن للبند مبالغ سابقة)</p></div>`:
     select('وقت اقتطاع المبلغ','fieldStage',stageOptions,old?.stage||(wfIncomeMode()==='salary-only'?'salary':'incentives'))}
   ${isUsed?'':select('آلية الاستقطاع','fieldReserve',[['normal','يمكن الحجز أو السداد أو الاستقطاع قبل الإيداع'],['reserve','حجز فقط'] ],old?.reserveOnly?'reserve':'normal')}
  </div>
  <p class="wf-help">إذا اخترت «النصفين»، أدخل المبلغ الشهري كاملاً، ويقسمه البرنامج بين الدفعتين تلقائياً.</p>`,
 f=>{
  const name=String(f.fieldName||'').trim().replace(/\s+/g,' ');
  if(name.length<2||name.length>45||/[<>]/.test(name))throw Error('اسم البند يجب أن يكون من حرفين إلى 45 حرفاً.');
  if(monthlyAllFields().some(o=>o.key!==key&&o.label.toLowerCase()===name.toLowerCase()))
   throw Error('يوجد بند بنفس الاسم، بما في ذلك البنود المخفية.');
  if(!isUsed&&!['salary','incentives','split'].includes(f.fieldStage))
   throw Error('اختر دفعة صحيحة.');
  if(!isUsed&&!['normal','reserve'].includes(f.fieldReserve))throw Error('اختر آلية الحوافز.');
  act(n=>{
   const items=monthlyFields(n).map(o=>({...o}));
   if(old){
    const cur=items.find(o=>o.key===key);
    if(!cur)throw Error('البند غير موجود.');
    cur.label=name;
    if(!monthlyFieldUsed(n,key)){
      cur.stage=f.fieldStage;cur.reserveOnly=f.fieldStage==='salary'||f.fieldReserve==='reserve';
    }
   }else{
    if(items.length>=16)throw Error('وصلت الحد الأقصى للبنود.');
    const id='item_'+uid().replace(/[^A-Za-z0-9_-]/g,'').slice(0,30);
    if(monthlyAllFields(n).some(o=>o.key===id))throw Error('تعذر توليد معرف البند. حاول مرة أخرى.');
    items.push({key:id,label:name,stage:f.fieldStage,
     reserveOnly:f.fieldStage==='salary'||f.fieldReserve==='reserve'});
   }
   n.settings.wfFields=items;
   return n;
  },old?'تم تعديل البند الشهري':'تمت إضافة البند. حدد مبلغه من «تحديد مبالغ الشهر»');
 },old?'حفظ التعديل':'إضافة البند');
}
function monthlyFieldHide(key){
 const item=monthlyFields().find(o=>o.key===key);
 if(!item)throw Error('البند غير موجود.');
 confirmModal('إخفاء البند؟','سيختفي «'+item.label+'» من بنود الأشهر الجديدة، لكن أي مبالغ محددة للأشهر السابقة أو الحالية تبقى محفوظة حتى تُحسم.',
 ()=>{
  act(n=>{
   const item=monthlyFields(n).find(o=>o.key===key);if(!item)throw Error('البند غير موجود.');
   n.settings.wfFields=monthlyFields(n).filter(o=>o.key!==key).map(o=>({...o}));
   n.settings.wfHiddenFields=[...monthlyHiddenFields(n).map(o=>({...o})),{...item}];
   return n;
  },'تم إخفاء البند مع الحفاظ على مبالغه السابقة');
 },'إخفاء البند');
}
function monthlyFieldRestore(key){
 const item=monthlyHiddenFields().find(o=>o.key===key);
 if(!item)throw Error('البند غير موجود ضمن البنود المخفية.');
 if(monthlyFields().length>=16)throw Error('لا يمكن إظهار أكثر من 16 بنداً.');
 if(monthlyFields().some(o=>o.label.toLowerCase()===item.label.toLowerCase()))
  throw Error('يوجد بند ظاهر بنفس الاسم. غيّر اسمه أولاً.');
 act(n=>{
  const h=monthlyHiddenFields(n).find(o=>o.key===key);if(!h)throw Error('البند غير موجود.');
  n.settings.wfHiddenFields=monthlyHiddenFields(n).filter(o=>o.key!==key).map(o=>({...o}));
  n.settings.wfFields=[...monthlyFields(n).map(o=>({...o})),{...h}];
  return n;
 },'تم إظهار البند مرة أخرى');
}
function monthlyFieldDelete(key){
 const item=monthlyFields().find(o=>o.key===key);
 if(!item)throw Error('البند غير موجود.');
 if(monthlyFieldUsed(state,key))throw Error('البند مرتبط بمبالغ أو حركات سابقة؛ استخدم «إخفاء».');
 confirmModal('حذف بند غير مستخدم؟','سيُحذف «'+item.label+'» من تحديد مبالغ الشهر، حتى لو كان آخر بند متبقٍ.',
 ()=>{
  act(n=>{
   if(monthlyFieldUsed(n,key))throw Error('البند مستخدم الآن، أخفِه بدلاً من حذفه.');
   n.settings.wfFields=monthlyFields(n).filter(o=>o.key!==key).map(o=>({...o}));
   const w=wfData(n);
   const plans=Object.fromEntries(Object.entries(w.plans||{}).map(([m,p])=>{
    const copy={...p};delete copy[key];return [m,copy];
   }));
   n.settings.twoStageWorkflow={...w,plans};
   return n;
  },'تم حذف البند غير المستخدم');
 },'نعم، احذف البند');
}
function monthlyFieldsClear(){
 const all=monthlyFields();if(!all.length)throw Error('قائمة مبالغ الشهر فارغة أصلاً.');
 const used=all.filter(o=>monthlyFieldUsed(state,o.key)).length;
 confirmModal('إفراغ بنود الشهر؟',
  'ستصير القائمة فارغة: البنود المرتبطة بمبالغ سابقة ('+used+') راح تنخفي بدون إلغاء حجز أو دين أو مبلغ محدد، والباقي يُحذف. أرصدة حسابك ما تتغير.',
 ()=>{
  act(n=>{
   const list=monthlyFields(n),keep=[],remove=new Set();
   for(const o of list){if(monthlyFieldUsed(n,o.key))keep.push({...o});else remove.add(o.key);}
   n.settings.wfFields=[];
   n.settings.wfHiddenFields=[...monthlyHiddenFields(n).map(o=>({...o})),...keep];
   const wf=wfData(n);
   const plans=Object.fromEntries(Object.entries(wf.plans||{}).map(([m,p])=>{
    const copy={...p};for(const k of remove)delete copy[k];return[m,copy];
   }));
   n.settings.twoStageWorkflow={...wf,plans};
   return n;
  },'صارت قائمة البنود فارغة. أضف البنود التي تحتاجها.');
 },'نعم، أفرغ البنود');
}
const wfEmpty=()=>Object.fromEntries(monthlyFields().map(o=>[o.key,0]));
function wfData(st=state){const d=st.settings.twoStageWorkflow;return d&&typeof d==='object'?d:{plans:{},completed:{}}}
function wfPlan(month=wfMonth){return wfData().plans?.[month]||null}
function wfDone(stage,month=wfMonth){return wfData().completed?.[month]?.[stage]||null}
function wfIncomeMode(month=wfMonth,st=state){
 const mode=st.settings.wfIncomeModes?.[month];
 if(mode==='salary-only'||mode==='both')return mode;
 const active=st.settings.wfDefaultIncomeMode;
 const since=st.settings.wfIncomeModeSince;
 if((active==='salary-only'||active==='both')&&since&&month>=since)return active;
 const wf=wfData(st);
 const historical=Object.prototype.hasOwnProperty.call(wf.plans||{},month)||
  Object.prototype.hasOwnProperty.call(wf.completed||{},month)||
  st.transactions.some(t=>t.type==='income'&&t.incomePeriod===month&&['salary','incentives'].includes(t.sourceId));
 return historical?'both':active==='salary-only'?'salary-only':'both';
}
function wfFreezeIncomeMode(st,month){
 st.settings.wfIncomeModes={...(st.settings.wfIncomeModes||{}),[month]:wfIncomeMode(month,st)};
 return st;
}
function wfIncomeModePicker(){
 if(state.settings.closedMonths?.[wfMonth])throw Error('هذا الشهر مغلق مالياً.');
 if(state.demo)throw Error('ابدأ خطتك الفعلية أولاً.');
 modal('نوع الدخل الشهري','حدد طريقة الاستلام لهذا الشهر والأشهر القادمة، دون تغيير السجلات السابقة.',
  `<div class="form-grid">${select('نوع الاستلام','incomeMode',[['both','راتب وحوافز'],['salary-only','راتب فقط (بدون حوافز)']],wfIncomeMode())}</div>
   <div class="notice">عند اختيار «راتب فقط» تُحسب جميع بنود الشهر من الراتب، ولا تُنشأ حوافز وهمية أو عمليات مالية تلقائياً. لا يمكن تغيير شهر تم اعتماد استقطاعاته.</div>`,
  f=>act(st=>{
   if(!['both','salary-only'].includes(f.incomeMode))throw Error('نوع الدخل غير صالح.');
   const wf=wfData(st);
   if(wf.completed?.[wfMonth]?.incentives||wf.completed?.[wfMonth]?.salary)
    throw Error('تم اعتماد استقطاعات هذا الشهر سابقاً؛ لا يمكن تغيير نوع دخله.');
   if(f.incomeMode==='salary-only'&&S.receipts(st,'incentives',wfMonth).length)
    throw Error('تم تسجيل حوافز لهذا الشهر؛ لا يمكن جعله راتباً فقط.');
   const months=new Set([...Object.keys(wf.plans||{}),...Object.keys(wf.completed||{}),
    ...st.transactions.filter(t=>t.type==='income'&&t.incomePeriod).map(t=>t.incomePeriod)]);
   const frozen={...(st.settings.wfIncomeModes||{})};
   for(const m of months)if(!Object.prototype.hasOwnProperty.call(frozen,m))frozen[m]=wfIncomeMode(m,st);
   st.settings.wfIncomeModes={...frozen,[wfMonth]:f.incomeMode};
   st.settings.wfDefaultIncomeMode=f.incomeMode;
   st.settings.wfIncomeModeSince=wfMonth;
   return st;
  },'تم حفظ نوع الدخل دون تعديل الحركات أو الأرصدة'),'حفظ نوع الدخل');
}
function wfReceive(stage){
 if(state.demo)throw Error('أنهِ الخطة التوضيحية أولاً بزر «بدء خطتي الفعلية».');
 if(stage==='incentives'&&wfIncomeMode()==='salary-only')throw Error('هذه الخطة تعتمد الراتب فقط.');
 if(stage==='salary'&&wfIncomeMode()==='both'&&!S.receipts(state,'incentives',wfMonth).length)
  throw Error('إذا ما تستلم حوافز، اختر «راتب فقط» من نوع الدخل؛ بخطة الدفعتين سجّل الحوافز أولاً.');
 if(S.receipts(state,stage,wfMonth).length)throw Error('هذا الدخل مسجّل لهذا الشهر. لا تُضفه مرة أخرى.');
 openIncome(stage,wfMonth);
}
function wfActivate(){
 if(!state.demo)return;
 confirmModal('بدء خطتك الفعلية؟','البيانات الحالية مثال توضيحي، وليست دخلك الحقيقي. ستبدأ بسجل مالي جديد وفارغ. إذا تريد الاحتفاظ بالمثال، نزّل نسخة احتياطية قبل التأكيد.',
 ()=>{
  try{
   const n=E.initial();
   n.settings={...n.settings,...state.settings,name:state.settings.name||''};
   n.demo=false;n.cycle.start=today();n.cycle.days=31;
   delete n.settings.twoStageWorkflow;
   save(n,'بدأت خطة الحوافز والراتب بدون حجز أو استقطاع',true);
   location.hash='workflow';
  }catch(e){showError(e.message)}
 },'أوافق وأبدأ بدون رصيد');
}
function wfConfig(){
 if(state.settings.closedMonths?.[wfMonth])throw Error('هذا الشهر مغلق مالياً، لا يمكن تغيير مبالغ خطته.');
 if(wfMonth<today().slice(0,7))throw Error('لا يمكن إعادة تمويل شهر سابق من متاح الشهر الحالي.');
 if(state.demo)throw Error('ابدأ خطتك الفعلية أولاً.');
 if(wfDone('incentives')||wfDone('salary'))throw Error('لا يمكن تعديل مبالغ شهر تم تنفيذ إحدى دفعاته. البنود قابلة للإدارة للمستقبل دون تغيير الحركات الماضية.');
 const selected=monthlyFields();if(!selected.length)throw Error('قائمة البنود فارغة. اضغط «إدارة البنود» لإضافة أول بند.');
 const current=wfPlan()||{};
 const inputs=selected.map(o=>`<div class="wf-budget-field">
 ${moneyField(o.label,'monthly-'+o.key,inputMoney(current[o.key]||0),'required',ccy().dec)}
 <small>${monthlyFieldStageLabel(o)}${o.stage==='split'?' · أدخل المبلغ كاملاً':''}</small></div>`).join('');
 const hiddenWithValues=monthlyHiddenFields().filter(o=>(current[o.key]||0)>0);
 modal('تحديد مبالغ الشهر · '+wfMonth,
 'حدد مبلغ كل بند من البنود التي اخترتها. الحفظ لا يحجز أموالاً ولا يسدد شيئاً.',
 `<div class="wf-form-grid">${inputs}</div>
  ${hiddenWithValues.length?`<div class="notice warn">يوجد ${hiddenWithValues.length} بند مخفي له مبالغ محددة في هذه الدورة. تبقى مبالغه دون تغيير. أظهِره من إدارة البنود إذا تحتاج تعديله.</div>`:''}
  <div class="notice">${wfIncomeMode()==='salary-only'?'جميع بنود الشهر تُغطّى من الراتب كاملاً.':'البند المقسّم بين الدفعتين يُدخل كاملاً.'} الصفر يعني عدم وجود مبلغ مستحق.</div>`,
 form=>act(n=>{
  const values={...(wfData(n).plans?.[wfMonth]||{})};
  for(const o of monthlyFields(n))values[o.key]=amount(form['monthly-'+o.key],true);
  const w=wfData(n);
  n.settings.twoStageWorkflow={...w,plans:{...w.plans,[wfMonth]:values},completed:{...w.completed}};
  return wfFreezeIncomeMode(n,wfMonth);
 },'تم حفظ مبالغ الشهر دون حجز أو خصم'),'حفظ مبالغ الشهر');
}
function wfObId(month,key){return 'wf_'+key+'_'+month.replace('-','_')}
function wfAmount(plan,stage){
 const rows=[];
 if(wfIncomeMode()==='salary-only'){
  if(stage!=='salary')return rows;
  for(const item of monthlyAllFields()){
   const full=plan[item.key]||0,hidden=monthlyHiddenFields().some(x=>x.key===item.key);
   if(hidden&&!full)continue;
   rows.push({key:item.key,amount:full,label:item.label+(hidden?' (مخفي)':''),fullAmount:full,
    reserveOnly:!!item.reserveOnly,hidden});
  }
  return rows;
 }
 for(const o of monthlyAllFields()){
  const amountFull=plan[o.key]||0;
  const which=o.stage||(['generator','bankLoan'].includes(o.key)?'salary':o.key==='workLoan'?'split':'incentives');
  const hidden=monthlyHiddenFields().some(h=>h.key===o.key);
  if(hidden&&!amountFull)continue;
  if(which==='split'){
   const half=Math.floor(amountFull/2),remaining=amountFull-half;
   rows.push({key:o.key,amount:stage==='incentives'?half:remaining,
     label:(stage==='incentives'?'نصف ':'النصف المتبقي من ')+o.label+(hidden?' (مخفي)':''),
     fullAmount:amountFull,reserveOnly:!!o.reserveOnly,hidden});
  }else if(which===stage){
   rows.push({key:o.key,amount:amountFull,label:o.label+(hidden?' (مخفي)':''),
     fullAmount:amountFull,reserveOnly:!!o.reserveOnly,hidden});
  }
 }
 return rows;
}
function wfStageSummary(stage){
 const plan=wfPlan(),done=wfDone(stage),rec=S.receipts(state,stage,wfMonth),
  first=stage==='incentives',label=first?'الحوافز الشهرية':'الراتب الشهري';
 const steps=plan?wfAmount(plan,stage):[],total=steps.reduce((a,x)=>a+x.amount,0),eligible=state.transactions.some(t=>t.type==='income'&&!t.sourceId&&t.date.slice(0,7)>=wfMonth);
 const salaryOnly=wfIncomeMode()==='salary-only';
 if(first&&salaryOnly)return '';
 const title=salaryOnly?'1 · استلام الراتب واستقطاعاته':first?'1 · استلام الحوافز ثم استقطاعاتها':'2 · استلام الراتب ثم الحجوزات المتبقية';
 return `<section class="wf-stage">
  <div class="wf-stage-top"><div><span class="wf-kicker">${salaryOnly?'الدخل الشهري':first?'الدفعة الأولى':'الدفعة الثانية'}</span><h2>${title}</h2></div>
  <span class="chip ${done?'':'amber'}">${done?'تم تنفيذ المرحلة':rec.length?'تم الاستلام · بانتظار التخصيص':'لم تُستلم'}</span></div>
  <div class="wf-receipt">
    <span>${label}</span><strong>${rec.length?money(rec.reduce((a,t)=>a+t.amount,0)):'لم يُسجّل الاستلام بعد'}</strong>
    ${!rec.length?btn(first?'wf-incentives-receipt':'wf-salary-receipt','تأكيد الاستلام','income','secondary'):''}${!rec.length&&eligible?btn(first?'wf-incentives-link':'wf-salary-link','ربط دخل مسجّل سابقاً','check','secondary'):''}
  </div>
  <div class="wf-steps">${steps.map(item=>`<div class="wf-step"><span>${safe(item.label)}</span><b>${money(item.amount)}</b></div>`).join('')||'<p>حدّد مبالغ الالتزامات أولاً.</p>'}</div>
  ${plan?`<div class="wf-stage-footer"><span>إجمالي مبالغ هذه المرحلة</span><strong>${money(total)}</strong></div>`:''}
  ${first?'<p class="wf-help">بنود الحوافز القابلة للسداد يمكن حجزها أو دفعها أو توثيق استقطاعها قبل الإيداع. أما بنود «الحجز فقط» فلا تُسدد تلقائياً.</p>':
    '<p class="wf-help">بنود الراتب تُحجز بعد الاستلام، ولا تُحتسب مدفوعة إلا بعد السداد الفعلي.</p>'}
  ${done?`<div class="wf-done">${icon('check')} ${done.mode==='withheld'?'استقطاعات الحوافز قبل الإيداع موثقة دون خصم مكرر':'تم تنفيذ التخصيص بعد موافقتك'}</div>`:
    (plan&&rec.length&&(!first?(salaryOnly||!!wfDone('incentives')):true)
     ?btn(first?'wf-incentives-apply':'wf-salary-apply',total?first?'مراجعة الاستقطاعات والحجز':'مراجعة حجوزات الراتب':'تأكيد عدم وجود استقطاعات','check')
     :'')}
 </section>`;
}
function workflowPage(){
 const plan=wfPlan(),stats=currentStats(),salaryOnly=wfIncomeMode()==='salary-only';
 const splitFields=monthlyAllFields().filter(o=>o.stage==='split'&&plan&&(plan[o.key]||0)>0);
 const wfIds=plan?monthlyAllFields().map(o=>({key:o.key,id:wfObId(wfMonth,o.key),label:o.label})):[],
  settled=wfIds.filter(o=>(stats.reserved[o.id]||0)>0);
 return head('خطة الدخل الشهرية',salaryOnly?'استلام الراتب وتوزيع الالتزامات بخطوات واضحة.':'تابع استلام الحوافز والراتب وتخصيص الالتزامات.',
   state.demo?btn('wf-activate','بدء خطتي الفعلية','check'):( (monthlyFields().length?btn('wf-config','تحديد مبالغ الشهر','wallet','secondary'):'')+btn('wf-fields-manage',monthlyFields().length?'إدارة البنود':'إضافة بنود الشهر','settings',monthlyFields().length?'secondary':'') ))+thukhrFamilyWelcome()+
 `<section class="wf-intro">
  <div class="wf-month"><label for="wfMonth">شهر الخطة</label><input id="wfMonth" type="month" value="${wfMonth}" max="${today().slice(0,7)}"><span class="thukhr-readable-month">${arabicMonth(wfMonth)}</span></div>
  <div class="wf-income-mode-controls"><span>نوع الدخل: <b>${salaryOnly?'راتب فقط':'راتب وحوافز'}</b></span>
   ${state.demo?'':btn('wf-income-mode','تغيير نوع الدخل','settings','secondary')}</div>
  <div class="wf-snapshot">
   <div><span>رصيد الحساب</span><strong>${money(stats.total)}</strong></div>
   <div><span>المتاح بعد الحجز والتخصيص</span><strong>${money(stats.unallocated)}</strong></div>
   <div><span>محجوز حالياً</span><strong>${money(Object.values(stats.reserved).reduce((a,n)=>a+n,0))}</strong></div>
  </div>
 </section>
 ${state.demo?'<div class="notice warn">هذا سجل تجريبي. اضغط «بدء خطتي الفعلية» لتسجيل استلام الحوافز والراتب الحقيقيين. لا تُجرى أي حركة تلقائياً.</div>':''}
 ${!plan?'<div class="notice">ابدأ من «إدارة البنود» حتى تختار بنود الشهر، ثم افتح «تحديد مبالغ الشهر» لإدخال المبالغ. لا يُحجز أو يُدفع أي مبلغ إلا بعد تأكيدك.</div>':
  salaryOnly?'':splitFields.map(o=>{const half=Math.floor(plan[o.key]/2);return `<div class="wf-parts"><span>${safe(o.label)} · المبلغ الكامل <b>${money(plan[o.key])}</b></span><span>من الحوافز <b>${money(half)}</b></span><span>من الراتب <b>${money(plan[o.key]-half)}</b></span></div>`;}).join('')}
 ${wfStageSummary('incentives')}
 ${wfStageSummary('salary')}
 <div class="wf-living-shortcut"><span>بعد حجز الالتزامات، افتح صفحة المعيشة المستقلة وقسّم الرصيد المتبقي على أقسام المعيشة التي تختارها.</span><button type="button" class="btn" data-action="wf-living-scroll">الانتقال إلى مصاريف المعيشة</button></div>
 ${Object.values(stats.wallets).some(v=>v>0)?'<div class="notice">إذا كانت عندك مبالغ موزعة سابقاً على محافظ قديمة، فهي لا تُحجز مرة ثانية. تكدر ترجع جزء منها إلى المتاح بعد موافقتك. <button type="button" class="btn small secondary" data-action="wf-release">إرجاع مبلغ من محفظة قديمة</button></div>':''}
 ${settled.length?`<section class="wf-stage"><h2>التزامات بانتظار الدفع</h2><p class="wf-help">الحجز غير السداد. اضغط «سداد» فقط عند خروج المبلغ من البطاقة أو النقد فعلياً.</p>${settled.map(o=>`<div class="wf-step"><span>${safe(o.label)} · محجوز ${money(stats.reserved[o.id])}</span><button class="btn small secondary" data-action="wf-pay" data-id="${o.id}">سداد</button></div>`).join('')}</section>`:''}
 <div class="notice">الأرقام تنحفظ على جهازك داخل نفس السجل المالي السابق. سجل الحركات والنسخ الاحتياطية باقية. الدخل لا يُسجَّل إلا عند استلامه، والالتزامات لا تتحول إلى حجز أو سداد إلا بقرار منك.</div>`;
}
function wfApply(stage){
 if(state.demo)throw Error('ابدأ الخطة الفعلية أولاً.');
 const plan=wfPlan(),completed=wfDone(stage);
 if(!plan)throw Error('حدّد مبالغ الشهر أولاً.');
 if(completed)throw Error('هذه المرحلة منجزة مسبقاً.');
 if(state.settings.closedMonths?.[wfMonth])throw Error('الشهر مغلق مالياً.');
 if(stage==='incentives'&&wfIncomeMode()==='salary-only')throw Error('لا توجد مرحلة حوافز في هذه الخطة.');
 if(!S.receipts(state,stage,wfMonth).length)throw Error('يجب تأكيد الاستلام أولاً.');
 if(stage==='salary'&&wfIncomeMode()==='both'&&!wfDone('incentives'))
  throw Error('أكمل مرحلة الحوافز أولاً.');
 const ops=wfAmount(plan,stage).filter(x=>x.amount>0);
 const rows=ops.map(o=>`<div class="wf-step thukhr-settlement-row">
  <div><strong>${safe(o.label)}</strong><b>${money(o.amount)}</b></div>
  ${select('حالة الاستقطاع','settle-'+o.key,[
    ['reserve','محجوز للسداد لاحقاً'],
    ['withheld','مستقطع قبل وصول المبلغ الصافي'],
    ['pay','مدفوع فعلياً بعد الاستلام']], 'reserve')}
  </div>`).join('');
 modal('تسوية استقطاعات '+(stage==='salary'?'الراتب':'الحوافز'),
  'حدّد حالة كل بند على حدة. لا يُخصم الاستقطاع السابق للإيداع من الرصيد الصافي.',
  `<div class="wf-steps">${rows||'<div class="notice">لا توجد استقطاعات لهذه الدفعة.</div>'}</div>
  ${select('طريقة دفع البنود المدفوعة فعلياً','method',methodOptions)}
  <div class="notice">المستقطع من المصدر يُوثّق كتسوية غير نقدية؛ المدفوع فعلياً يخفض البطاقة أو النقد؛ والمحجوز يقلل المتاح فقط.</div>
  <div class="field"><label><input type="checkbox" name="approve" value="yes" required> أراجع حالات كل بند وأوافق على تنفيذها مرة واحدة</label></div>`,
  f=>{
   if(f.approve!=='yes')throw Error('الموافقة إلزامية.');
   const choices=ops.map(o=>({o,mode:f['settle-'+o.key]}));
   if(choices.some(x=>!['reserve','withheld','pay'].includes(x.mode)))throw Error('اختر حالة صحيحة لكل بند.');
   act(n=>{
    if(n.settings.closedMonths?.[wfMonth])throw Error('الشهر مغلق مالياً.');
    if(wfData(n).completed?.[wfMonth]?.[stage])throw Error('تم تنفيذ هذه الدفعة مسبقاً.');
    let next=n,summary={reserved:0,withheld:0,paid:0},decisions={};
    for(const {o,mode} of choices){
     const id=wfObId(wfMonth,o.key);
     if(!next.obligations.some(q=>q.id===id))
      next.obligations.push({id,name:o.key==='workLoan'?'سلفة الدوام':o.label.replace(' (مخفي)',''),
       amount:o.fullAmount,due:today(),recurring:false});
     else if(next.obligations.find(q=>q.id===id).amount!==o.fullAmount)
      throw Error('تغيّر مبلغ الالتزام المسجل. راجع السجل أولاً.');
     const note='شهر '+wfMonth+' · '+o.label;
     if(mode==='withheld'){
      next=event(next,{type:'withheld',date:today(),obligationId:id,amount:o.amount,note:'استقطاع قبل إيداع الصافي · '+note});
      summary.withheld+=o.amount;
     }else{
      next=event(next,{type:'reserve',date:today(),obligationId:id,amount:o.amount,note:'حجز · '+note});
      if(mode==='pay'){
       next=event(next,{type:'pay',date:today(),obligationId:id,amount:o.amount,method:f.method,note:'سداد بعد الاستلام · '+note});
       summary.paid+=o.amount;
      }else summary.reserved+=o.amount;
     }
     decisions[o.key]=mode;
    }
    const current=wfData(next);
    next.settings.twoStageWorkflow={...current,plans:{...current.plans},
     completed:{...current.completed,[wfMonth]:{...current.completed?.[wfMonth],
      [stage]:{mode:'itemized',at:today(),total:ops.reduce((n,o)=>n+o.amount,0),summary,decisions}}}};
    return next;
   },'تمت تسوية الاستقطاعات وتوثيق حالة كل بند');
  },'اعتماد التسوية');
}

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
   <div class="wf-category-info"><strong>${safe(c.label)}</strong><small>مخفي من المعيشة · بياناته ورصيده محفوظان</small></div>
   <button type="button" class="btn small secondary" data-action="wf-category-restore" data-id="${safe(c.id)}">إظهار</button>
   </div>`).join('');
 modal('إدارة أقسام المعيشة','تگدر تحذف حتى آخر قسم غير مستخدم، أو تخفي القسم المرتبط ببيانات وتسترجعه لاحقاً.',
 `<div class="wf-category-list">
  ${activeRows||'<div class="wf-category-empty"><strong>ما عندك أقسام معيشة حالياً</strong><p>أضف القسم الذي تحتاجه من الزر أدناه، ولا توجد أقسام إجبارية.</p></div>'}
 </div><button type="button" class="btn wf-category-add" data-action="wf-category-add">إضافة قسم جديد</button>
 ${categories.length?'<button type="button" class="btn small danger wf-category-clear" data-action="wf-category-clear">إفراغ أقسام المعيشة</button>':''}
 ${hidden.length?`<div class="wf-category-hidden-section"><h3>أقسام مخفية (${hidden.length})</h3>
 <p class="wf-help">تبقى ضمن السجل والأرصدة السابقة. تگدر ترجع أي قسم بزر «إظهار».</p>
 <div class="wf-category-list">${hiddenRows}</div></div>`:''}
 <p class="wf-help">حذف القسم غير المستخدم لا يحذف أي حركة مالية. الإخفاء يحافظ على الرصيد والحركات وميزانيات الشهور السابقة.</p>`);
}
function livingCategoryEdit(id=''){
 const old=id?livingCategories().find(x=>x.id===id):null;
 if(id&&!old)throw Error('هذا القسم غير موجود.');
 if(!old&&livingCategories().length>=12)throw Error('لا يمكن إضافة أكثر من 12 قسماً.');
 modal(old?'تعديل اسم القسم':'إضافة قسم جديد','يظهر القسم فوراً في المعيشة والصرف المباشر والميزانية وPDF.',
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
 confirmModal('إخفاء قسم المعيشة؟','سيختفي قسم «'+selected.label+'» من المعيشة والصرف الجديد، لكن رصيده وحركاته السابقة تبقى محفوظة ويمكن إظهاره لاحقاً.',
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
 if(!cats.length)throw Error('واجهة المعيشة فارغة أصلاً. تگدر تضيف أول قسم.');
 const used=cats.filter(c=>livingCategoryIsUsed(state,c.id)||(currentStats().wallets[c.id]||0)>0);
 const unused=cats.length-used.length;
 confirmModal('إفراغ أقسام المعيشة؟',
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
   },'صارت قائمة المعيشة فارغة. أضف الأقسام التي تحتاجها.');
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
    <div><span class="wf-kicker">القسم الأول</span><h2>المعيشة من الحوافز</h2></div>
    <span class="chip ${incentive?'':'amber'}">${incentive?'تم تسجيل الاستلام':'لم تسجل الحوافز'}</span>
    <div class="wf-phase-amounts"><span>مخصص أثناء الحوافز <b>${money(first.allocated)}</b></span><span>مصروف قبل الراتب <b>${money(first.spent)}</b></span></div>
   </article>
   <article class="wf-phase">
    <div><span class="wf-kicker">${wfIncomeMode()==='salary-only'?'الدخل الشهري':'القسم الثاني'}</span><h2>المعيشة من الراتب</h2></div>
    <span class="chip ${salary?'':'amber'}">${salary?'تم تسجيل الاستلام':'بانتظار الراتب'}</span>
    <div class="wf-phase-amounts"><span>مخصص بعد الراتب <b>${money(second.allocated)}</b></span><span>مصروف بعد الراتب <b>${money(second.spent)}</b></span></div>
   </article>
 </div>`;
 return head('مصاريف المعيشة',wfIncomeMode()==='salary-only'?'ميزانية شهرية من الراتب فقط؛ المصروف السابق محسوب تلقائياً.':'من الحوافز أولاً، ثم الراتب. ميزانية واحدة لكل شهر؛ المصروف السابق محسوب تلقائياً.')+thukhrFamilyGoals()+
  `<div class="wf-living-page-summary">
     <div><span>المتاح للمعيشة</span><strong>${money(stats.unallocated)}</strong></div>
     <p>الأموال الواردة باسم «أخرى» تزيد هذا المتبقي عند استلامها فعلياً. التخصيص لا يخصم من البطاقة؛ السداد أو الشراء الفعلي فقط هو الذي ينقص الرصيد النقدي.</p>
     <div class="wf-other-line"><span>الوارد باسم «أخرى» خلال ${wfMonth}</span><b>${money(extra)}</b></div>
     <div class="wf-living-top-actions">
       ${livingCategories().length?btn('wf-living-direct','إضافة مصروف','wallet'):''}
       ${btn('wf-living-extra','أخرى','income','secondary')}
       ${btn('wf-category-manage','تحديد الأقسام','settings','secondary')}${btn('emergency-open','خزنة الطوارئ','shield','secondary')}
       ${btn('wf-living-pdf','تنزيل PDF','download','secondary')}
     </div>
   </div>`+sections+wfLivingPanel();
}
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
  return `<div class="keyval"><span>${safe(o.name)} · ${safe(o.due)}</span>
  <b>${money(o.amount)} <small>مدفوع ${fmt(pay)} · مستقطع ${fmt(withheld)} · محجوز ${fmt(held)} · غير مغطى ${fmt(Math.max(0,o.amount-pay-withheld-held))}</small></b></div>`;
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

function wfLivingPanel(){
 const stats=currentStats(),targets=livingTargets(),covered=livingNeeds(targets);
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
   <h2>أقسام مصاريف المعيشة</h2></div><span class="chip">${livingCategories().length} قسم</span></div>
  <div class="wf-living-overview">
   <div><span>المتاح للتوزيع</span><strong>${money(stats.unallocated)}</strong></div>
   <div><span>الموزّع على الأقسام</span><strong>${money(livingAllCategories().reduce((n,w)=>n+(stats.wallets[w.id]||0),0))}</strong></div>
  </div>
  ${!wfDone('salary')?'<div class="notice warn">الراتب أو بعض حجوزاته لم يُعتمد بعد. احتفظ بما يلزم للالتزامات القادمة.</div>':''}
  <div class="wf-living-grid">${cards||`<div class="wf-category-empty"><strong>لا توجد أقسام معيشة حالياً</strong><p>اضغط «تحديد الأقسام» ثم «إضافة قسم جديد» حتى تبدأ بطريقتك.</p>${btn('wf-category-add','إضافة أول قسم','plus')}</div>`}</div>
  <div class="wf-living-actions">
   ${livingCategories().length?btn('wf-living-allocate','تحديد ميزانية المعيشة للشهر','wallet'):''}
   ${btn('wf-category-manage','تحديد أقسام المعيشة','settings','secondary')}
   ${btn('wf-release','إرجاع مبلغ إلى المتاح','wallet','secondary')}
  </div>
  <p class="wf-help">تكتب الميزانية الإجمالية للشهر، وليس المبلغ الجديد فقط. يحسب ذُخر ما صُرف مسبقاً وما بقي داخل كل محفظة، ثم يخصص الفرق إن توفر المال. تكرار الحفظ لا يكرر التخصيص.</p>
 </section>`;
}
function wfLivingAllocate(){
 if(state.settings.closedMonths?.[wfMonth])throw Error('الشهر مغلق مالياً.');
 if(wfMonth<today().slice(0,7))throw Error('لا يجوز تمويل ميزانية شهر سابق من الرصيد الحالي.');
 if(state.demo)throw Error('ابدأ الخطة الفعلية أولاً.');
 if(!livingCategories().length)throw Error('أضف قسماً للمعيشة أولاً قبل تحديد الميزانية.');
 const preset=livingTargets(),available=currentStats().unallocated;
 const fields=livingCategories().map(w=>{
  const spent=livingSpent(w.id),balance=currentStats().wallets[w.id]||0;
  const prefill=Object.prototype.hasOwnProperty.call(preset,w.id)?preset[w.id]:spent+balance;
  return `<div class="wf-budget-field">${moneyField(w.label,'living-'+w.id,inputMoney(prefill),'required')}
  <small>مصروف سابق ${money(spent)} · متبقٍ في المحفظة ${money(balance)}</small></div>`;
 }).join('');
 modal('ميزانية المعيشة الكاملة للشهر',
  'حدد السقف الشهري، وسيخصم النظام المصاريف السابقة تلقائياً من حساب المطلوب تخصيصه، بدون تكرار خصمها من البطاقة.',
  `<div class="notice">المتاح للتخصيص: <b>${money(available)}</b>. مثال: إذا صرفت 15,000 خضروات وحددت الميزانية 60,000، سيُضاف فقط ما يكملها بعد احتساب رصيد المحفظة.</div>
  <div class="wf-form-grid">${fields}</div>
  <div class="field"><label><input type="checkbox" name="approve" value="yes" required> أوافق على اعتماد الميزانية وتخصيص الفرق المطلوب فقط</label></div>`,
  f=>{
   if(f.approve!=='yes')throw Error('يجب تأكيد اعتماد الميزانية.');
   const targets=Object.fromEntries(livingCategories().map(w=>[w.id,amount(f['living-'+w.id],true)]));
   const required=livingNeeds(targets);
   if(required.additional>required.available)throw Error('المطلوب لإكمال الميزانية '+money(required.additional)+'، والمتاح '+money(required.available)+'. قلّل السقوف أو أضف مبلغاً عبر «أخرى».');
   act(n=>{
    const fresh=livingNeeds(targets,n);
    if(fresh.additional>E.stats(n).unallocated)throw Error('الرصيد المتاح تغيّر. أعد المحاولة.');
    let next=n;
    const stage=wfIncomeMode(wfMonth,n)==='salary-only'||S.receipts(n,'salary',wfMonth).length?'salary':'incentives';
    const label=stage==='salary'?'الراتب':'الحوافز';
    for(const row of fresh.rows){
     if(!row.additional)continue;
     const w=livingCategories().find(w=>w.id===row.id);
     if(!next.wallets.some(x=>x.id===row.id)){
      if(!w)throw Error('قسم '+row.label+' غير موجود.');
      next.wallets.push({id:w.id,name:w.label,kind:w.kind,color:w.color,weight:0});
     }
     next=event(next,{type:'allocate',walletId:row.id,amount:row.additional,date:today(),
       note:'ميزانية المعيشة '+wfMonth+' · من '+label+' · '+row.label});
    }
    next.settings.livingTargets={...(next.settings.livingTargets||{}),[wfMonth]:{...livingTargets(wfMonth,next),...targets}};
    return next;
   },required.additional?'تم استكمال الميزانية دون خصم مصاريف سابقة مرتين':'تم حفظ السقف الشهري؛ المخصص الحالي يكفي');
  },'اعتماد الميزانية واستكمال الفرق');
}
function wfLivingExtra(){
 if(state.demo)throw Error('ابدأ الخطة الفعلية أولاً.');
 modal('أخرى','تسجيل مبلغ مستلم فعلياً لا يتبع الراتب أو الحوافز، ويضاف إلى المتاح للمعيشة.',
  `<div class="form-grid">${amountField()}${select('مكان الاستلام','method',methodOptions)}${dateField()}</div>
   <div class="notice">سيظهر الوصف «أخرى» فقط في السجل والكشف. لا يُحتسب المبلغ قبل استلامه، ولا يُخصص لمحفظة دون موافقتك.</div>
   <div class="field"><label><input type="checkbox" name="approve" value="yes" required> أؤكد استلام المبلغ فعلياً</label></div>`,
  f=>{
   if(f.approve!=='yes')throw Error('يجب تأكيد استلام المبلغ.');
   act(n=>event(n,{type:'income',amount:amount(f.amount),date:f.date,method:f.method,note:'أخرى'}),
     'تم تسجيل «أخرى» ضمن المتاح للمعيشة');
  },'تأكيد استلام أخرى');
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
  period:wfMonth,from:start,to:end,issuedAt:new Date().toLocaleString('ar-IQ'),currency:unit(),brand:'ذُخر',
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
 if(!options.length)throw Error('أضف قسماً للصرف اليومي؛ خزنة الطوارئ لا تظهر في الصرف السريع.');
 modal(quick?'صرف سريع':'إضافة مصروف',quick?'المبلغ والقسم وطريقة الدفع فقط، وتاريخ الصرف يُضبط تلقائياً على اليوم.':'لا تحتاج تحديد ميزانية الشهر أولاً. يُخصم المصروف من المتبقي غير المحجوز، ويُحتسب ضمن ميزانية الشهر لاحقاً.',
  `<div class="form-grid ${quick?"thukhr-quick-form":""}">
   ${select('نوع المصروف','walletId',options,options.some(x=>x[0]===initialId)?initialId:options[0][0])}
   ${amountField()}
   ${select('طريقة الدفع','method',methodOptions)}
   ${quick?'<input type="hidden" name="date" value="'+today()+'">':dateField()}
   <div class="full">${field(quick?'الوصف (اختياري)':'على ماذا صرفت؟','note','text','',quick?'maxlength="120" placeholder="مثلاً: قهوة أو مشتريات"':'required maxlength="120" placeholder="مثلاً شراء خضروات للمنزل"')}</div></div>
   <div class="notice">المتاح غير المحجوز: <b>${money(stats.unallocated)}</b>. إذا كانت المحفظة لا تكفي، يمول ذُخر فقط مقدار النقص من المتبقي عند تأكيد الصرف، دون حجز إضافي أو خصم مزدوج.</div>`,
  f=>{
   const wallet=livingCategories().find(w=>w.id===f.walletId);
   if(!wallet|| (state.wallets.find(w=>w.id===wallet.id)?.kind||wallet.kind)!=='spend')throw Error('الطوارئ محمية من المصروف اليومي؛ افتح خزنة الطوارئ.');
   const value=amount(f.amount);
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
    if(fromRemaining)next=event(next,{type:'allocate',walletId:wallet.id,amount:fromRemaining,date:f.date,
      note:'تمويل مصروف مباشر · من '+stage+' · '+wallet.label});
    return event(next,{type:'expense',walletId:wallet.id,amount:value,method:f.method,
      date:f.date,note:f.note.trim()||'صرف سريع'});
   },'تم تسجيل المصروف من المتبقي واحتسابه ضمن ميزانية الشهر');
  },'تأكيد صرف المبلغ');
}
function wfLivingQuick(){
 wfLivingDirect('',true);
 const moneyInput=$('modalForm')?.elements?.amount;
 if(moneyInput)moneyInput.focus({preventScroll:true});
}
function wfLivingExpense(id){
 if(!livingCategories().some(w=>w.id===id))throw Error('اختر قسماً من أقسام المعيشة.');
 if(state.wallets.find(w=>w.id===id)?.kind==='emergency')throw Error('الطوارئ محمية. افتح خزنة الطوارئ للصرف الموثق.');
 if(!state.wallets.some(w=>w.id===id))throw Error('المحفظة لم تُنشأ بعد؛ خصص لها مبلغاً أولاً.');
 if((currentStats().wallets[id]||0)<=0)throw Error('رصيد هذه المحفظة صفر؛ خصص مبلغاً قبل تسجيل مصروف.');
 openExpense(id);
}

function wfPay(id){
 if(!monthlyAllFields().some(x=>id===wfObId(wfMonth,x.key)))throw Error('هذا الحجز ليس ضمن دورة الشهر المعروضة.');
 obligationAction('pay',id);
}



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
  if(f.source==="unallocated")return event(n,{type:'allocate',walletId:target.id,amount:v,date:f.date,note:'تغذية خزنة الطوارئ'});
  const src=n.wallets.find(w=>w.id===f.source&&w.kind!=='emergency');
  if(!src)throw Error("مصدر المبلغ غير صالح.");
  return event(n,{type:'transfer',from:src.id,to:target.id,amount:v,date:f.date,note:'تغذية خزنة الطوارئ من '+src.name});
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
  return event(n,{type:'expense',walletId:w.id,amount:amount(f.amount),date:f.date,method:f.method,
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
  if(f.destination==="unallocated")return event(n,{type:'release',walletId:from.id,amount:v,date:f.date,
   note:'إعادة مبلغ الطوارئ للمتاح: '+auth.reason,emergencyAuthorization:auth});
  const to=n.wallets.find(w=>w.id===f.destination&&w.kind!=='emergency');
  if(!to)throw Error("اختر محفظة وجهة صحيحة.");
  return event(n,{type:'transfer',from:from.id,to:to.id,amount:v,date:f.date,
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

function overview(){const s=currentStats(),sum=summary(),days=left(),elapsed=state.cycle.days-days,end=addDays(state.cycle.start,state.cycle.days-1);return head(overviewIdentity()+'ملخص أموالك',state.settings.name?`مرحباً ${safe(state.settings.name)}، هذه نظرتك المالية اليوم`:'رصيدك ومصروفاتك في مكان واحد.',btn('new-cycle','دورة جديدة','calendar','secondary')+btn('expense','إضافة مصروف'),'neo-overview-heading')+`<div class="dashboard-top"><section class="hero"><div class="hero-badge">${state.demo?'خطة توضيحية':'أموالك تحت السيطرة'}</div><div><div class="hero-label">${icon('wallet')}إجمالي رصيدك الحالي</div><div class="hero-total">${money(s.total)}</div><div class="hero-sub">${icon('shield')}يشمل المحافظ والالتزامات المحجوزة والمبلغ غير الموزع</div></div><div class="hero-bottom"><div><span>رصيد البطاقة</span><b>${money(s.card)}</b></div><div><span>النقد المتوفر</span><b>${money(s.cash)}</b></div><div><span>متاح للتوزيع</span><b>${money(s.unallocated)}</b></div></div></section><div class="neo-snapshot" aria-label="ملخص المصروف والمتاح"><article class="neo-snapshot-item expense"><span class="neo-snapshot-label">${icon('chart')} المصروف الفعلي</span><strong>${money(sum.expenses+sum.paid)}</strong></article><article class="neo-snapshot-item available"><span class="neo-snapshot-label">${icon('saving')} المتاح الآمن اليوم</span><strong>${money(cap())}</strong></article></div><section class="cycle-card"><div class="card-top"><span class="eyebrow">دورة دخلك الحالية</span><span class="chip">${days?'دورة نشطة':'اكتملت الدورة'}</span></div><h2>كل يوم بخطة أوضح</h2><div class="cycle-range">${date(state.cycle.start)} — ${date(end,true)}</div><div class="cycle-progress"><div class="progress"><i style="width:${Math.min(100,elapsed/state.cycle.days*100)}%"></i></div><div class="progress-meta"><span>مضى ${elapsed} من ${state.cycle.days} يوماً</span><span>${Math.round(elapsed/state.cycle.days*100)}%</span></div></div><div class="cycle-footer"><span>${icon('clock')} <b class="num">${days}</b> يوماً متبقياً</span><button class="text-btn" data-action="new-cycle">إدارة الدورة ${icon('chevron')}</button></div></section></div>${neoOverviewBudget()}${schedulePanel(true)}<div class="stat-grid">${stat(state.migration?'الدخل والرصيد الافتتاحي':'الدخل المستلم',sum.income,'income','من بداية الدورة الحالية')}${stat('الالتزامات المتبقية',Object.values(s.reserved).reduce((a,n)=>a+n,0),'calendar',`${state.obligations.filter(o=>(s.reserved[o.id]||0)>0).length} التزامات محجوزة`,'gold')}${stat('المصروف الفعلي',sum.expenses+sum.paid,'chart','يشمل المصروفات والالتزامات المدفوعة','blue')}${stat('المتاح الآمن اليوم',cap(),'saving','يستثني الادخار والطوارئ والالتزامات','purple')}</div>${section('محافظك، لكل غرض مساحة','قسّم أموالك بوعي، وأنفق بطمأنينة.',`<a class="text-btn" href="#plan">إدارة المحافظ ${icon('arrow')}</a>`)}<div class="wallet-grid">${walletCards()}</div><div class="bottom-grid"><section class="panel">${section('آخر الحركات','خطواتك المالية، أولاً بأول',`<a class="text-btn" href="#ledger">عرض السجل ${icon('arrow')}</a>`)}${ledgerRows([...state.transactions].reverse().slice(0,4),true)}</section><section class="panel">${section('كيف تتوزّع أموالك؟','توزيع الرصيد الحالي بحسب الغرض')}${donut()}</section></div>`}
function incomePage(){const s=currentStats(),txs=[...state.transactions].reverse().filter(t=>t.type==='income');return head('الدخل والاستلام','ابدأ بما استلمته فعلياً، ثم امنح كل مبلغ غرضاً.',btn('income-sources','مواعيد الدخل','calendar','secondary')+btn('income','تسجيل دخل'))+schedulePanel()+`<div class="flow"><div class="flow-step"><span>01 / استلم</span><h3>سجّل دخلك الفعلي</h3><p>راتب، عمل حر، أو دخل إضافي. لا يُحتسب الدخل قبل استلامه.</p></div><div class="flow-step"><span>02 / احجز</span><h3>قدّم التزاماتك</h3><p>سجّل الالتزامات وحدد أنت متى وكم تحجز لها دون حجز تلقائي.</p></div><div class="flow-step"><span>03 / وزّع</span><h3>خطّط لما تبقّى</h3><p>وزّع الباقي على محافظك واحتياطي الطوارئ وأهدافك.</p></div></div><div class="stat-grid">${stat('إجمالي الدخل المسجل',s.income,'income','كل الدورات')}${stat('متاح للتوزيع',s.unallocated,'wallet','بعد الحجز والتخصيص','blue')}${stat('رصيد البطاقة',s.card,'card','الرصيد المحسوب من السجل','gold')}${stat('رصيد النقد',s.cash,'cash','النقد المتوفر فعلياً','purple')}</div><section class="panel">${section('سجل الدخل','يمكنك إدخال عدة مصادر دخل في الدورة نفسها.')}${ledgerRows(txs)}</section><div class="notice">لديك أموال سابقة؟ سجّلها مرة واحدة كـ «رصيد افتتاحي» من زر تسجيل الدخل. السحب من البطاقة حركة بين حساباتك، ويسجّل من «حركة نقد وبطاقة» في السجل.</div>`}
function obligationsPage(){const s=currentStats(),activeObligations=state.obligations.filter(o=>!o.archived),archivedObligations=state.obligations.filter(o=>o.archived),total=activeObligations.reduce((a,o)=>a+o.amount,0),res=activeObligations.reduce((a,o)=>a+(s.reserved[o.id]||0),0),paid=activeObligations.reduce((a,o)=>a+(s.paid[o.id]||0),0);return head('الالتزامات الثابتة','تسجيل الالتزام لا يحجز أي مبلغ، إلا إذا وافقت أنت على الحجز لاحقاً.',btn('obligation','إضافة التزام'))+`<div class="stat-grid">${stat('إجمالي الالتزامات النشطة',total,'calendar','المبالغ المستحقة غير المؤرشفة')}${stat('محجوز ولم يُدفع',res,'shield','يبقى ضمن الرصيد حتى السداد','gold')}${stat('تم سداده',paid,'check','مدفوعات الالتزامات المسجلة','blue')}${stat('غير مغطّى بعد',Math.max(0,total-res-paid),'clock','يحتاج إلى حجز من المتاح','purple')}</div><div class="obligation-list">${activeObligations.length?activeObligations.map(o=>{const p=s.paid[o.id]||0,r=s.reserved[o.id]||0,missing=o.amount-r-p,isPaid=p===o.amount,late=o.due<today()&&!isPaid;return `<article class="ob-card"><div class="card-top"><h3>${safe(o.name)}</h3><span class="chip ${late?'red':missing?'amber':''}">${isPaid?'مدفوع بالكامل':late?'متأخر':missing?'يحتاج حجزاً':'محجوز'}</span></div><div class="ob-detail"><span>الاستحقاق ${date(o.due,true)}${o.recurring?' · متكرر':''}</span><b>${money(o.amount)}</b></div><div class="progress"><i style="width:${(p+r)/o.amount*100}%"></i></div><div class="progress-meta"><span>مدفوع ${fmt(p)} · محجوز ${fmt(r)}</span><span>غير مغطى ${fmt(missing)}</span></div><div class="ob-actions">${r>0?`<button class="btn small" data-action="pay" data-id="${safe(o.id)}">${icon('check')}سداد الالتزام</button>`:''}${missing>0?`<button class="btn small soft" data-action="reserve" data-id="${safe(o.id)}">حجز مبلغ</button>`:''}${r>0?`<button class="btn small secondary" data-action="unreserve" data-id="${safe(o.id)}">إلغاء حجز</button>`:''}${o.recurring?`<button class="text-btn" data-action="renew" data-id="${safe(o.id)}">تجديد الاستحقاق</button>`:''}${state.transactions.some(t=>t.obligationId===o.id)?`<button class="btn small secondary" data-action="archive-obligation" data-id="${safe(o.id)}"${r>0?' title="ألغِ الحجز أولاً"':''}>أرشفة</button>`:`<button class="btn small danger" data-action="delete-obligation" data-id="${safe(o.id)}">${icon('trash')}حذف الالتزام</button>`}</div></article>`}).join(''):empty('مساحة خالية من الالتزامات','أضف الإيجار أو الأقساط أو الخدمات وحدد تاريخ الاستحقاق.')}</div>${archivedObligations.length?`<section class="panel"><div class="section-heading"><div><h2>الالتزامات المؤرشفة (${archivedObligations.length})</h2><p>محفوظة مع حركاتها المالية ولا تدخل في مجموع الالتزامات النشطة.</p></div></div><div class="obligation-list">${archivedObligations.map(o=>`<article class="ob-card"><div class="card-top"><h3>${safe(o.name)}</h3><span class="chip">مؤرشف</span></div><div class="ob-detail"><span>الاستحقاق ${date(o.due,true)}</span><b>${money(o.amount)}</b></div><div class="progress-meta"><span>مدفوع ${fmt(s.paid[o.id]||0)}</span><span>محجوز ${fmt(s.reserved[o.id]||0)}</span></div><div class="ob-actions"><button class="btn small secondary" data-action="restore-obligation" data-id="${safe(o.id)}">إعادة للقائمة النشطة</button></div></article>`).join('')}</div></section>`:''}<div class="notice">تسجيل أي التزام لا يخصم شيئاً من البطاقة أو النقد أو المحافظ أو المتاح للتوزيع. يمكنك الحجز فقط بعد اختيار المبلغ والموافقة عليه. الحجز ينقل من «المتاح للتوزيع» إلى الالتزام، والسداد الفعلي وحده يخفض رصيد البطاقة أو النقد.</div>`}
function weeklyTable(){const count=Math.ceil(state.cycle.days/7),s=currentStats();return `<div class="table-wrap"><table><thead><tr><th>الأسبوع</th><th>الفترة</th><th>المخصص النسبي</th><th>الصرف الفعلي</th><th class="align-left">الفرق</th></tr></thead><tbody>${Array.from({length:count},(_,i)=>{const start=addDays(state.cycle.start,i*7),n=Math.min(7,state.cycle.days-i*7),end=addDays(start,n-1);let base=state.transactions.filter(t=>t.type==='allocate'&&t.date>=state.cycle.start&&state.wallets.some(w=>w.id===t.walletId&&w.kind==='spend')).reduce((a,t)=>a+t.amount,0);const target=Math.floor(base*Math.min(state.cycle.days,(i+1)*7)/state.cycle.days)-Math.floor(base*i*7/state.cycle.days),spent=state.transactions.filter(t=>t.type==='expense'&&t.date>=start&&t.date<=end&&state.wallets.some(w=>w.id===t.walletId&&w.kind==='spend')).reduce((a,t)=>a+t.amount,0);return `<tr><td>الأسبوع ${i+1}</td><td class="muted">${date(start)} — ${date(end)}</td><td>${money(target)}</td><td>${money(spent)}</td><td class="align-left ${target<spent?'expense-color':'income-color'}">${money(target-spent)}</td></tr>`}).join('')}</tbody></table></div>`}
function planPage(){const s=currentStats();return head('المحافظ والخطة','خطة مرنة تناسب حياتك، تبدأ بعد تغطية التزاماتك.',btn('wallet','محفظة جديدة','plus','secondary')+btn('allocate','توزيع المتاح','wallet'))+`<div class="notice">متاح للتوزيع الآن: <b>${money(s.unallocated)}</b> · أرصدة المحافظ هي تخصيصات من رصيدك، والتحويل بينها لا يُعدّ دخلاً أو مصروفاً.</div><div class="wallet-grid">${walletCards()}</div><div class="row" style="margin-bottom:23px;flex-wrap:wrap">${btn('transfer','تحويل بين المحافظ','transfer','secondary')}${btn('release','إرجاع مبلغ إلى المتاح','wallet','secondary')}${btn('expense','تسجيل مصروف','plus')}</div><div class="two-col"><section class="panel">${section('توزيع يناسبك','اختر أسلوبك وعدّل أوزان محافظك كما تريد.')}<p class="help-text">خطة الملف الأصلي محفوظة كقالب اختياري: المنزل 125,000، الشخصية 120,000، الأسرة 60,000، والطوارئ 30,000. يمكنك تطبيق نسبها على أي مبلغ أو إدخال مبالغك الخاصة.</p><div class="settings-actions">${btn('allocate','اختيار توزيع','wallet','soft')}</div></section><section class="panel">${section('سقف يومي يحمي خطتك','يتكيّف مع المصروف الفعلي والأيام المتبقية.')}<div class="stat-amount">${money(cap())}</div><p class="help-text">الرصيد المتاح لمحافظ الصرف موزّع على الأيام المتبقية، مع خصم ما صُرف اليوم. الفائض يبقى في محفظتك. الادخار والطوارئ والالتزامات خارج هذا السقف.</p></section></div><section class="panel">${section('المراجعة الأسبوعية','مخصص نسبي بحسب أيام الأسبوع الفعلية، بما فيها الأسبوع الأخير القصير.')}${weeklyTable()}${state.transactions.some(t=>t.date>addDays(state.cycle.start,state.cycle.days-1))?'<div class="notice warn">توجد حركات بعد انتهاء المدة؛ تظهر في السجل وإجماليات التقارير. ابدأ دورة جديدة لتحديث حدود الصرف والتقسيم الأسبوعي.</div>':''}<div class="notice">المخصص النسبي مبني على التخصيصات الجديدة خلال الدورة. التحويلات والترحيل تغيّر الرصيد الفعلي والسقف اليومي؛ راجعها في السجل ولا تعتبر فرق الأسبوع رصيداً مصرفياً.</div></section>`}
function ledgerPage(){return head('سجل الحركات','كل حركة محفوظة بتاريخها ومبلغها وغرضها، مع بحث وفلاتر دقيقة.')+`<section class="panel">${section('دفترك المالي',`${state.transactions.length} حركة مسجلة`,btn('csv','تصدير CSV','download','secondary small'))}<div class="filters"><input id="search" placeholder="ابحث بالوصف أو المحفظة…" aria-label="البحث في السجل"><select id="typeFilter" aria-label="نوع الحركة"><option value="all">جميع الحركات</option><option value="income">الدخل</option><option value="expense">المصروفات</option><option value="pay">سداد الالتزامات</option><option value="withheld">استقطاع قبل الإيداع</option><option value="reserve">الحجز</option><option value="allocate">التخصيص</option><option value="transfer">التحويلات</option><option value="account">النقد والبطاقة</option></select><label class="thukhr-date-filter" for="fromFilter"><span>من تاريخ</span>
 <input type="date" id="fromFilter" lang="ar-IQ" aria-label="من تاريخ">
 <small id="fromFilterReadable">التاريخ اختياري</small></label>
 <label class="thukhr-date-filter" for="toFilter"><span>إلى تاريخ</span>
 <input type="date" id="toFilter" lang="ar-IQ" aria-label="إلى تاريخ">
 <small id="toFilterReadable">التاريخ اختياري</small></label></div><div id="ledgerResults" class="thukhr-ledger-table">${ledgerRows([...state.transactions].reverse())}</div><div id="ledgerMobileResults" class="thukhr-ledger-mobile">${ledgerMobileRows([...state.transactions].reverse())}</div></section><div class="notice">عند حذف عملية، تُفحص الحركات التي تليها. إذا كان الحذف يجعل أي حساب أو محفظة سالبة، يُرفض لحماية دقة السجل.</div>`}
function reportsPage(){const s=currentStats(),sum=summary(),sp=state.wallets.map(w=>({name:w.name,value:cycleTx().filter(t=>t.type==='expense'&&t.walletId===w.id).reduce((a,t)=>a+t.amount,0),color:w.color})),max=Math.max(1,...sp.map(x=>x.value)),reserved=Object.values(s.reserved).reduce((a,n)=>a+n,0),walletTotal=Object.values(s.wallets).reduce((a,n)=>a+n,0);return head('التقارير والتحليل','افهم سلوك الصرف وراجع توازن أموالك.',btn('wf-living-pdf','تنزيل PDF','download','secondary'))+`<div class="stat-grid">${stat(state.migration?'الدخل والرصيد الافتتاحي':'دخل هذه الدورة',sum.income,'income',state.migration?'يشمل افتتاح النسخة السابقة':'دخل مستلم فقط')}${stat('صرف المحافظ',sum.expenses,'wallet','مشترياتك الفعلية','blue')}${stat('الالتزامات المدفوعة',sum.paid,'check','سداد من المحجوز','gold')}${stat('الادخار والطوارئ',state.wallets.filter(w=>w.kind!=='spend').reduce((a,w)=>a+s.wallets[w.id],0),'saving','الرصيد الحالي المحمي','purple')}</div><div class="two-col"><section class="panel">${section('أين تذهب مصروفاتك؟','مصروفات المحافظ خلال الدورة الحالية')}<div class="report-bars">${sp.map(x=>`<div class="report-col" style="height:${Math.max(2,x.value/max*90)}%;background:${safe(x.color)}"><b class="num">${fmt(x.value)}</b><span>${safe(x.name)}</span></div>`).join('')}</div></section><section class="panel">${section('معادلة التوازن','مكان المال يساوي مجموع الأغراض المخصصة له.')}<div class="keyval"><span>البطاقة + النقد</span><b>${money(s.total)}</b></div><div class="keyval"><span>المحافظ والادخار</span><b>${money(walletTotal)}</b></div><div class="keyval"><span>الالتزامات المحجوزة</span><b>${money(reserved)}</b></div><div class="keyval"><span>غير موزّع</span><b>${money(s.unallocated)}</b></div><div class="notice">${icon('check')} الحساب متوازن · الفرق ${fmt(s.total-walletTotal-reserved-s.unallocated)} ${unit()}</div></section></div><section class="panel">${section('مطابقة الرصيد الفعلي','المطابقة تكشف الفرق ولا تنشئ تسوية صامتة.')}<form id="reconcileForm" class="form-grid"><div class="field"><label for="reconMethod">الحساب</label><select id="reconMethod" name="method"><option value="card">البطاقة</option><option value="cash">النقد</option></select></div><div class="field"><label for="reconActual">الرصيد الفعلي الآن (${unit()})</label><input id="reconActual" name="actual" type="text" data-money inputmode="${ccy().dec?'decimal':'numeric'}" autocomplete="off" oninput="window.mizanFormatMoneyInput(this)" required></div><div class="full">${btn('submit-recon','مطابقة الرصيد','check')}</div></form><div id="reconResult"></div><p class="help-text">طابق فقط الأموال التي أدخلتها في ميزان، إذا كان حسابك يحوي أموالاً أخرى خارج الخطة.</p></section><section class="panel">${section('الدورات المؤرشفة','ملخص كل دورة عند استلام الدخل الجديد.')}${state.history.length?state.history.slice().reverse().map(h=>`<div class="keyval"><span>${date(h.start||h.cycle?.start||today(),true)}</span><b>${money(h.total??h.summary?.total??h.closingTotal??h.closing?.total??0)}</b></div>`).join(''):empty('ستجد دوراتك السابقة هنا','ابدأ دورة جديدة ليُحفظ ملخص الدورة الحالية.')}${state.legacyHistory?.length?'<div class="notice">أرشيف النسخة السابقة: '+state.legacyHistory.length+' دورات محفوظة في النسخة الاحتياطية، دون إضافتها إلى الرصيد الحالي.</div>':''}<div class="settings-actions">${btn('backup','تنزيل السجل الكامل','download','secondary')}</div></section>`}
function settingsPage(){const html= head('الإعدادات','الحساب والمظهر ومواعيد الدخل والنسخ الاحتياطية.')+`<div class="two-col"><section class="panel">${section('مساحتك الشخصية','خصّص تجربتك حسب احتياجك.')}<form id="settingsForm" class="form-grid"><div class="field full"><label for="userName">الاسم المفضل</label><input name="name" id="userName" maxlength="40" value="${safe(state.settings.name)}" placeholder="كيف تحب أن نناديك؟"></div><div class="field"><label for="currency">العملة الأساسية</label><select id="currency" name="currency" ${state.transactions.length?'disabled':''}>${Object.entries(currencies).map(([k,c])=>`<option value="${k}" ${k===state.settings.currency?'selected':''}>${c.label} (${k})</option>`).join('')}</select><small>لعملة جديدة، ابدأ خطة مستقلة. لا تُحوَّل الأرصدة بتغيير الاسم.</small></div><div class="field"><label for="digits">عرض الأرقام</label><select id="digits" name="digits"><option value="en" ${state.settings.digits==='en'?'selected':''}>123,456</option><option value="ar" ${state.settings.digits==='ar'?'selected':''}>١٢٣٬٤٥٦</option></select></div><div class="full"><button class="btn" type="submit">حفظ التفضيلات</button></div></form></section><section class="panel">${section('صورة العائلة','اختيارية، ولا تغادر جهازك أو تُرفع إلى GitHub.')}
 <p class="thukhr-privacy">يمكنك اختيار صورتك العائلية لتظهر في ترحيب ذُخر وقسم الأهداف العائلية. تُحفظ في مساحة المتصفح نفسها فقط. حذف بيانات الموقع يمحوها.</p>
 <div class="thukhr-family-settings">
 <img class="thukhr-photo-preview" data-thukhr-family-photo alt="معاينة الصورة العائلية">
 <label class="btn soft" for="thukhrFamilyFile">اختيار صورة من الجهاز</label>
 <input type="file" id="thukhrFamilyFile" accept="image/jpeg,image/png,image/webp" style="position:absolute;width:1px;height:1px;opacity:0;overflow:hidden">
 <button type="button" id="thukhrFamilyRemove" class="btn secondary" hidden>إزالة الصورة</button>
 </div><p id="thukhrFamilyStatus" class="thukhr-privacy" role="status">لم تُضف صورة.</p>
 </section><section class="panel">${section('بياناتك تحت سيطرتك','تخزين محلي، دون مزامنة تلقائية.')}<p class="help-text">البيانات المالية محفوظة داخل هذا المتصفح. كل جهاز له سجل مستقل. نزّل نسخة JSON دورياً وقبل الانتقال إلى جهاز آخر. الاستعادة تستبدل السجل بعد التحقق منه.</p><div class="settings-actions">${btn('backup','نسخة احتياطية JSON','download')}${btn('restore','استعادة نسخة','upload','secondary')}${btn('csv','تصدير CSV','ledger','secondary')}</div><div class="notice">يمكن استيراد نسخة JSON من تطبيق «محافظ عمار» القديم. تبقى الأرصدة والحركات، وتُحفظ الدورات القديمة ضمن ملف النسخة الاحتياطية.</div></section><section class="panel">${section('دورة الدخل','ابدأ من يوم الاستلام الفعلي.')}<div class="keyval"><span>بداية الدورة</span><b>${date(state.cycle.start,true)}</b></div><div class="keyval"><span>المدة</span><b>${state.cycle.days} يوماً</b></div><div class="settings-actions">${btn('income-sources','مواعيد الدخل الشهري','calendar','soft')}${btn('new-cycle','بدء دورة تخطيط جديدة','calendar','secondary')}</div><p class="help-text" style="margin-top:14px">حدد نوع الدخل من «خطة الدخل» (راتب فقط أو راتب وحوافز)، وسجّل المبالغ التي استلمتها فعلياً. بدء دورة تخطيط جديدة إجراء مستقل، وتُرحّل فيه كل الأرصدة والالتزامات غير المدفوعة. تجديد الالتزام المتكرر متاح من بطاقته، مع منع تكرار الاستحقاق نفسه.</p></section><section class="panel">${section('التثبيت والاستخدام','واجهة متجاوبة على الهاتف والحاسوب.')}<p class="help-text">على iPhone: افتح Safari ثم مشاركة ← إضافة إلى الشاشة الرئيسية.<br>على Android أو Windows: قائمة المتصفح ← تثبيت التطبيق.<br>يتوفر العمل دون اتصال بعد اكتمال حفظ ملفات التطبيق، بحسب دعم المتصفح.</p><div class="settings-actions">${btn('help','دليل الحسابات','help','secondary')}<button class="btn secondary" id="installBtn" hidden>تثبيت ميزان</button></div></section></div><section class="panel">${section('بداية جديدة','صدّر بياناتك أولاً، ثم أنشئ خطة جديدة عند الحاجة.')}<div class="settings-actions">${btn('setup','إنشاء خطة جديدة','plus','danger')}${!state.demo?btn('demo','عرض مثال توضيحي','grid','secondary'):''}</div></section>`;
 const sections=['account','account','backup','income','account','income'];let i=0;
 const tagged=html.replace(/<section class="panel"/g,m=>{
  const key=sections[i++]||'account';
  return m+' data-settings-group="'+key+'"'+(settingsTab===key?'':' hidden');
 });
 const choices=[['account','الحساب'],['appearance','المظهر'],['income','الدخل'],['backup','النسخ']];
 const tabs=`<div class="thukhr-settings-tabs" role="group" aria-label="أقسام الإعدادات">
  ${choices.map(([k,label])=>`<button type="button" class="${settingsTab===k?'is-active':''}" data-action="settings-tab" data-id="${k}" aria-pressed="${settingsTab===k}">${label}</button>`).join('')}</div>`;
 const appearance=`<section class="panel thukhr-appearance-panel" data-settings-group="appearance" ${settingsTab==='appearance'?'':'hidden'}>
  ${section('مظهر ذُخر','اختر بين الأنماط الأربعة، دون تغيير البيانات أو الأرصدة.')}
  ${thukhrThemePicker()}
  <p class="help-text">يُحفظ اختيار المظهر على هذا الجهاز فقط. الألوان المالية والأرصدة لا تتغير.</p></section>`;
 return tagged.replace('<div class="two-col">',tabs+'<div class="two-col">')+appearance+(settingsTab==='account'?profilesPanel():'');
}
function render(){page=location.hash.slice(1)||page;if(!navs.some(n=>n[0]===page))page='workflow';$('nav').innerHTML=navs.map(([p,ic,label])=>`<a class="nav-link ${page===p?'active':''}" href="#${p}" data-page="${p}">${icon(ic)}<span>${label}</span>${page===p?'<i class="nav-dot"></i>':''}</a>`).join('');$('breadcrumb').textContent=navs.find(n=>n[0]===page)[2];let banner=state.demo?`<div class="demo-banner"><span><b>أنت تتصفح خطة توضيحية</b> · الأرقام مثال للتجربة، ابدأ بخطة تحمل أرقامك.</span><button class="text-btn" data-action="setup">ابدأ خطتك ${icon('arrow')}</button></div>`:'';if(storageError)banner+=`<div class="notice warn">${safe(storageError)} ${brokenRaw?'<button class="text-btn" data-action="rescue">تنزيل البيانات الأصلية</button>':''}</div>`;const renders={workflow:workflowPage,living:livingPage,emergency:emergencyPage,reports:statementPage,overview,income:incomePage,obligations:obligationsPage,plan:planPage,ledger:ledgerPage,settings:settingsPage};const mobile='';$('main').innerHTML=mobile+banner+renders[page]();paintIcons();window.ThukhrFamily?.sync();document.querySelectorAll('[data-neo-page]').forEach(a=>{const active=a.dataset.neoPage===page;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});const more=$('thukhrMoreButton'),moreMenu=$('thukhrMoreMenu');
 if(more){const active=['ledger','emergency','settings'].includes(page);more.classList.toggle('active',active);
 more.setAttribute('aria-expanded','false');more.setAttribute('aria-current',active?'page':'false');}
 if(moreMenu)moreMenu.hidden=true;bindPage();}
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
function requireReal(){if(state.demo){modal('الخطة التوضيحية','جرّب الحركات هنا أو ابدأ بأرقامك.','<p class="help-text">يمكنك تعديل المثال بحرية. عند إنشاء خطتك تُستبدل أرقام المثال فقط بعد التأكيد.</p><div class="settings-actions">'+btn('setup','ابدأ خطتك','plus')+btn('close','متابعة التجربة','arrow','secondary')+'</div>');return false}return true}
function openIncome(sourceId='',requestedPeriod=''){const source=S.sources(state).find(x=>x.id===sourceId),periodValue=requestedPeriod||today().slice(0,7);modal(source?'تأكيد استلام '+source.name:'تسجيل دخل مستلم','يدخل المبلغ الفعلي في خطتك الحالية دون تصفير الأرصدة.',`<div class="form-grid">${select('مصدر الدخل','sourceId',[['','دخل إضافي / رصيد افتتاحي'],...S.sources(state).filter(x=>wfIncomeMode(periodValue)!=='salary-only'||x.id!=='incentives').map(x=>[x.id,x.name])],source?.id||'')}${field('استحقاق أي شهر؟','incomePeriod','month',periodValue,`max="${today().slice(0,7)}"`)}${amountField()}${select('مكان الاستلام','method',methodOptions)}${dateField()}${field('الوصف','note','text',source?.name||'','required maxlength="100" placeholder="راتب، حوافز، عمل حر…"')}</div><div class="notice">الموعد المتوقع لا يزيد الرصيد. بعد تأكيد الاستلام، احجز الالتزامات ثم وزّع المتاح. يُسجّل كل مصدر مرة للشهر؛ الدفعات الإضافية تُسجّل كدخل إضافي.</div>`,f=>act(s=>{const selected=S.sources(s).find(x=>x.id===f.sourceId);
 if(selected?.id==='incentives'&&wfIncomeMode(f.incomePeriod,s)==='salary-only')throw Error('هذا الشهر راتب فقط؛ غيّر نوع الدخل أولاً.');
 const newAmount=amount(f.amount);
 const similar=s.transactions.find(t=>t.type==='income'&&!t.sourceId&&t.amount===newAmount&&t.date.slice(0,7)===f.incomePeriod);
 if(selected&&similar)throw Error('دخل سابق بنفس المبلغ والشهر غير مرتبط. استخدم «ربط دخل مسجّل سابقاً» بدلاً من إضافة مبلغ مكرر.');
 if(s.settings.closedMonths?.[f.date.slice(0,7)])throw Error('الشهر مغلق مالياً.');
 const mode=selected?wfIncomeMode(f.incomePeriod,s):null;
 const next=event(s,{type:'income',amount:newAmount,method:f.method,date:f.date,note:f.note.trim(),...(selected?{sourceId:selected.id,sourceName:selected.name,incomePeriod:f.incomePeriod}:{})});
 if(selected)next.settings.wfIncomeModes={...(next.settings.wfIncomeModes||{}),[f.incomePeriod]:mode};
 return next},'تم تأكيد الاستلام وإضافته للخطة الحالية'),'تأكيد الاستلام');const form=$('modalForm');const update=()=>{const selected=S.sources(state).find(x=>x.id===form.elements.sourceId.value);form.elements.incomePeriod.disabled=!selected;form.elements.incomePeriod.required=!!selected;if(selected)form.elements.note.value=selected.name};form.elements.sourceId.addEventListener('change',update);update();}

function openExpense(preselectedWalletId=null){
 const options=state.wallets.filter(w=>w.kind==='spend').map(w=>[w.id,w.name]);
 if(!options.length)throw Error('لا توجد محفظة صرف يومي. الطوارئ متاحة فقط من خزنتها.');
 modal('تسجيل مصروف','محافظ الطوارئ غير متاحة في هذه الشاشة.',`<div class="form-grid">${select('المحفظة','walletId',options,options.some(w=>w[0]===preselectedWalletId)?preselectedWalletId:options[0][0])}${select('طريقة الدفع','method',methodOptions)}${amountField()}${dateField()}<div class="full">${field('الوصف','note','text','','required maxlength="120" placeholder="على ماذا صرفت؟"')}</div></div>`,
 f=>act(n=>{const w=n.wallets.find(w=>w.id===f.walletId&&w.kind==='spend');if(!w)throw Error('اختر محفظة صرف يومي صحيحة.');return event(n,{type:'expense',walletId:w.id,amount:amount(f.amount),method:f.method,date:f.date,note:f.note.trim()})},'تم تسجيل المصروف وتحديث الأرصدة'),'حفظ المصروف');
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
    f=>{if(f.approve!=='yes')throw Error('لا يمكن تنفيذ الحجز دون موافقتك.');const n=amount(f.amount);if(n>missing)throw Error('الحجز يتجاوز المتبقي من الالتزام.');if(n>currentStats().unallocated)throw Error('الرصيد المتاح للتوزيع غير كافٍ؛ لا يتم الحجز من المحافظ. سجّل دخلاً جديداً أو أرجع مخصصاً من محفظة إلى المتاح.');act(x=>event(x,{type:'reserve',amount:n,obligationId:id,date:f.date,note:'حجز من '+(labels[f.fundSource]||labels.other)}),'تم الحجز بموافقتك')},
    'أوافق وأحجز المبلغ');
  return;
 }
 const value=stats.reserved[id]||0;
 const names={pay:'سداد الالتزام',unreserve:'إلغاء حجز المبلغ'};
 modal(names[type],o.name,`<div class="form-grid">${amountField(inputMoney(value),inputMoney(value))}${type==='pay'?select('الدفع من','method',methodOptions):''}${dateField()}</div><div class="notice">${type==='pay'?'السداد الفعلي يخفض رصيد البطاقة أو النقد ويلغي الحجز المقابل.':'إلغاء الحجز يعيد المبلغ إلى المتاح للتوزيع ويبقى الالتزام غير مغطّى.'}</div>`,f=>act(x=>event(x,{type,amount:amount(f.amount),obligationId:id,date:f.date,...(type==='pay'?{method:f.method}:{})}),'تم تحديث الالتزام'),names[type]);
}
function openAccount(){modal('حركة نقد وبطاقة','انقل مكان المال من دون احتسابه مصروفاً.',`<div class="form-grid">${select('العملية','direction',[['withdraw','سحب من البطاقة إلى النقد'],['deposit','إيداع النقد في البطاقة']])}${amountField()}${dateField()}${field('ملاحظة','note','text','','maxlength="100"')}</div>`,f=>act(s=>event(s,{type:'account',from:f.direction==='withdraw'?'card':'cash',to:f.direction==='withdraw'?'cash':'card',amount:amount(f.amount),date:f.date,note:f.note.trim()}),'تم نقل المبلغ بين البطاقة والنقد'))}
function openTransfer(){
 const opts=state.wallets.filter(w=>w.kind!=='emergency').map(w=>[w.id,w.name]);
 if(!opts.length)throw Error('لا توجد محفظة اعتيادية متاحة للتحويل.');
 modal('تحويل بين المحافظ','إخراج المال من الطوارئ يتم فقط عبر خزنة الطوارئ.',
 `<div class="form-grid">${select('من محفظة','from',opts)}${select('إلى محفظة','to',walletOptions(),opts[1]?.[0]||opts[0][0])}${amountField()}${dateField()}<div class="full">${field('السبب','note','text','','maxlength="120"')}</div></div>`,
 f=>act(n=>{if(n.wallets.find(w=>w.id===f.from)?.kind==='emergency')throw Error('لا يمكن إخراج مبلغ من الطوارئ بهذه الطريقة.');return event(n,{type:'transfer',from:f.from,to:f.to,amount:amount(f.amount),date:f.date,note:f.note.trim()})},'تم التحويل بين المحافظ'));
}
function openRelease(){
 const opts=state.wallets.filter(w=>w.kind!=='emergency').map(w=>[w.id,w.name]);
 if(!opts.length)throw Error('الطوارئ لا تُحرّر من هنا؛ افتح خزنة الطوارئ.');
 modal('إرجاع مبلغ إلى المتاح','لا تظهر هنا محافظ الطوارئ المحمية.',
 `<div class="form-grid">${select('المحفظة','walletId',opts)}${amountField()}${dateField()}</div>`,
 f=>act(s=>{if(s.wallets.find(w=>w.id===f.walletId)?.kind==='emergency')throw Error('استخدم خزنة الطوارئ.');return event(s,{type:'release',walletId:f.walletId,amount:amount(f.amount),date:f.date})},'تم إرجاع المبلغ إلى المتاح'));
}
function openWallet(id){const w=state.wallets.find(w=>w.id===id);modal(w?'إعدادات المحفظة':'محفظة جديدة','سمّها حسب احتياجاتك وحدّد دورها في خطتك.',`<div class="form-grid">${field('اسم المحفظة','name','text',w?.name||'','required maxlength="45"')}${select('نوع المحفظة','kind',[['spend','مصروفات يومية'],['saving','هدف ادخار'],['emergency','احتياطي طوارئ']],w?.kind||'spend')}${field('اللون','color','color',w?.color||'#508b74','required')}${field('وزن التوزيع','weight','number',w?.weight??10,'required min="0" max="10000" step="1"')}</div><div class="notice">الوزن يُستخدم للتوزيع النسبي. الادخار والطوارئ مستثنيان من سقف الصرف اليومي.</div>`,f=>act(s=>{if(!f.name.trim())throw Error('أدخل اسماً للمحفظة.');const v={id:w?.id||uid(),name:f.name.trim(),kind:f.kind,color:f.color,weight:Number(f.weight)};if(w&&w.kind!==v.kind&&s.transactions.some(t=>t.walletId===w.id||t.from===w.id||t.to===w.id))
 throw Error('لا يمكن تغيير نوع محفظة مرتبطة بحركات سابقة. أنشئ محفظة جديدة لحماية السجل.');
 if(w)s.wallets[s.wallets.findIndex(x=>x.id===w.id)]=v;else s.wallets.push(v);return s},'تم حفظ المحفظة'))}
function openAllocate(){const available=currentStats().unallocated;modal('توزيع المتاح على محافظك','التزاماتك أولاً، ثم خطتك المرنة.',`<div class="field"><label for="preset">طريقة التوزيع</label><select id="preset"><option value="weights">بحسب أوزان محافظي</option><option value="original">نسب الخطة الأصلية (125 / 120 / 60 / 30)</option><option value="custom">مبالغ مخصصة</option></select></div><div class="notice">المتاح ${money(available)} · يمكنك توزيع جزء منه وإبقاء الباقي دون تخصيص.</div>${state.wallets.map(w=>`<div class="allocation-row"><span>${safe(w.name)}<small>${w.kind==='spend'?'صرف يومي':'احتياطي / ادخار'}</small></span><div class="field"><input aria-label="مخصص ${safe(w.name)}" type="text" data-money inputmode="${ccy().dec?'decimal':'numeric'}" autocomplete="off" oninput="window.mizanFormatMoneyInput(this)" name="a-${safe(w.id)}" required></div></div>`).join('')}<div class="keyval"><span>مجموع التوزيع</span><b id="allocationTotal"></b></div>`,(f,form)=>act(s=>{let next=s,total=0;for(const w of state.wallets){const n=amount(f['a-'+w.id],true);total+=n;if(n)next=event(next,{type:'allocate',walletId:w.id,amount:n})}if(!total)throw Error('أدخل مبلغاً واحداً على الأقل.');return next},'تم توزيع المبلغ على المحافظ'),'اعتماد التوزيع');const form=$('modalForm'),preset=$('preset');function fill(){let weights=state.wallets.map(w=>({id:w.id,weight:preset.value==='original'?({home:125,personal:120,kids:60,emergency:30}[w.id]||0):w.weight}));if(preset.value!=='custom'){try{const allocation=E.distribute(available,weights);for(const w of state.wallets)form.elements['a-'+w.id].value=formatMoneyTyping(inputMoney(allocation[w.id]))}catch(e){showError(e.message)}}update()}function update(){try{let total=0;for(const w of state.wallets)total+=parseMoney(form.elements['a-'+w.id].value||'0',ccy().dec,true);if(!Number.isSafeInteger(total))throw Error();$('allocationTotal').innerHTML=money(total);$('allocationTotal').className=total>available?'expense-color':'income-color'}catch{$('allocationTotal').textContent='أدخل مبالغ صحيحة';$('allocationTotal').className='expense-color'}}preset.onchange=fill;form.addEventListener('input',update);fill()}
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

function setupStart(){if(!state.demo&&state.transactions.length){confirmModal('إنشاء خطة جديدة؟','سيُستبدل السجل الحالي. نزّل نسخة احتياطية قبل المتابعة.',()=>{wizard={name:state.settings.name,currency:state.settings.currency,start:today(),days:30,income:'',method:'card',obligations:[]};wizardStep=0;renderWizard()},'متابعة وإنشاء خطة');return}wizard={name:state.settings.name,currency:state.settings.currency,start:today(),days:30,income:'',method:'card',obligations:[]};wizardStep=0;renderWizard()}
function wizardBack(form){if(form){const f=Object.fromEntries(new FormData(form));if(wizardStep===1){wizard.obligations=wizardRows(form)}else Object.assign(wizard,f)}wizardStep=Math.max(0,wizardStep-1);renderWizard()}
function wizardRows(form){return [...form.querySelectorAll('.setup-ob')].map(row=>({name:row.querySelector('[data-name]').value.trim(),amount:row.querySelector('[data-amount]').value,due:row.querySelector('[data-due]').value})).filter(o=>o.name||o.amount)}
function renderWizard(){const stepNames=['دخلك الفعلي','التزاماتك أولاً','خطتك جاهزة'];let body=`<div class="steps">${stepNames.map((s,i)=>`<span class="${i<=wizardStep?'active':''}" title="${s}"></span>`).join('')}</div>`;let submit;
if(wizardStep===0){body+=`<div class="form-grid">${field('الاسم المفضل','name','text',wizard.name,'maxlength="40"')}${select('العملة','currency',Object.entries(currencies).map(([k,c])=>[k,c.label]),wizard.currency)}${field('تاريخ الاستلام','start','date',wizard.start,`required max="${today()}"`)}${field('مدة الدورة بالأيام','days','number',wizard.days,'required min="1" max="366" step="1"')}${select('نوع الدفعة المستلمة','sourceId',[['','رصيد افتتاحي / دخل آخر'],...S.sources(state).map(x=>[x.id,x.name])],wizard.sourceId||'')}${field('شهر الاستحقاق','incomePeriod','month',wizard.incomePeriod||wizard.start.slice(0,7),`max="${today().slice(0,7)}"`)}${moneyField('الدخل المستلم','income',wizard.income,'required',currencies[wizard.currency]?.dec??0)}${select('مكان المبلغ','method',methodOptions,wizard.method)}</div><div class="notice">ابدأ بالدخل المستلم أو الرصيد الفعلي الذي تريد إدارته. يمكنك إضافة مصادر أخرى لاحقاً.</div>`;submit=f=>{const cur=currencies[f.currency];if(!cur)throw Error('اختر عملة مدعومة.');parseMoney(f.income,cur.dec);Object.assign(wizard,f);wizardStep=1;renderWizard()}}
if(wizardStep===1){body+=`<p class="help-text" style="margin-bottom:16px">سجّل الالتزامات بقيمتها الكاملة، حتى إذا تجاوزت الدخل. لا يتم الحجز الآن، بل لاحقاً بموافقتك.</p><div id="setupObligations"></div><button class="btn soft small" type="button" id="addSetupOb">${icon('plus')}إضافة التزام</button><div class="notice">الإضافة هنا توثّق الالتزامات فقط ولا تخصمها من الرصيد. لا يُنشأ أي حجز إلا بموافقتك اللاحقة.</div>`;submit=(f,form)=>{wizard.obligations=wizardRows(form);const dec=currencies[wizard.currency].dec;let total=0;for(const o of wizard.obligations){if(!o.name||!o.due)throw Error('أكمل اسم الالتزام ومبلغه وتاريخ استحقاقه.');total+=parseMoney(o.amount,dec)}wizardStep=2;renderWizard()}}
if(wizardStep===2){const u=currencies[wizard.currency].unit,dec=currencies[wizard.currency].dec,income=parseMoney(wizard.income,dec),ob=wizard.obligations.reduce((a,o)=>a+parseMoney(o.amount,dec),0),available=income;body+=`<div class="wizard-summary"><div class="keyval"><span>الدخل المستلم</span><b class="num">${formatMinor(income,dec)} ${u}</b></div><div class="keyval"><span>التزامات مسجّلة غير محجوزة</span><b class="num">${formatMinor(ob,dec)} ${u}</b></div><div class="keyval"><span>المبلغ المحجوز الآن</span><b class="num">0 ${u}</b></div><div class="keyval"><span>المتاح للتوزيع</span><b class="income-color num">${formatMinor(available,dec)} ${u}</b></div></div>${select('توزيع المبلغ المتبقي','plan',[['original','نسب الخطة الأصلية: المنزل / الشخصية / الأسرة / الطوارئ'],['balanced','خطة عامة: معيشة 50% / شخصية 20% / أسرة 10% / طوارئ 20%'],['later','إبقاؤه متاحاً وتوزيعه يدوياً لاحقاً']],'later')}<div class="notice">كل الالتزامات المذكورة تبقى غير محجوزة حتى تختار حجزها. أنصح بإبقاء المال متاحاً للتوزيع إلى أن تقرر الحجز أو التخصيص بنفسك.</div>`;submit=f=>{const dec=currencies[wizard.currency].dec;let next=E.initial();next.demo=false;next.settings={...state.settings,name:wizard.name.trim(),currency:wizard.currency};next.cycle={...next.cycle,start:wizard.start,days:Number(wizard.days)};const income=parseMoney(wizard.income,dec),firstSource=S.sources(next).find(x=>x.id===wizard.sourceId);next=event(next,{type:'income',amount:income,date:wizard.start,method:wizard.method,note:firstSource?firstSource.name:'بداية الخطة — دخل مستلم',...(firstSource?{sourceId:firstSource.id,sourceName:firstSource.name,incomePeriod:wizard.incomePeriod||wizard.start.slice(0,7)}:{})});for(const o of wizard.obligations){const id=uid(),a=parseMoney(o.amount,dec);next.obligations.push({id,name:o.name,amount:a,due:o.due,recurring:false})}if(f.plan!=='later'){const weights=f.plan==='balanced'?[50,20,10,20]:[125,120,60,30],available=E.stats(next).unallocated;next.wallets.forEach((w,i)=>w.weight=weights[i]);const parts=E.distribute(available,next.wallets);for(const w of next.wallets)if(parts[w.id])next=event(next,{type:'allocate',walletId:w.id,amount:parts[w.id],date:wizard.start})}save(next,'بدأت خطتك المالية. أهلاً بك في ميزان',true);closeModal();location.hash='overview';}}
modal(`ابدأ خطتك · ${stepNames[wizardStep]}`,`الخطوة ${wizardStep+1} من 3`,body,submit,wizardStep===2?'اعتماد خطتي':'متابعة');const actions=$('modalForm').querySelector('.form-actions');if(wizardStep>0){const back=document.createElement('button');back.type='button';back.className='btn secondary';back.textContent='السابق';back.onclick=()=>wizardBack($('modalForm'));actions.prepend(back)}if(wizardStep===1){const add=(o={})=>{const row=document.createElement('div');row.className='setup-ob';row.innerHTML=`<div class="form-grid" style="margin-bottom:17px">${field('اسم الالتزام','ob-name','text',o.name||'','data-name maxlength="70"')}${moneyField('المبلغ','ob-amount',o.amount||'','data-amount',currencies[wizard.currency]?.dec??0)}${field('الاستحقاق','ob-due','date',o.due||today(),'data-due')}<div class="field" style="justify-content:end"><button class="btn danger small" type="button" data-remove>حذف</button></div></div>`;row.querySelector('[data-remove]').onclick=()=>row.remove();$('setupObligations').append(row);wireMoneyInputs(row)};wizard.obligations.forEach(add);$('addSetupOb').onclick=()=>add()}}
function confirmModal(title,text,yes,label='تأكيد'){modal(title,'',`<p class="help-text">${safe(text)}</p>`,()=>{closeModal();yes()},label)}
function download(name,data,type='application/json'){const blob=new Blob([data],{type:type+';charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function backup(){E.validate(state);download('thukhr-'+activeProfile+'-'+today()+'.json',JSON.stringify(state,null,2));
 try{localStorage.setItem('thukhr-last-backup-'+activeProfile,today())}catch{}
 toast('تم تجهيز النسخة الاحتياطية. احفظها خارج جهازك.');}
function exportCsv(){const rows=[['التاريخ','العملية','التفاصيل','المبلغ','العملة','الحساب','الملاحظة','مصدر الدخل','شهر الاستحقاق'],...state.transactions.map(t=>[t.date,...txLabel(t).slice(0,2),inputMoney(t.amount),state.settings.currency,t.method||'داخلي',t.note||'',t.sourceName||'',t.incomePeriod||''])];const clean=v=>{let s=String(v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};download(`mizan-ledger-${today()}.csv`,'\uFEFF'+rows.map(r=>r.map(clean).join(',')).join('\r\n'),'text/csv')}
function help(){modal('كيف يعمل ذُخر؟','من أول استلام إلى آخر يوم في الدورة.',`<div class="help-text"><p><b>مواعيدك:</b> الحوافز بين 10 و12، والراتب بين 22 و24 من كل شهر. عدّل المواعيد من إعدادات الدخل. الدفعتان ضمن الخطة الحالية؛ لا يضاف المتوقع قبل تأكيد استلامه.</p><br><p><b>1. استلم:</b> سجّل الدخل الذي وصل فعلياً إلى البطاقة أو النقد.</p><br><p><b>2. أضف ثم وافق:</b> تسجيل الالتزام لا يحجز أموالاً. حدّد الحجز لاحقاً من زر «حجز مبلغ» ووافق عليه صراحةً. الحجز ليس دفعاً.</p><br><p><b>3. وزّع:</b> امنح ما تبقّى محافظ للصرف واحتياطي للطوارئ والادخار.</p><br><p><b>4. سجّل:</b> المصروف يخفض الحساب والمحفظة. سداد الالتزام يخفض الحساب وحجز الالتزام. السحب النقدي والتحويل لا يغيّران إجمالي المال.</p><br><p><b>5. راجع:</b> تابع السقف اليومي وطابق الرصيد من التقارير. احفظ نسخة احتياطية دورياً.</p><br><p>تُحفظ أموالك في هذا المتصفح فقط. لا توجد مزامنة بين الأجهزة أو اتصال مصرفي. المبلغ المقترح للصرف تنظيم حسابي حسب بياناتك، وليس توقعاً لدخل لم يُستلم.</p></div><div class="form-actions">${btn('close','فهمت','check')}</div>`)}
function bindPage(){wireMoneyInputs(document);if($('wfMonth'))$('wfMonth').addEventListener('change',e=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)&&e.target.value<=today().slice(0,7)){wfMonth=e.target.value;render()}});if($('scheduleMonth'))$('scheduleMonth').addEventListener('change',e=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)){schedulePeriod=e.target.value;render()}});if(page==='ledger'){const filter=()=>{const text=$('search').value.toLowerCase(),type=$('typeFilter').value,from=$('fromFilter').value,to=$('toFilter').value;for(const id of ['fromFilter','toFilter']){const element=$(id),readable=$(id+'Readable');
  if(readable)readable.textContent=element.value?date(element.value,true):'التاريخ اختياري';}
 const txs=[...state.transactions].reverse().filter(t=>(type==='all'||t.type===type)&&(!from||t.date>=from)&&(!to||t.date<=to)&&txLabel(t).join(' ').toLowerCase().includes(text));$('ledgerResults').innerHTML=ledgerRows(txs);$('ledgerMobileResults').innerHTML=ledgerMobileRows(txs)};['search','typeFilter','fromFilter','toFilter'].forEach(id=>$(id).addEventListener('input',filter))}if(page==='settings'&&$('settingsForm')){$('settingsForm').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));try{let s=structuredClone(state);if(!currencies[f.currency||s.settings.currency])throw Error('اختر عملة مدعومة.');s.settings={...s.settings,...f};save(s,'تم حفظ التفضيلات')}catch(ex){toast(ex.message)}};if(installPrompt)$('installBtn').hidden=false}if(page==='reports'&&$('reconcileForm'))$('reconcileForm').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));try{const actual=amount(f.actual,true),expected=currentStats()[f.method],delta=actual-expected;let s=structuredClone(state);s.reconciliations.push({id:uid(),date:today(),method:f.method,actual,expected,delta,transactionIds:s.transactions.map(t=>t.id)});save(s,'تم حفظ نتيجة المطابقة');$('reconResult').innerHTML=`<div class="notice ${delta?'warn':''}">${delta?`يوجد فرق ${money(delta)}. راجع الدخل والمصاريف والحركات النقدية؛ لا نعدّل الرصيد تلقائياً.`:'الرصيد الفعلي مطابق تماماً للسجل.'}</div>`}catch(ex){toast(ex.message)}};}
const actions={'thukhr-more':()=>{const menu=$('thukhrMoreMenu'),button=$('thukhrMoreButton');if(!menu||!button)return;menu.hidden=!menu.hidden;button.setAttribute('aria-expanded',String(!menu.hidden));},'ledger-detail':ledgerDetail,'settings-tab':id=>{if(['account','appearance','income','backup'].includes(id)){settingsTab=id;render()}},'wf-fields-manage':monthlyFieldsManage,'wf-income-mode':wfIncomeModePicker,'wf-field-add':()=>monthlyFieldEdit(),'wf-field-edit':monthlyFieldEdit,'wf-field-hide':monthlyFieldHide,'wf-field-restore':monthlyFieldRestore,'wf-field-delete':monthlyFieldDelete,'wf-fields-clear':monthlyFieldsClear,'wf-category-hide':livingCategoryHide,'wf-category-restore':livingCategoryRestore,'wf-category-clear':livingCategoryClear,'wf-category-manage':livingCategoryManage,'wf-category-add':()=>livingCategoryEdit(),'wf-category-edit':livingCategoryEdit,'wf-category-delete':livingCategoryDelete,'wf-config':wfConfig,'wf-activate':wfActivate,'wf-incentives-receipt':()=>wfReceive('incentives'),'wf-salary-receipt':()=>wfReceive('salary'),'wf-incentives-apply':()=>wfApply('incentives'),'wf-salary-apply':()=>wfApply('salary'),'wf-incentives-link':()=>openLinkReceipt('incentives',wfMonth),'wf-salary-link':()=>openLinkReceipt('salary',wfMonth),'wf-pay':wfPay,'wf-release':openRelease,'wf-living-allocate':wfLivingAllocate,'wf-living-expense':wfLivingExpense,'wf-living-direct':wfLivingDirect,'emergency-open':()=>location.hash='emergency','emergency-feed':emergencyFeed,'emergency-spend':emergencySpend,'emergency-move':emergencyMove,'emergency-correct':emergencyCorrection,'emergency-create':()=>openWallet(),'wf-living-quick':wfLivingQuick,'wf-living-extra':wfLivingExtra,'wf-living-pdf':wfLivingReport,'close-finance-month':wfCloseMonth,'finance-csv':exportFinanceCsv,'finance-reconcile':financeReconcile,'finance-resolve':financeResolve,'profile-create':profileCreate,'profile-switch':profileSwitch,'wf-living-scroll':()=>location.hash='living',income:openIncome,'income-sources':openIncomeSources,'receipt':(id,p)=>openIncome(id,p||schedulePeriod),'link-receipt':openLinkReceipt,expense:openExpense,obligation:()=>openObligation(),pay:id=>obligationAction('pay',id),reserve:id=>obligationAction('reserve',id),unreserve:id=>obligationAction('unreserve',id),renew:id=>openObligation(state.obligations.find(o=>o.id===id)),'delete-obligation':deleteObligation,'archive-obligation':archiveObligation,'restore-obligation':restoreObligation,account:openAccount,transfer:openTransfer,release:openRelease,wallet:()=>openWallet(), 'wallet-edit':openWallet,allocate:openAllocate,'new-cycle':openCycle,setup:setupStart,close:closeModal,help,backup,csv:exportCsv,restore:()=>$('restoreFile').click(),settings:()=>location.hash='settings',print:wfLivingReport,'thukhr-appearance':id=>setThukhrTheme(id),theme:()=>setThukhrTheme(thukhrTheme()==='night'||thukhrTheme()==='modern'?'classic':'night'),rescue:()=>download('mizan-recovery-original.json',brokenRaw),demo:()=>confirmModal('عرض الخطة التوضيحية؟','ستُستبدل بياناتك الحالية بالمثال. نزّل نسخة احتياطية قبل المتابعة.',()=>{try{save(makeDemo(),'أنت الآن في الخطة التوضيحية')}catch(e){toast(e.message)}}),'delete-tx':id=>{const t=state.transactions.find(t=>t.id===id),w=state.wallets.find(w=>w.id===(t?.type==='transfer'?t.from:t?.walletId));if(t&&w?.kind==='emergency'&&['expense','release','transfer'].includes(t.type))return emergencyCorrection(id);return confirmModal('حذف هذه الحركة؟','سيُعاد فحص الحسابات كاملة. يُرفض الحذف إن تسبب بعجز في حركة لاحقة.',()=>act(s=>E.remove(s,id),'تم حذف الحركة وإعادة حساب الأرصدة'),'حذف الحركة');}};
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const fn=actions[b.dataset.action];if(fn){e.preventDefault();try{fn(b.dataset.id,b.dataset.period)}catch(ex){showError(ex.message)}}});
$('restoreFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>10_000_000)throw Error('الحد الأقصى للملف 10 ميغابايت.');const data=JSON.parse(await file.text()),next=data.version===1?window.MizanMigration.importLegacy(data,E):data;E.validate(next);if(!currencies[next.settings.currency])throw Error('عملة الملف غير مدعومة في هذه الواجهة.');confirmModal('استعادة النسخة الاحتياطية؟',`تم التحقق من ${next.transactions.length} حركة. ستُستبدل البيانات الحالية بهذه النسخة. احفظ نسخة من سجلك الحالي قبل التأكيد.`,()=>{try{save(next,'تمت الاستعادة والتحقق من توازن الأرصدة',true)}catch(ex){toast(ex.message)}},'استعادة البيانات')}catch(ex){toast('تعذرت الاستعادة: '+ex.message)}finally{e.target.value=''}});
let installPrompt=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;if($('installBtn'))$('installBtn').hidden=false});document.addEventListener('click',async e=>{if(e.target.id==='installBtn'&&installPrompt){await installPrompt.prompt();installPrompt=null;e.target.hidden=true}});
window.addEventListener('hashchange',()=>{render();window.scrollTo({top:0,behavior:'instant'})});window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue){try{const next=JSON.parse(e.newValue);E.validate(next);state=next;applySettings();render();toast('تم تحديث البيانات من تبويب آخر')}catch{toast('تعذر قراءة تحديث التبويب الآخر')}}});window.addEventListener('focus',()=>{if(!$('modal').open)render()});
$('modal').addEventListener('click',e=>{if(e.target===$('modal')){const r=$('modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal()}});
applySettings();render();paintIcons();if('serviceWorker'in navigator&&location.protocol!=='file:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();
