/* فِرزة — app/smart-cycle.js
 * Smart cycle wizard: allocation, automatic fixed commitments, review, workflow page and apply.
 * Classic script: shares the global scope with the other app/*.js files, loaded in the order listed in index.html. */
'use strict';
function smartAllocate(d){
 const all=monthlyAllFields(),visible=monthlyFields(),locked=Boolean(wfDone('incentives')||wfDone('salary'));
 const planRows=visible.map(o=>locked?`<div class="smart-row"><b>${safe(o.label)}</b><b>${money(d.plan[o.key]||0)}</b></div>`:
 moneyField(o.label,'plan-'+o.key,inputMoney(d.plan[o.key]||0),'required')).join('');
 const seed=Object.fromEntries(all.map(o=>[o.key,Math.max(2,d.plan[o.key]||0)]));
 const potential=wfAmount(seed,d.stage).filter(o=>!all.some(f=>f.key===o.key&&f.autoDeduct===true));
 const settlement=potential.map(o=>`<div class="smart-row"><div><b>${safe(o.label)}</b><small>المبلغ يُحسب من خطة الشهر عند المراجعة النهائية</small></div>
 ${obligationStatusSelect('mode-'+o.key,d.choices[o.key]||DEFAULT_OBLIGATION_STATUS,d.stage)}</div>`).join('');
 const budget=livingCategories().map(w=>moneyField(w.label,'living-'+w.id,inputMoney(d.targets[w.id]||0),'required')).join('');
 modal('الدورة الذكية · 2 من 3','يمكن تغيير المقترحات؛ كل مبلغ يبقى تحت مراجعتك.',
 `<div class="smart-steps"><b>1 · الدخل</b><b>2 · التسوية والميزانية</b><span>3 · المراجعة</span></div>
 <h3>الالتزامات الشهرية</h3><div class="smart-grid">${planRows||'<p class="wf-help">لا توجد بنود حالياً؛ لا تُنشأ حجوزات.</p>'}</div>
 <h3>حالة الالتزام (للبنود اليدوية فقط)</h3><p class="wf-help">«دفعته فعلياً» هي الحالة الافتراضية الثابتة عند فتح النموذج، ولا تعني أن الدفع حدث مسبقاً. إذا لم تدفع البند فغيّر حالته إلى الحجز أو الاستقطاع قبل الاعتماد.</p>${settlement||'<p class="wf-help">لا توجد استقطاعات لهذه الدفعة.</p>'}
 ${select('دفعت فعلياً من','payMethod',methodOptions,d.payMethod)}
 <h3>ميزانية المعيشة</h3><p class="wf-help">حدد السقوف الثابتة التي تحتاجها، حتى لو تجاوزت المتاح. سيحفظها فِرزة دون إنشاء رصيد وهمي؛ ويمكن تمويل النقص لاحقاً عبر «أخرى» في المعيشة.</p>
 <div class="smart-grid">${budget||'<p class="wf-help">لا توجد أقسام معيشة.</p>'}</div>`,
 f=>{
  if(!locked)for(const o of visible)d.plan[o.key]=amount(f['plan-'+o.key],true);
  d.payMethod=f.payMethod;if(!['cash','card'].includes(d.payMethod))throw Error('طريقة السداد غير صالحة.');
  for(const w of livingCategories())d.targets[w.id]=amount(f['living-'+w.id],true);
  const valid=new Set(['reserve','pay','withheld']);
  for(const o of wfAmount(d.plan,d.stage).filter(o=>o.amount>0&&!monthlyAllFields().some(f=>f.key===o.key&&f.autoDeduct===true))){
   const mode=f['mode-'+o.key]||d.choices[o.key]||DEFAULT_OBLIGATION_STATUS;
   if(!valid.has(mode))throw Error('اختر حالة كل استقطاع.');
   d.choices[o.key]=mode;
  }
  smartReview(d);
 },'التالي · عرض النتيجة');
 wireObligationStatusExplanations();
 $('modalForm').insertAdjacentHTML('beforeend','<button type="button" class="btn secondary smart-back" id="smartBack">السابق · الدخل</button>');
 $('smartBack').onclick=()=>smartIncome(d);
}

function fundLivingTargets(n,targets,month,notePrefix='ميزانية المعيشة'){
 const needs=livingNeeds(targets,n,month),available=E.stats(n).unallocated;
 const shortfall=Math.max(0,needs.additional-available);
 if(shortfall)return {next:n,allocated:0,pending:needs.additional,shortfall};
 let next=n;
 for(const row of needs.rows){
  if(!row.additional)continue;
  if(!next.wallets.some(w=>w.id===row.id)){
   const w=livingCategories(next).find(x=>x.id===row.id);
   if(!w)throw Error('قسم المصروف غير موجود: '+row.label);
   next.wallets.push({id:w.id,name:w.label,kind:w.kind,color:w.color,weight:0});
  }
  next=commitEvent(next,{type:'allocate',walletId:row.id,amount:row.additional,date:today(),
   note:notePrefix+' '+month+' · '+row.label});
 }
 return {next,allocated:needs.additional,pending:0,shortfall:0};
}
function autoFixedPlanShare(field,stage,month,st){
 const mode=wfIncomeMode(month,st),plan=wfData(st).plans?.[month]||{};
 const full=Number(plan[field.key]||0);
 if(!Number.isSafeInteger(full)||full<=0)return 0;
 if(mode==='salary-only')return stage==='salary'?full:0;
 if(field.stage==='split')return stage==='incentives'?Math.floor(full/2):full-Math.floor(full/2);
 return field.stage===stage?full:0;
}
function ensureRecurringAutoPlan(st,month){
 const wf=wfData(st),current=wf.plans?.[month]||null;
 const months=Object.keys(wf.plans||{}).filter(m=>m<month).sort().reverse();
 const prev=wf.plans?.[months[0]]||{};
 const additions=Object.fromEntries(monthlyAllFields(st).filter(f=>f.autoDeduct===true&&
  !Object.prototype.hasOwnProperty.call(current||{},f.key)&&Number.isSafeInteger(prev[f.key])&&prev[f.key]>0)
  .map(f=>[f.key,prev[f.key]]));
 if(!Object.keys(additions).length)return st;
 st.settings.twoStageWorkflow={...wf,plans:{...wf.plans,[month]:{...additions,...current}},completed:{...wf.completed}};
 return st;
}
function autoFixedSettlement(original,stage,month,method,date){
 if(!['salary','incentives'].includes(stage))return {next:original,paid:0,skipped:[]};
 if(!['card','cash'].includes(method))throw Error('حساب خصم الالتزامات غير صالح.');
 if(original.settings.closedMonths?.[month])return {next:original,paid:0,skipped:[]};
 if(wfData(original).completed?.[month]?.[stage]&&wfData(original).completed[month][stage].mode!=='automatic')return {next:original,paid:0,skipped:[]};
 if(wfIncomeMode(month,original)==='salary-only'&&stage==='incentives')
  return {next:original,paid:0,skipped:[]};
 // Only opt-in fields are carried from a prior monthly plan and settled automatically.
 let next=ensureRecurringAutoPlan(original,month),paid=0;
 const all=monthlyAllFields(next).filter(f=>f.autoDeduct===true);
 const skipped=[],processed=[];
 for(const field of all){
  const part=autoFixedPlanShare(field,stage,month,next);
  if(part<=0)continue;
  const paymentMethod=['cash','card'].includes(field.autoMethod)?field.autoMethod:method;
  const id=wfObId(month,field.key),plan=wfData(next).plans?.[month]||{},full=Number(plan[field.key]||0);
  const o=next.obligations.find(x=>x.id===id);
  if(o?.archived||o&&o.amount!==full){skipped.push({label:field.label,reason:'سجل الالتزام مختلف أو مؤرشف'});continue}
  const stats=E.stats(next);
  const paidSoFar=(stats.paid[id]||0)+(stats.withheld?.[id]||0);
  const stageMemo='خصم تلقائي من '+(stage==='salary'?'الراتب':'الحوافز')+' · '+month+' · ';
  const paidForStage=next.transactions.filter(t=>t.type==='pay'&&t.obligationId===id&&
   typeof t.note==='string'&&t.note.startsWith(stageMemo)).reduce((sum,t)=>sum+t.amount,0);
  // The same split obligation can be settled in either income arrival order.
  const due=Math.max(0,Math.min(part-paidForStage,full-paidSoFar));
  if(!due)continue;
  const reserved=stats.reserved[id]||0;
  const extra=Math.max(0,due-reserved);
  if(extra>stats.unallocated||due>stats[paymentMethod]){
   skipped.push({label:field.label,amount:due,reason:'الرصيد غير المحجوز أو حساب الدفع لا يكفي'});
   continue;
  }
  if(!o)next.obligations.push({id,name:field.label,amount:full,due:date,recurring:false});
  if(extra)next=commitEvent(next,{type:'reserve',date,obligationId:id,amount:extra,
   note:'حجز آلي تمهيداً لسداد '+field.label+' · '+month});
  next=commitEvent(next,{type:'pay',date,obligationId:id,amount:due,method:paymentMethod,
   note:'خصم تلقائي من '+(stage==='salary'?'الراتب':'الحوافز')+' · '+month+' · '+field.label});
  paid+=due;processed.push({key:field.key,amount:due});
 }
 // Do not auto-mark a stage completed when other manually settled fields remain.
 const fields=monthlyAllFields(next).filter(f=>autoFixedPlanShare(f,stage,month,next)>0);
 const allAuto=fields.length>0&&fields.every(f=>f.autoDeduct===true);
 const allCovered=fields.every(f=>{
  const id=wfObId(month,f.key),stat=E.stats(next);
  const full=Number(wfData(next).plans?.[month]?.[f.key]||0);
  if((stat.paid[id]||0)+(stat.withheld?.[id]||0)>=full)return true;
  const stageMemo='خصم تلقائي من '+(stage==='salary'?'الراتب':'الحوافز')+' · '+month+' · ';
  const sourcePaid=next.transactions.filter(t=>t.type==='pay'&&t.obligationId===id&&
   typeof t.note==='string'&&t.note.startsWith(stageMemo)).reduce((sum,t)=>sum+t.amount,0);
  return sourcePaid>=autoFixedPlanShare(f,stage,month,next);
 });
 if(allAuto&&allCovered){
  const wf=wfData(next);
  next.settings.twoStageWorkflow={...wf,completed:{...wf.completed,
   [month]:{...wf.completed?.[month],[stage]:{mode:'automatic',at:date,
    total:(wf.completed?.[month]?.[stage]?.total||0)+paid,
    summary:{withheld:0,reserved:0,paid:(wf.completed?.[month]?.[stage]?.summary?.paid||0)+paid},
    decisions:{...(wf.completed?.[month]?.[stage]?.decisions||{}),...Object.fromEntries(processed.map(p=>[p.key,'pay']))}}}}};
 }
 E.validate(next);
 return {next,paid,skipped,processed};
}

function smartBuild(original,d){
 if(JSON.stringify(original)!==d.base)throw Error('تغيّرت البيانات أثناء إعداد الدورة. أغلق المعالج وافتحه من جديد.');
 if(original.demo||original.settings.closedMonths?.[d.month]||d.month!==today().slice(0,7)||
   d.stage!==smartStage()||d.mode!==wfIncomeMode())throw Error('مرحلة الشهر تغيّرت.');
 if(wfData(original).completed?.[d.month]?.[d.stage])throw Error('هذه الدفعة معتمدة مسبقاً.');
 if(d.stage==='salary'&&d.mode==='both'&&!wfDone('incentives'))throw Error('اعتمد الحوافز أولاً.');
 let n=structuredClone(original),before=E.stats(n);
 const totals={income:0,withheld:0,paid:0,reserved:0,living:0};
 const rec=S.receipts(n,d.stage,d.month);
 if(d.existing){if(rec.length!==1||rec[0].amount!==d.income)throw Error('تغيّر استلام هذه الدفعة.');}
 else{
  if(rec.length)throw Error('الدخل مسجّل سابقاً.');
  n=commitEvent(n,{type:'income',sourceId:d.stage,sourceName:d.stage==='salary'?'الراتب':'الحوافز',incomePeriod:d.month,
   amount:d.income,method:d.method,date:d.date,note:'الدخل المستلم · الدورة الذكية'});
  totals.income=d.income;
 }
 const wf=wfData(n),oldPlan=wf.plans?.[d.month],fixed=Boolean(wf.completed?.[d.month]?.incentives||wf.completed?.[d.month]?.salary);
 if(fixed&&JSON.stringify(oldPlan||{})!==JSON.stringify(d.plan))throw Error('لا يمكن تغيير خطة بدأت تسويتها.');
 if(!fixed){
  n.settings.twoStageWorkflow={...wf,plans:{...wf.plans,[d.month]:{...d.plan}},completed:{...wf.completed}};
  n.settings.wfIncomeModes={...(n.settings.wfIncomeModes||{}),[d.month]:d.mode};
 }
 const auto=autoFixedSettlement(n,d.stage,d.month,d.payMethod,d.date);
 if(auto.skipped.length)throw Error('تعذر سداد التزامات مفعّل لها الخصم الآلي: '+auto.skipped.map(x=>x.label).join('، ')+'. أضف المبلغ الناقص أو غيّر إعداد السداد من الثوابت.');
 n=auto.next;totals.paid+=auto.paid;
 const rows=wfAmount(d.plan,d.stage).filter(o=>o.amount>0&&!monthlyAllFields().some(f=>f.key===o.key&&f.autoDeduct===true));
 for(const o of rows){
  const mode=d.choices[o.key],id=wfObId(d.month,o.key);
  if(!['withheld','reserve','pay'].includes(mode))throw Error('حالة التزام غير محددة.');
  const existing=n.obligations.find(x=>x.id===id);
  if(!existing)n.obligations.push({id,name:o.label.replace(' (مخفي)',''),amount:o.fullAmount,due:today(),recurring:false});
  else if(existing.amount!==o.fullAmount)throw Error('تغيّر مبلغ التزام '+o.label+'.');
  const note='الدورة الذكية · '+d.month+' · '+o.label;
  if(mode==='withheld'){
   n=commitEvent(n,{type:'withheld',date:today(),obligationId:id,amount:o.amount,note:'استقطاع قبل الإيداع · '+note});
   totals.withheld+=o.amount;
  }else{
   n=commitEvent(n,{type:'reserve',date:today(),obligationId:id,amount:o.amount,note:'حجز · '+note});
   if(mode==='pay'){
    n=commitEvent(n,{type:'pay',date:today(),obligationId:id,amount:o.amount,method:d.payMethod,note:'سداد بعد الاستلام · '+note});
    totals.paid+=o.amount;
   }else totals.reserved+=o.amount;
  }
 }
 const funding=fundLivingTargets(n,d.targets,d.month,'ميزانية الدورة الذكية');
 n=funding.next;
 totals.living=funding.allocated;
 n.settings.livingTargets={...(n.settings.livingTargets||{}),[d.month]:{...livingTargets(d.month,n),...d.targets}};
 const updated=wfData(n);
 n.settings.twoStageWorkflow={...updated,completed:{...updated.completed,[d.month]:{...updated.completed?.[d.month],
  [d.stage]:{mode:'smart',at:today(),total:rows.reduce((v,o)=>v+o.amount,0),
   summary:{withheld:totals.withheld,paid:totals.paid,reserved:totals.reserved},decisions:{...d.choices}}}}};
 E.validate(n);
 return {next:n,before,after:E.stats(n),totals,funding,events:n.transactions.length-original.transactions.length};
}

function smartReview(d){
 const r=smartBuild(state,d),t=r.totals,projection=monthlyCommitmentProjection(r.next,d.month);
 const line=(name,value)=>`<div class="smart-review-row"><span>${name}</span><strong>${money(value)}</strong></div>`;
 modal('الدورة الذكية · 3 من 3','مراجعة نهائية قبل أي حفظ.',
 `<div class="smart-steps"><b>1 · الدخل</b><b>2 · التسوية والميزانية</b><b>3 · المراجعة</b></div>
 <div class="smart-review">
 ${line('الرصيد الحالي',r.before.total)}
 ${line(d.existing?'دخل مسجل سابقاً (لن يضاف مرة ثانية)':'دخل جديد',d.existing?d.income:t.income)}
 ${line('استقطاعات قبل الإيداع (توثيق فقط)',t.withheld)}
 ${line('سداد فعلي',t.paid)}${line('حجوزات جديدة',t.reserved)}
 ${line('ميزانية المعيشة المخططة',Object.values(d.targets).reduce((a,v)=>a+(v||0),0))}
 ${line('التخصيص الفعلي الآن',t.living)}
 ${r.funding.pending?line('تخصيص مؤجل بانتظار التمويل',r.funding.pending):''}
 ${r.funding.shortfall?line('نقص التمويل الحالي',r.funding.shortfall):''}
 <hr>${line('البطاقة بعد الاعتماد',r.after.card)}
 ${line('النقد بعد الاعتماد',r.after.cash)}
 ${line('الرصيد الكلي بعد الاعتماد',r.after.total)}
 ${line('المحجوز بعد الاعتماد',Object.values(r.after.reserved).reduce((sum,v)=>sum+v,0))}
 ${line('المتبقي بعد التسوية والتخصيص',r.after.unallocated)}
 ${line('التزامات شهرية لم تُغطَّ بعد',projection.uncovered)}
 ${line('مجموع الالتزامات الثابتة',projection.plannedTotal)}
 ${line('مجموع ميزانية المعيشة',projection.livingTotal)}
 ${line('إجمالي المطلوب لهذا الشهر',projection.combinedTotal)}
 ${line('المتبقي التخطيطي بعد الثوابت والمعيشة',projection.grossAfterAll)}
 ${line('الحر بعد تغطية غير المغطى فقط',projection.remainingAfter)}
 </div>
 <p class="wf-help">${r.funding.shortfall?'ستُحفظ سقوف المعيشة كاملة دون تخصيصها الآن. بعد استلام مصدر آخر من صفحة المصروف، اضغط «استكمال التمويل».':'خطة المصروف قابلة للتمويل الآن. لا يُخصم التخصيص من البطاقة أو النقد.'} عدد القيود الجديدة: ${r.events}. إذا تعذّر تنفيذ أحدها تُرفض الدورة كلها، ولا تُحفظ أي خطوة جزئية.</p>
 <div class="field"><label><input type="checkbox" name="confirm" value="yes" required> راجعت المدفوعات الفعلية والحجوزات والاستقطاعات وأوافق على تسجيلها كما تظهر أعلاه.</label></div>`,
 f=>{if(f.confirm!=='yes')throw Error('تأكيد المراجعة إلزامي.');
  act(n=>smartBuild(n,d).next,'تم اعتماد الدورة المالية كاملة بحفظ واحد');},'اعتماد الدورة بالكامل');
 $('modalForm').insertAdjacentHTML('beforeend','<button type="button" class="btn secondary smart-back" id="smartBack">السابق · التسوية</button>');
 $('smartBack').onclick=()=>smartAllocate(d);
}

function workflowSettlementSnapshot(st=state,month=wfMonth){
 const stats=E.stats(st);
 const reserved=Object.values(stats.reserved).reduce((sum,value)=>sum+value,0);
 const allocated=Object.values(stats.wallets).reduce((sum,value)=>sum+value,0);
 const settlement=wfData(st).completed?.[month]||{};
 const completed=wfIncomeMode(month,st)==='salary-only'?Boolean(settlement.salary):
  Boolean(settlement.salary&&settlement.incentives);
 return {total:stats.total,remaining:stats.unallocated,reserved,allocated,completed};
}
function monthlyCommitmentProjection(st=state,month=wfMonth){
 const stats=E.stats(st),plan=wfData(st).plans?.[month]||null;
 const entries=[],seen=new Set(),byId=new Map(st.obligations.map(o=>[o.id,o]));
 const labels=new Map(monthlyAllFields(st).map(f=>[f.key,f.label]));
 const add=(id,label,amount)=>{
  const due=Number(amount);
  if(!Number.isSafeInteger(due)||due<=0)return;
  const reserved=Math.max(0,stats.reserved[id]||0);
  const paid=Math.max(0,stats.paid[id]||0);
  const withheld=Math.max(0,stats.withheld?.[id]||0);
  const covered=Math.min(due,reserved+paid+withheld);
  entries.push({id,label,amount:due,covered,uncovered:Math.max(0,due-covered)});
  seen.add(id);
 };
 // Plan values include obligations that have not reached settlement and do not
 // yet have a dedicated journal obligation record.
 for(const [key,planned] of Object.entries(plan||{})){
  const id=wfObId(month,key),registered=byId.get(id);
  if(registered?.archived)continue;
  add(id,registered?.name||labels.get(key)||key,registered?.amount??planned);
 }
 // A separately created commitment due this month is counted once, even when
 // it overlaps with the plan's generated obligation ID.
 for(const o of st.obligations){
  if(o.archived||seen.has(o.id)||typeof o.due!=='string'||o.due.slice(0,7)!==month)continue;
  add(o.id,o.name,o.amount);
 }
 const uncovered=entries.reduce((sum,o)=>sum+o.uncovered,0);
 const plannedTotal=entries.reduce((sum,o)=>sum+o.amount,0),living=livingBudgetSummary(month,st);
 const combinedTotal=plannedTotal+living.total;
 // Nominal comparison, not available cash. Already paid/withheld amounts may
 // already be absent from the current account balance. No journal is modified.
 return {remainingAfter:stats.unallocated-uncovered,uncovered,
  plannedTotal,livingTotal:living.total,livingRows:living.rows,
  combinedTotal,grossAfterAll:stats.total-combinedTotal,
  count:entries.length,hasPlan:plan!==null,entries};
}
function workflowPage(){
 const plan=wfPlan(),stats=currentStats(),salaryOnly=wfIncomeMode()==='salary-only',settlement=workflowSettlementSnapshot(),projection=monthlyCommitmentProjection();
 const splitFields=monthlyAllFields().filter(o=>o.stage==='split'&&plan&&(plan[o.key]||0)>0);
 const wfIds=plan?monthlyAllFields().map(o=>({key:o.key,id:wfObId(wfMonth,o.key),label:o.label})):[],
  settled=wfIds.filter(o=>(stats.reserved[o.id]||0)>0);
 return head('خطة الدخل الشهرية',salaryOnly?'استلام الراتب وتوزيع الالتزامات بخطوات واضحة.':'تابع استلام الحوافز والراتب وتخصيص الالتزامات.',
   state.demo?btn('wf-activate','بدء خطتي الفعلية','check'):(btn('wf-fields-manage',monthlyFields().length?'إدارة البنود':'إضافة بنود الشهر','settings','secondary')))+thukhrFamilyWelcome()+
 `<section class="wf-intro">
  <div class="wf-month"><label for="wfMonth">شهر الخطة</label><input id="wfMonth" type="month" value="${wfMonth}" max="${today().slice(0,7)}"><span class="thukhr-readable-month">${arabicMonth(wfMonth)}</span></div>
  <div class="wf-income-mode-controls"><span>نوع الدخل: <b>${salaryOnly?'راتب فقط':'راتب وحوافز'}</b></span>
   ${state.demo?'':btn('wf-income-mode','تغيير نوع الدخل','settings','secondary')}</div>
  ${wfMonth===today().slice(0,7)?`<div class="wf-settlement-result ${projection.grossAfterAll<0?'wf-gross-deficit':''}" aria-label="المتبقي التخطيطي بعد الالتزامات الشهرية">
   <div class="wf-settlement-result-head">
    <span>المتبقي التخطيطي بعد الثوابت وميزانية المعيشة</span>
    <span class="wf-settlement-result-state ${projection.grossAfterAll<0?'is-pending':'is-complete'}">${projection.grossAfterAll<0?'عجز تخطيطي':'حساب تخطيطي'}</span>
   </div>
   <strong class="wf-settlement-result-value">${money(projection.grossAfterAll)}</strong>
   <div class="wf-gross-equation">
    <span>رصيد الحساب الكلي <b>${money(settlement.total)}</b></span>
    <span>الالتزامات الثابتة <b>− ${money(projection.plannedTotal)}</b></span>
    <span>ميزانية المعيشة المحددة <b>− ${money(projection.livingTotal)}</b></span>
    <span>مجموع المطلوب للشهر <b>${money(projection.combinedTotal)}</b></span>
   </div>
   <p>هذا ناتج طرح إجمالي التزامات الشهر الثابتة وميزانية المعيشة التي حددتها من الرصيد الحالي. هو حساب تخطيطي فقط، وليس المبلغ القابل للصرف؛ فقد تكون بعض المصروفات أو الأقساط مسجلة ضمن الرصيد الفعلي مسبقاً.</p>
   ${projection.count?`<details class="wf-commitment-projection-details">
    <summary>تفاصيل الالتزامات الشهرية (${projection.count})</summary>
    <div class="wf-commitment-projection-list">${projection.entries.map(o=>`<div class="wf-commitment-projection-item">
     <span>${safe(o.label)}</span>
     <small>قيمة الالتزام ${money(o.amount)} · مسوّى أو محجوز ${money(o.covered)}</small>
     <b>غير مغطى ${money(o.uncovered)}</b>
    </div>`).join('')}</div>
   </details>`:'<small class="wf-commitment-projection-disclaimer">لا توجد التزامات ثابتة مدخلة لهذا الشهر.</small>'}
   ${projection.livingRows.length?`<details class="wf-commitment-projection-details"><summary>تفاصيل ميزانية المعيشة (${projection.livingRows.length})</summary>
    <div class="wf-commitment-projection-list">${projection.livingRows.map(o=>`<div class="wf-commitment-projection-item">
     <span>${safe(o.label)}</span><b>السقف المحدد ${money(o.amount)}</b></div>`).join('')}</div></details>`:
    '<small class="wf-commitment-projection-disclaimer">لم تُحدد ميزانية معيشة لهذا الشهر بعد.</small>'}
  </div>`:'<div class="notice">مقارنة الرصيد الحالي مع التزامات شهر سابق غير متاحة؛ راجع كشف الشهر المؤرّخ بدلاً من ذلك.</div>'}
  <div class="wf-commitment-projection" aria-label="الرصيد الحر الفعلي في السجل">
   <div class="wf-commitment-projection-head">
    <span>المتبقي الحر فعلياً بعد الحجز والتخصيص</span>
    <small>${settlement.completed?'التسوية معتمدة':'التسوية غير مكتملة'}</small>
   </div>
   <strong class="wf-commitment-projection-value">${money(settlement.remaining)}</strong>
   <p>هذا المبلغ غير الموزع في دفتر الحركات، ويختلف عن نتيجة الطرح التخطيطي أعلاه. لا يُعاد خصم المبالغ المدفوعة أو المستقطعة أو المحجوزة منه.</p>
   ${wfMonth===today().slice(0,7)&&projection.uncovered>0?`<div class="wf-commitment-projection-metrics"><span>التزامات لم تُغطَّ بعد <b>${money(projection.uncovered)}</b></span><span>الحر بعد تغطيتها نظرياً <b>${money(projection.remainingAfter)}</b></span></div>`:''}
  </div>
  <div class="wf-snapshot">
   <div><span>رصيد الحساب الحالي</span><strong>${money(settlement.total)}</strong></div>
   <div><span>مخصص للأقسام</span><strong>${money(settlement.allocated)}</strong></div>
   <div><span>محجوز للالتزامات</span><strong>${money(settlement.reserved)}</strong></div>
  </div>
 </section>
 ${state.demo?'<div class="notice warn">هذا سجل تجريبي. اضغط «بدء خطتي الفعلية» لتسجيل استلام الحوافز والراتب الحقيقيين. لا تُجرى أي حركة تلقائياً.</div>':''}
 ${!plan?'<div class="notice">ابدأ الدورة الذكية لإدخال الدخل وتسوية الالتزامات وتوزيع ميزانية المعيشة في شاشة واحدة. لا تُحفظ أي حركة قبل الاعتماد.</div>':
  salaryOnly?'':splitFields.map(o=>{const half=Math.floor(plan[o.key]/2);return `<div class="wf-parts"><span>${safe(o.label)} · المبلغ الكامل <b>${money(plan[o.key])}</b></span><span>من الحوافز <b>${money(half)}</b></span><span>من الراتب <b>${money(plan[o.key]-half)}</b></span></div>`;}).join('')}
 <section class="smart-cycle-intro"><strong>دورة الشهر بثلاث خطوات</strong><p>الدخل، ثم الالتزامات والميزانية، ثم مراجعة الأرصدة. حفظ واحد فقط بعد الاعتماد.</p>${state.demo?'':btn('smart-cycle-open','ابدأ الدورة الذكية','check')}</section>
 <details class="smart-cycle-advanced"><summary>إظهار الإجراءات التفصيلية المتقدمة</summary>
 ${state.demo?'':btn('wf-config','تحديد مبالغ الشهر','wallet','secondary')}
 ${wfStageSummary('incentives')}
 ${wfStageSummary('salary')}</details>
 <div class="wf-living-shortcut"><span>توزيع الميزانية متاح داخل الدورة الذكية؛ ولتسجيل صرف يومي افتح المصروف.</span><button type="button" class="btn" data-action="wf-living-scroll">الانتقال إلى المصروف</button></div>
 ${Object.values(stats.wallets).some(v=>v>0)?'<div class="notice">إذا كانت عندك مبالغ موزعة سابقاً على محافظ قديمة، فهي لا تُحجز مرة ثانية. تكدر ترجع جزء منها إلى المتاح بعد موافقتك. <button type="button" class="btn small secondary" data-action="wf-release">إرجاع مبلغ من محفظة قديمة</button></div>':''}
 ${settled.length?`<details class="smart-cycle-advanced"><summary>التزامات بانتظار الدفع (${settled.length})</summary><section class="wf-stage"><h2>الالتزامات المؤجلة</h2><p class="wf-help">الحجز غير السداد. اضغط «سداد» فقط عند خروج المبلغ من البطاقة أو النقد فعلياً.</p>${settled.map(o=>`<div class="wf-step"><span>${safe(o.label)} · محجوز ${money(stats.reserved[o.id])}</span><button class="btn small secondary" data-action="wf-pay" data-id="${o.id}">سداد</button></div>`).join('')}</section></details>`:''}
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
 const pendingAuto=monthlyAllFields().filter(f=>f.autoDeduct===true&&autoFixedPlanShare(f,stage,wfMonth,state)>0).filter(f=>{
  const amount=Number(wfPlan()?.[f.key]||0),id=wfObId(wfMonth,f.key),stat=E.stats(state);
  const limit=wfIncomeMode()==='both'&&f.stage==='split'&&stage==='incentives'?Math.floor(amount/2):amount;
  return (stat.paid[id]||0)+(stat.withheld?.[id]||0)<limit;
 });
 if(pendingAuto.length)throw Error('يوجد خصم آلي لم يكتمل: '+pendingAuto.map(f=>f.label).join('، ')+'. عالج الرصيد أو عطّل الخصم التلقائي قبل اعتماد بقية التسوية.');
 const ops=wfAmount(plan,stage).filter(x=>x.amount>0&&!monthlyAllFields().some(f=>f.key===x.key&&f.autoDeduct===true));
 const rows=ops.map(o=>`<div class="wf-step thukhr-settlement-row">
  <div><strong>${safe(o.label)}</strong><b>${money(o.amount)}</b></div>
  ${obligationStatusSelect('settle-'+o.key,DEFAULT_OBLIGATION_STATUS,stage)}
  </div>`).join('');
 modal('تسوية استقطاعات '+(stage==='salary'?'الراتب':'الحوافز'),
  'الحالة الافتراضية «دفعته فعلياً». صحّح حالة أي بند غير مدفوع قبل اعتماد التسوية؛ الاستقطاع السابق للإيداع لا يُخصم مرتين.',
  `<div class="wf-steps">${rows||'<div class="notice">لا توجد استقطاعات لهذه الدفعة.</div>'}</div>
  ${select('دفعت فعلياً من','method',methodOptions)}
  <div class="notice warn">تنبيه: «دفعته فعلياً» محددة افتراضياً، لكنها لا تثبت السداد. عند الاعتماد سيُخصم كل بند على هذه الحالة من البطاقة أو النقد. غيّر البنود غير المدفوعة قبل الموافقة.</div>
  <div class="field"><label><input type="checkbox" name="approve" value="yes" required> راجعت البنود، وما أبقيته على «دفعته فعلياً» مدفوع بالفعل، وأوافق على تسجيل التسوية مرة واحدة</label></div>`,
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
      next=commitEvent(next,{type:'withheld',date:today(),obligationId:id,amount:o.amount,note:'استقطاع قبل إيداع الصافي · '+note});
      summary.withheld+=o.amount;
     }else{
      next=commitEvent(next,{type:'reserve',date:today(),obligationId:id,amount:o.amount,note:'حجز · '+note});
      if(mode==='pay'){
       next=commitEvent(next,{type:'pay',date:today(),obligationId:id,amount:o.amount,method:f.method,note:'سداد بعد الاستلام · '+note});
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
 wireObligationStatusExplanations();
}
