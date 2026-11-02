/* وين راحت؟ — app/workflow.js
 * Monthly workflow data, income modes, stage configuration and obligation status helpers.
 * Classic script: shares the global scope with the other app/*.js files, loaded in the order listed in index.html. */
'use strict';
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
function smartStage(){
 return wfIncomeMode()==='salary-only'?(wfDone('salary')?null:'salary'):
 !wfDone('incentives')?'incentives':!wfDone('salary')?'salary':null;
}

function smartPrior(mapping){
 return Object.entries(mapping||{}).filter(([m])=>m<wfMonth).sort((a,b)=>b[0].localeCompare(a[0]))[0]?.[1]||{};
}

function smartOpen(){
 if(state.demo)throw Error('ابدأ خطتك الفعلية أولاً.');
 if(wfMonth!==today().slice(0,7)||state.settings.closedMonths?.[wfMonth])throw Error('الدورة الذكية للشهر الحالي المفتوح فقط.');
 const stage=smartStage();if(!stage)throw Error('اكتمل اعتماد دخل هذا الشهر؛ استخدم التقارير أو الصرف السريع.');
 const rec=S.receipts(state,stage,wfMonth);if(rec.length>1)throw Error('يوجد أكثر من استلام؛ راجع الدخل أولاً.');
 const last=state.transactions.filter(t=>t.type==='income'&&['cash','card'].includes(t.method)).slice(-1)[0];
 const previousPayment=state.transactions.filter(t=>['expense','pay'].includes(t.type)&&['cash','card'].includes(t.method)).slice(-1)[0];
 const draft={base:JSON.stringify(state),month:wfMonth,stage,mode:wfIncomeMode(),existing:!!rec.length,
  income:rec[0]?.amount||0,date:rec[0]?.date||today(),method:rec[0]?.method||last?.method||'card',
  payMethod:previousPayment?.method||last?.method||'card',
  plan:wfPlan()?{...wfPlan()}:{...smartPrior(wfData().plans)},
  targets:{...smartPrior(state.settings.livingTargets),...livingTargets()},choices:{}};
 smartIncome(draft);
}

function smartIncome(d){
 const label=d.stage==='salary'?'الراتب':'الحوافز';
 const fields=d.existing?`<div class="notice">الاستلام موجود بالفعل: <b>${money(d.income)}</b> بتاريخ ${safe(d.date)}. لن يسجله التطبيق ثانيةً.</div>`:
 `<div class="form-grid">${moneyField('المبلغ المستلم فعلياً','income',inputMoney(d.income||''),'required')}
 ${select('طريقة الاستلام','method',methodOptions,d.method)}
 ${field('تاريخ الاستلام','date','date',d.date,`required min="${state.cycle.start}" max="${today()}"`)}</div>`;
 modal('الدورة الذكية · 1 من 3','تأكيد استلام '+label+' للشهر الحالي',
 `<div class="smart-steps"><b>1 · الدخل</b><span>2 · التسوية والميزانية</span><span>3 · المراجعة</span></div>
 <div class="notice">نظام الاستلام: ${d.mode==='salary-only'?'راتب فقط':'راتب وحوافز'}</div>${fields}
 <p class="wf-help">لن يظهر أي أثر مالي قبل موافقتك النهائية. الاستلام القديم يُستخدم ولا يُكرر.</p>`,
 f=>{
  if(!d.existing){
   d.income=amount(f.income);d.date=f.date;d.method=f.method;
   if(!['cash','card'].includes(d.method)||d.date.slice(0,7)!==d.month||d.date<state.cycle.start||d.date>today())
    throw Error('تحقق من طريقة الاستلام وتاريخه ضمن الدورة والشهر الحالي.');
   if(state.transactions.some(t=>t.type==='income'&&!t.sourceId&&t.amount===d.income&&t.date.slice(0,7)===d.month))
    throw Error('يوجد دخل سابق غير مرتبط بنفس المبلغ والشهر. استخدم ربط دخل سابق أولاً.');
  }
  smartAllocate(d);
 },'التالي · الالتزامات');
}

const DEFAULT_OBLIGATION_STATUS='pay';
function obligationStatusOptions(stage='salary'){
 return [
  ['pay','دفعته فعلياً'],
  ['reserve','راح أدفعه لاحقاً'],
  ['withheld',stage==='incentives'?'انخصم من حوافزي':'انخصم من راتبي']
 ];
}
function obligationStatusExplanation(mode){
 if(mode==='withheld')return 'انخصم قبل الإيداع: نوثّق التسوية فقط، وما نخصمه مرة ثانية من البطاقة أو النقد.';
 if(mode==='pay')return 'تم الدفع بعد الاستلام: ينقص رصيد البطاقة أو النقد حسب حساب الدفع المحدد.';
 return 'بعده ما اندفع: نحجزه من المتاح للصرف، ويبقى رصيد البطاقة والنقد دون تغيير.';
}
function obligationStatusSelect(name,value=DEFAULT_OBLIGATION_STATUS,stage='salary'){
 const selected=['pay','reserve','withheld'].includes(value)?value:DEFAULT_OBLIGATION_STATUS;
 return `<div class="thukhr-status-choice">
  ${select('حالة الالتزام',name,obligationStatusOptions(stage),selected)}
  <p class="thukhr-status-explain" data-mode="${safe(selected)}" role="status" aria-live="polite">${safe(obligationStatusExplanation(selected))}</p>
 </div>`;
}
function wireObligationStatusExplanations(){
 const root=$('modalContent');
 if(!root)return;
 for(const node of root.querySelectorAll('.thukhr-status-choice')){
  const selectNode=node.querySelector('select'),hint=node.querySelector('.thukhr-status-explain');
  if(!selectNode||!hint)continue;
  const refresh=()=>{hint.textContent=obligationStatusExplanation(selectNode.value);hint.dataset.mode=selectNode.value;};
  selectNode.addEventListener('change',refresh);
  refresh();
 }
}
