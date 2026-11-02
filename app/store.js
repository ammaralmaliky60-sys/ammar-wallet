/* فِرزة — app/store.js
 * Persistence: money inputs, save/commit helpers, demo data and initial state load.
 * Classic script: shares the global scope with the other app/*.js files, loaded in the order listed in index.html. */
'use strict';
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
function save(next,message='تم الحفظ بنجاح',replaceBroken=false){
 if(brokenRaw&&!replaceBroken)throw Error('توجد بيانات محفوظة تعذر قراءتها. نزّلها من زر الإنقاذ، ثم ابدأ خطة جديدة أو استعد نسخة صحيحة.');
 E.validate(next);
 if(!replaceBroken){
  let raw;
  try{raw=localStorage.getItem(KEY)}catch{throw Error('تعذر الوصول إلى تخزين الجهاز للتحقق من آخر تحديث.')}
  if(raw!==null){
   let stored;
   try{stored=JSON.parse(raw)}catch{throw Error('السجل المحفوظ غير قابل للقراءة؛ استخدم نسخة الإنقاذ أولاً.')}
   if(JSON.stringify(stored)!==JSON.stringify(state))
    throw Error('تغيّر السجل المالي في نافذة أخرى. حمّل آخر نسخة من البيانات قبل المتابعة، ولا تكتب فوقها.');
  }
 }
 keepLocalSnapshot(state);
 try{localStorage.setItem(KEY,JSON.stringify(next))}catch(e){throw Error('تعذر حفظ التغيير. صدّر نسخة احتياطية أو أتح مساحة تخزين ثم حاول مجدداً.')}
 state=next;storageError='';brokenRaw='';applySettings();render();if(message)toast(message);
}
function act(fn,msg){try{save(fn(structuredClone(state)),msg);closeModal()}catch(e){showError(e.message)}}
function commitEvent(s,t){return E.commit(s,{id:uid(),date:today(),...t})}
function makeDemo(){let s=E.initial();s.demo=true;s.settings.name='';s.cycle.start=addDays(today(),-9);s.cycle.days=30;
s.wallets=[{id:'home',name:'المنزل والمعيشة',kind:'spend',color:'#4a9776',weight:125},{id:'personal',name:'المصاريف الشخصية',kind:'spend',color:'#7297ba',weight:120},{id:'kids',name:'الأسرة والأطفال',kind:'spend',color:'#c6a569',weight:60},{id:'emergency',name:'الطوارئ والادخار',kind:'emergency',color:'#9a86bc',weight:30}];
const start=s.cycle.start;s=commitEvent(s,{type:'income',date:start,amount:1500000,method:'card',note:'الراتب الشهري'});
s.obligations=[{id:'rent',name:'إيجار السكن',amount:350000,due:addDays(start,2),recurring:true},{id:'installment',name:'قسط شهري',amount:200000,due:addDays(start,15),recurring:true},{id:'services',name:'الإنترنت والخدمات',amount:100000,due:addDays(start,12),recurring:true}];
for(const o of s.obligations)s=commitEvent(s,{type:'reserve',date:start,obligationId:o.id,amount:o.amount});
s=commitEvent(s,{type:'pay',date:addDays(start,2),obligationId:'rent',amount:350000,method:'card',note:'سداد إيجار السكن'});
for(const [walletId,n]of Object.entries({home:125000,personal:120000,kids:60000,emergency:230000}))s=commitEvent(s,{type:'allocate',date:start,walletId,amount:n});
s=commitEvent(s,{type:'account',date:addDays(start,3),from:'card',to:'cash',amount:100000,note:'سحب نقدي'});
s=commitEvent(s,{type:'expense',date:addDays(start,4),walletId:'home',amount:18500,method:'card',note:'مشتريات المنزل'});
s=commitEvent(s,{type:'expense',date:addDays(start,6),walletId:'personal',amount:12000,method:'cash',note:'مواصلات ومصاريف شخصية'});
s=commitEvent(s,{type:'expense',date:addDays(start,8),walletId:'kids',amount:7500,method:'cash',note:'احتياجات الأسرة'});return s}
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
}catch(e){/* Visual preferences cannot alter financial state when storage fails. */}
