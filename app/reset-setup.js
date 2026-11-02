/* فِرزة — app/reset-setup.js
 * Financial reset with mandatory backup, and the first-use setup wizard.
 * Classic script: shares the global scope with the other app/*.js files, loaded in the order listed in index.html. */
'use strict';
let resetProof=null,resetAttempt=0;
function freshFinancialState(){
 const clean=E.initial();
 clean.demo=false;
 E.validate(clean);
 return clean;
}
function requireResetBackup(proof,source=state,profileKey=KEY){
 if(!proof||proof.profileKey!==profileKey||proof.raw!==JSON.stringify(source))
  throw Error('تغيّرت البيانات بعد تجهيز النسخة، أو لم تُحمّل نسخة احتياطية لهذا الملف. أعد المحاولة.');
 return true;
}
async function resetDownloadBackup(attempt){
 if(resetAttempt!==attempt)return;
 const profileKey=KEY,raw=JSON.stringify(state);
 try{
  E.validate(state);
  const snapshot=structuredClone(state);
  delete snapshot.backupIntegrity;
  const digest=await backupSha256(JSON.stringify(snapshot));
  if(resetAttempt!==attempt||KEY!==profileKey||JSON.stringify(state)!==raw){
   throw Error('تغيّرت البيانات أثناء تجهيز النسخة؛ أعد المحاولة.');
  }
  const filename='thukhr-before-reset-'+activeProfile+'-'+today()+'.json';
  download(filename,JSON.stringify({...snapshot,backupIntegrity:{algorithm:'SHA-256',digest}},null,2));
  resetProof={profileKey,raw,filename};
  const note=$('resetBackupStatus');
  if(note)note.textContent='بدأ تنزيل '+filename+'. تحقق من وجوده في مدير الملفات قبل المتابعة.';
 }catch(e){showError('تعذر تجهيز النسخة الاحتياطية، ولن تتم التهيئة: '+e.message)}
}
function openFinancialReset(){
 resetProof=null;
 const attempt=++resetAttempt;
 const profile=localProfiles().find(p=>p.id===activeProfile)?.name||'المساحة الحالية';
 const stats=E.stats(state);
 const summary='عدد الحركات '+state.transactions.length+' · الرصيد '+fmt(stats.total)+' '+unit();
 modal('تهيئة بيانات فِرزة والبدء من جديد','تصفير السجل المالي الحالي فقط، وليس دورة مالية جديدة.',
 `<section class="thukhr-reset-summary">
   <strong>الملف المستهدف: ${safe(profile)}</strong>
   <span>${safe(summary)}</span>
   <p>سيتم تصفير الراتب والحوافز والحركات والالتزامات وميزانيات الأشهر والمحافظ والتقارير وسجل الدورات. ستعود الأقسام والإعدادات المالية إلى البداية.</p>
   <p>تبقى الملفات المالية الأخرى والمظهر وصورة العائلة كما هي. لا تُحذف النسخ المحلية أو ملفات JSON المحفوظة خارج المتصفح.</p>
  </section>
  <button type="button" id="resetBackupDownload" class="btn secondary thukhr-reset-download">${icon('download')} تنزيل نسخة احتياطية قبل التهيئة</button>
  <p id="resetBackupStatus" class="wf-help" role="status">نزّل نسخة احتياطية، ثم تحقق من وجود الملف في مدير الملفات.</p>
  <div class="field"><label><input type="checkbox" name="downloadConfirmed" value="yes" required> تحققت من وجود ملف JSON في التنزيلات وأريد الاحتفاظ به.</label></div>
  <div class="field"><label for="resetPhrase">اكتب كلمة تهيئة للتأكيد</label><input id="resetPhrase" name="phrase" type="text" autocomplete="off" required placeholder="تهيئة"></div>`,
  f=>{
   if(f.downloadConfirmed!=='yes'||String(f.phrase||'').trim()!=='تهيئة')
    throw Error('تحقق من ملف النسخة الاحتياطية واكتب «تهيئة» تماماً.');
   requireResetBackup(resetProof,state,KEY);
   openFinancialResetFinal(attempt);
  },'متابعة إلى التأكيد النهائي');
 $('resetBackupDownload').onclick=()=>{resetDownloadBackup(attempt).catch(e=>showError(e.message))};
}
function openFinancialResetFinal(attempt){
 if(attempt!==resetAttempt)throw Error('انتهت جلسة التأكيد. أعد فتح التهيئة.');
 requireResetBackup(resetProof,state,KEY);
 const profile=localProfiles().find(p=>p.id===activeProfile)?.name||'المساحة الحالية';
 modal('التأكيد النهائي لتهيئة البيانات',
  'سيُستبدل دفتر الملف الحالي بدفتر فارغ عند موافقتك، من دون مساس بالملفات الأخرى.',
  `<div class="thukhr-reset-summary">
   <strong>تصفير بيانات: ${safe(profile)}</strong>
   <p>نسخة الإنقاذ التي طلبت تنزيلها: <b>${safe(resetProof.filename)}</b></p>
   <p>ستختفي الأرصدة والحركات والميزانيات والالتزامات من الواجهة. استعادة السجل السابق تتطلب استيراد ملف JSON الذي احتفظت به.</p>
   </div>
   <div class="field"><label><input type="checkbox" name="finalApproval" value="yes" required> أوافق على تصفير بيانات هذا الملف الآن والبدء من الصفر</label></div>`,
  f=>{
   if(f.finalApproval!=='yes')throw Error('يلزم التأكيد النهائي.');
   if(attempt!==resetAttempt)throw Error('انتهت صلاحية هذه المحاولة.');
   requireResetBackup(resetProof,state,KEY);
   const fresh=freshFinancialState();
   save(fresh,'تمت تهيئة الملف الحالي. يمكنك إعداد خطتك الجديدة.');
   resetProof=null;resetAttempt++;
   closeModal();
   wfMonth=today().slice(0,7);
   schedulePeriod=wfMonth;
   location.hash='workflow';
   setupStart();
  },'أوافق · تهيئة الملف');
}
function setupStart(){if(!state.demo&&state.transactions.length){confirmModal('إنشاء خطة جديدة؟','سيُستبدل السجل الحالي. نزّل نسخة احتياطية قبل المتابعة.',()=>{wizard={name:state.settings.name,currency:state.settings.currency,start:today(),days:30,income:'',method:'card',incomeMode:wfIncomeMode(),obligations:[]};wizardStep=0;renderWizard()},'متابعة وإنشاء خطة');return}wizard={name:state.settings.name,currency:state.settings.currency,start:today(),days:30,income:'',method:'card',incomeMode:wfIncomeMode(),obligations:[]};wizardStep=0;renderWizard()}
function wizardBack(form){if(form){const f=Object.fromEntries(new FormData(form));if(wizardStep===1){wizard.obligations=wizardRows(form)}else Object.assign(wizard,f)}wizardStep=Math.max(0,wizardStep-1);renderWizard()}
function wizardRows(form){
 return [...form.querySelectorAll('.setup-ob')].map(row=>({
  name:row.querySelector('[data-name]').value.trim(),
  amount:row.querySelector('[data-amount]').value,
  stage:row.querySelector('[data-stage]').value
 })).filter(o=>o.name||o.amount);
}
function wizardValidateCommitments(rows,dec,mode){
 if(!Array.isArray(rows)||rows.length>16)throw Error('يمكن إدخال 16 التزاماً شهرياً كحد أقصى.');
 const allowed=mode==='salary-only'?['salary']:['salary','incentives','split'],seen=new Set();
 return rows.map(o=>{
  const name=String(o.name||'').trim().replace(/\s+/g,' ');
  if(name.length<2||name.length>45||/[<>]/.test(name))throw Error('اسم الالتزام يجب أن يكون من حرفين إلى 45 حرفاً.');
  if(seen.has(name.toLowerCase()))throw Error('هذا الالتزام مكرر: '+name);
  seen.add(name.toLowerCase());
  if(!allowed.includes(o.stage))throw Error('حدد دفعة الالتزام: '+name);
  return {name,amount:parseMoney(o.amount,dec),stage:o.stage};
 });
}
function wizardFreshPlan(source,setup){
 const mode=setup.incomeMode;
 if(!['salary-only','both'].includes(mode))throw Error('اختر نوع دخل صحيحاً.');
 const cur=currencies[setup.currency];if(!cur)throw Error('عملة غير مدعومة.');
 const rows=wizardValidateCommitments(setup.obligations,cur.dec,mode);
 const amountReceived=parseMoney(setup.income,cur.dec,true),month=setup.start.slice(0,7);
 let next=E.initial();next.demo=false;
 next.settings={...next.settings,name:setup.name.trim(),currency:setup.currency,
  digits:source.settings.digits,incomeSources:S.sources(source),wfFields:[],wfHiddenFields:[],
  wfDefaultIncomeMode:mode,wfIncomeModeSince:month,wfIncomeModes:{[month]:mode}};
 next.cycle={...next.cycle,start:setup.start,days:Number(setup.days)};
 const plan={};
 for(const row of rows){
  const key='item_'+uid().replace(/[^A-Za-z0-9_-]/g,'').slice(0,30);
  if(next.settings.wfFields.some(x=>x.key===key))throw Error('تكرر معرف الالتزام؛ أعد المحاولة.');
  next.settings.wfFields.push({key,label:row.name,stage:row.stage,reserveOnly:false,autoDeduct:true,autoMethod:'receipt'});
  plan[key]=row.amount;
 }
 if(rows.length)next.settings.twoStageWorkflow={plans:{[month]:plan},completed:{}};
 if(amountReceived){
  const sourceIncome=S.sources(next).find(x=>x.id===setup.sourceId);
  if(mode==='salary-only'&&sourceIncome?.id==='incentives')throw Error('لا تسجل الحوافز في خطة راتب فقط.');
  next=commitEvent(next,{type:'income',date:setup.start,method:setup.method,amount:amountReceived,
   note:sourceIncome?.name||'بداية الخطة — دخل مستلم',
   ...(sourceIncome?{sourceId:sourceIncome.id,sourceName:sourceIncome.name,
    incomePeriod:setup.incomePeriod||month}:{})});
  if(sourceIncome&&['salary','incentives'].includes(sourceIncome.id))
   next=autoFixedSettlement(next,sourceIncome.id,month,setup.method,setup.start).next;
 }
 if(setup.plan!=='later'&&amountReceived){
  const weights=setup.plan==='balanced'?[50,20,10,20]:[125,120,60,30];
  next.wallets.forEach((w,i)=>w.weight=weights[i]);
  const parts=E.distribute(E.stats(next).unallocated,next.wallets);
  for(const w of next.wallets)if(parts[w.id])next=commitEvent(next,{
   type:'allocate',walletId:w.id,amount:parts[w.id],date:setup.start});
 }
 E.validate(next);return next;
}
function renderWizard(){const stepNames=['دخلك الفعلي','التزاماتك أولاً','خطتك جاهزة'];let body=`<div class="steps">${stepNames.map((s,i)=>`<span class="${i<=wizardStep?'active':''}" title="${s}"></span>`).join('')}</div>`;let submit;
if(wizardStep===0){body+=`<div class="form-grid">${field('الاسم المفضل','name','text',wizard.name,'maxlength="40"')}${select('العملة','currency',Object.entries(currencies).map(([k,c])=>[k,c.label]),wizard.currency)}${field('تاريخ الاستلام','start','date',wizard.start,`required max="${today()}"`)}${field('مدة الدورة بالأيام','days','number',wizard.days,'required min="1" max="366" step="1"')}${select('نوع الدخل الشهري','incomeMode',[['salary-only','راتب فقط'],['both','راتب وحوافز']],wizard.incomeMode||'salary-only')}${select('نوع الدفعة المستلمة','sourceId',[['','رصيد افتتاحي / دخل آخر'],...S.sources(state).map(x=>[x.id,x.name])],wizard.sourceId||'')}${field('شهر الاستحقاق','incomePeriod','month',wizard.incomePeriod||wizard.start.slice(0,7),`max="${today().slice(0,7)}"`)}${moneyField('الدخل المستلم (0 إذا لم تستلم بعد)','income',wizard.income||'0','required',currencies[wizard.currency]?.dec??0)}${select('مكان المبلغ','method',methodOptions,wizard.method)}</div><div class="notice">ابدأ بالدخل المستلم أو الرصيد الفعلي الذي تريد إدارته. يمكنك إضافة مصادر أخرى لاحقاً.</div>`;submit=f=>{const cur=currencies[f.currency];if(!cur)throw Error('اختر عملة مدعومة.');parseMoney(f.income,cur.dec,true);Object.assign(wizard,f);if(f.incomeMode==='salary-only')wizard.obligations=wizard.obligations.map(o=>({...o,stage:'salary'}));wizardStep=1;renderWizard()}}
if(wizardStep===1){
 body+=`<p class="help-text" style="margin-bottom:16px">تبدأ من <b>صفر التزامات</b>. أضف فقط الالتزامات التي تريدها، بأسمائها ومبالغها ومن أي دفعة تتم تغطيتها. تستطيع المتابعة دون أي بند.</p>
 <div id="setupObligations"></div>
 <button class="btn soft small" type="button" id="addSetupOb">${icon('plus')}إضافة التزام</button>
 <div class="notice">هذه خطة شهرية فقط. لا يحجز النظام مبلغاً ولا يعتبر الالتزام مدفوعاً إلا بعد اعتماد الحركة بنفسك.</div>`;
 submit=(f,form)=>{
  wizard.obligations=wizardRows(form);
  wizardValidateCommitments(wizard.obligations,currencies[wizard.currency].dec,wizard.incomeMode);
  wizardStep=2;renderWizard();
 };
}
if(wizardStep===2){
 const dec=currencies[wizard.currency].dec,u=currencies[wizard.currency].unit;
 const received=parseMoney(wizard.income,dec,true);
 const rows=wizardValidateCommitments(wizard.obligations,dec,wizard.incomeMode);
 const obligations=rows.reduce((sum,o)=>sum+o.amount,0);
 body+=`<div class="wizard-summary">
  <div class="keyval"><span>الدخل المستلم</span><b class="num">${formatMinor(received,dec)} ${u}</b></div>
  <div class="keyval"><span>الالتزامات من إدخالك</span><b class="num">${formatMinor(obligations,dec)} ${u}</b></div>
  <div class="keyval"><span>المحجوز الآن</span><b class="num">0 ${u}</b></div>
  <div class="keyval"><span>المتبقي التخطيطي</span><b class="num">${formatMinor(received-obligations,dec)} ${u}</b></div>
  <div class="keyval"><span>الرصيد الفعلي قبل التوزيع</span><b class="income-color num">${formatMinor(received,dec)} ${u}</b></div>
 </div>
 ${select('توزيع الدخل المتاح','plan',[['later','أحدد التخصيص لاحقاً'],['original','نسب مبدئية'],['balanced','توزيع عام 50 / 20 / 10 / 20']],'later')}
 <div class="notice">لن تظهر التزامات جاهزة أو مبالغ وهمية. تحفظ البنود التي أدخلتها فقط، ولا تخصم تلقائياً من حسابك.</div>`;
 submit=f=>{
  wizard.plan=f.plan;
  const next=wizardFreshPlan(state,wizard);
  save(next,'تم إنشاء خطة فِرزة ببنودك فقط ومن دون التزامات افتراضية.',true);
  closeModal();wfMonth=wizard.start.slice(0,7);location.hash='dashboard';
 };
}

modal(`ابدأ خطتك · ${stepNames[wizardStep]}`,`الخطوة ${wizardStep+1} من 3`,body,submit,wizardStep===2?'اعتماد خطتي':'متابعة');const actions=$('modalForm').querySelector('.form-actions');if(wizardStep>0){const back=document.createElement('button');back.type='button';back.className='btn secondary';back.textContent='السابق';back.onclick=()=>wizardBack($('modalForm'));actions.prepend(back)}if(wizardStep===1){const add=(o={})=>{const row=document.createElement('div');row.className='setup-ob';row.innerHTML=`<div class="form-grid" style="margin-bottom:17px">${field('اسم الالتزام','ob-name','text',o.name||'','data-name maxlength="70"')}${moneyField('المبلغ','ob-amount',o.amount||'','data-amount',currencies[wizard.currency]?.dec??0)}${select('يُغطى من','ob-stage',wizard.incomeMode==='salary-only'?[['salary','الراتب']]:[['salary','الراتب'],['incentives','الحوافز'],['split','نصف من كل دفعة']],o.stage||'salary').replace('<select ','<select data-stage ')}<div class="field" style="justify-content:end"><button class="btn danger small" type="button" data-remove>حذف</button></div></div>`;row.querySelector('[data-remove]').onclick=()=>row.remove();$('setupObligations').append(row);wireMoneyInputs(row)};wizard.obligations.forEach(add);$('addSetupOb').onclick=()=>add()}}
