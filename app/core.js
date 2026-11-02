/* فِرزة — app/core.js
 * Shared constants, profile keys, icons, escaping, dates, currency and money formatting/parsing.
 * Classic script: shares the global scope with the other app/*.js files, loaded in the order listed in index.html. */
'use strict';
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

const paths={search:'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14 M20 20l-4.2-4.2',grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',income:'M12 3v12m-4-4 4 4 4-4 M4 15v5h16v-5',calendar:'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2 M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2',wallet:'M4 6h14V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h15V7H5a2 2 0 0 1-2-2 M16 12h5v5h-5a2.5 2.5 0 0 1 0-5z',ledger:'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 7h6m-6 4h6m-6 4h3',chart:'M4 3v18h17M8 16v-5m5 5V6m5 10v-8',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M10 3h4l1 3 3 1 3 1v4l-3 1-1 3-1 3h-4l-1-3-3-1-3-1v-4l3-1 1-3z',plus:'M12 5v14M5 12h14',arrow:'M18 12H6m5-5-5 5 5 5',chevron:'m14 7-5 5 5 5',shield:'M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7z M8 12l3 3 5-5',moon:'M20 14a8 8 0 0 1-10-10 9 9 0 1 0 10 10z',sun:'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',help:'M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3h.01 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',home:'m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7',user:'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 21v-3a8 8 0 0 1 16 0v3',kids:'M9 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M16 6a2.5 2.5 0 1 0 0 5 M3 20v-3a6 6 0 0 1 12 0v3m2-6a4 4 0 0 1 4 4v2',saving:'M5 9h13l3 3-2 5h-2v3h-3v-2H9v2H6v-4l-3-2v-3z M8 9V6h5M16 12h.01',trend:'m3 17 6-6 4 4 8-10m-6 0h6v6',clock:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M12 6v6l4 2',check:'m5 12 4 4L19 6',close:'m6 6 12 12M6 18 18 6',transfer:'M3 7h17m-5-5 5 5-5 5 M21 17H4m5-5-5 5 5 5',download:'M12 3v12m-5-5 5 5 5-5 M4 15v6h16v-6',upload:'M12 16V4m-5 5 5-5 5 5 M4 16v5h16v-5',trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',bulb:'M8 15a6 6 0 1 1 8 0l-1 3H9z M9 21h6',card:'M3 5h18v14H3z M3 10h18m-14 5h4',cash:'M2 6h20v13H2z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M5 9v7m14-7v7',print:'M6 8V3h12v5M6 17H3V9h18v8h-3M6 14h12v7H6z',edit:'m4 16 12-12 4 4-12 12-5 1z M14 6l4 4'};
const icon=(name)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.wallet}"/></svg>`;
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{let d=new Date;return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const addDays=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const diff=(a,b)=>Math.round((new Date(a+'T12:00:00')-new Date(b+'T12:00:00'))/86400000);
const date=(s,long=false)=>new Intl.DateTimeFormat('ar-IQ',{day:'numeric',month:long?'long':'short',...(long?{year:'numeric'}:{})}).format(new Date(s+'T12:00:00'));
const uid=()=>crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
const currencies={IQD:{label:'دينار عراقي',unit:'د.ع',dec:0},USD:{label:'دولار أمريكي',unit:'$',dec:2},SAR:{label:'ريال سعودي',unit:'ر.س',dec:2},AED:{label:'درهم إماراتي',unit:'د.إ',dec:2},EUR:{label:'يورو',unit:'€',dec:2}};
let state,storageError='',brokenRaw='',needsFirstSetup=false,page='dashboard',wizard={},wizardStep=0,schedulePeriod=today().slice(0,7);
function load(){try{const raw=localStorage.getItem(KEY);if(raw){try{const s=JSON.parse(raw);E.validate(s);return s}catch(e){brokenRaw=raw;storageError='تعذر قراءة البيانات المحفوظة. احتفظ بنسخة منها قبل بدء خطة جديدة.';return E.initial()}}needsFirstSetup=true;const fresh=E.initial();fresh.demo=false;return fresh}catch(e){storageError='الحفظ المحلي غير متاح في هذا المتصفح. صدّر نسخة قبل المغادرة.';return E.initial()}}
function ccy(){return currencies[state.settings.currency]||currencies.IQD}const unit=()=>ccy().unit;
function inputMoney(n,dec=ccy().dec){const b=BigInt(n||0),neg=b<0n,a=neg?-b:b,p=10n**BigInt(dec);return (neg?'-':'')+(a/p).toString()+(dec?'.'+(a%p).toString().padStart(dec,'0'):'')}
const formatMinor=(n,dec=ccy().dec)=>{const raw=inputMoney(n,dec),[whole,frac='']=raw.split('.'),locale=state.settings.digits==='ar'?'ar-IQ':'en-US',nf=new Intl.NumberFormat(locale),part=frac.replace(/0+$/,'');let result=nf.format(BigInt(whole));if(n<0&&BigInt(whole)===0n)result='−'+result;if(part){const dp=new Intl.NumberFormat(locale).formatToParts(1.1).find(p=>p.type==='decimal').value;const digits=part.replace(/\d/g,d=>new Intl.NumberFormat(locale,{useGrouping:false}).format(Number(d)));result+=dp+digits}return result};
const fmt=n=>formatMinor(n);
// A no-break space keeps the currency unit on the same line as its number.
const money=n=>`<span class="num">${fmt(n)}</span>\u00a0<small>${unit()}</small>`;
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
