/* وين راحت؟ — app/monthly-fields.js
 * Monthly fixed-commitment fields: definitions, editing, hiding, restoring and deleting.
 * Classic script: shares the global scope with the other app/*.js files, loaded in the order listed in index.html. */
'use strict';
let wfMonth=today().slice(0,7);
const LEGACY_WF_FIELDS=[
 {key:'hyper',label:'الهايبر ماركت',stage:'incentives',reserveOnly:false},
 {key:'housing',label:'الإسكان',stage:'incentives',reserveOnly:false},
 {key:'workLoan',label:'سلفة الدوام (كامل القسط الشهري)',stage:'split',reserveOnly:false},
 {key:'internet',label:'الإنترنت',stage:'incentives',reserveOnly:true},
 {key:'generator',label:'المولّدة',stage:'salary',reserveOnly:true},
 {key:'bankLoan',label:'سلفة المصرف',stage:'salary',reserveOnly:true}
];
function monthlyFields(st=state){
 if(Array.isArray(st.settings.wfFields))return st.settings.wfFields;
 // Compatibility for historical accounts with financial use of the original fields.
 const legacy=LEGACY_WF_FIELDS;
 const keys=new Set(legacy.map(f=>f.key));
 const plans=st.settings.twoStageWorkflow?.plans||{};
 const used=Object.values(plans).some(p=>Object.keys(p||{}).some(key=>keys.has(key)))||
  st.obligations.some(o=>legacy.some(f=>o.id.startsWith('wf_'+f.key+'_')));
 return used?legacy:[];
}
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
function fixedCommitmentEdit(key=''){
 if(state.demo)throw Error('ابدأ حسابك الفعلي أولاً.');
 if(wfMonth!==today().slice(0,7)||state.settings.closedMonths?.[wfMonth])
  throw Error('يمكن تعديل الثوابت للشهر الجاري المفتوح فقط.');
 const item=key?monthlyFields().find(o=>o.key===key):null;
 if(key&&!item)throw Error('الالتزام غير موجود.');
 if(!item&&monthlyFields().length>=16)throw Error('الحد الأقصى 16 التزاماً.');
 const locked=!!(item&&state.obligations.some(o=>o.id.startsWith('wf_'+item.key+'_')));
 const current=wfPlan()?.[key]||0,onlySalary=wfIncomeMode()==='salary-only';
 const stageOptions=onlySalary?[['salary','الراتب']]:[['salary','الراتب'],['incentives','الحافز'],['split','نصف من كل دفعة']];
 modal(item?'تعديل الثابت':'إضافة التزام ثابت',
 'حدد القيمة ومصدر السداد، وسيتم الخصم عند تسجيل استلام الدفعة فعلياً.',
 `<div class="form-grid">
 ${field('اسم الالتزام','fixedName','text',item?.label||'','required maxlength="45" placeholder="مثلاً قسط المصرف"')}
 ${moneyField('قيمة الالتزام الشهري','fixedAmount',inputMoney(current),'required')}
 ${locked?`<div class="field"><label>مصدر الخصم</label><p class="wf-help">${safe(monthlyFieldStageLabel(item))} · مثبت لحماية سجل سابق</p></div>`:
 select('يخصم من','fixedStage',stageOptions,onlySalary?'salary':item?.stage||'salary')}
 ${select('حساب الخصم','fixedMethod',[['receipt','نفس حساب استلام الراتب أو الحافز'],['card','البطاقة'],['cash','النقد']],item?.autoMethod||'receipt')}
 <div class="field full"><label><input type="checkbox" name="autoDeduct" value="yes" ${item?.autoDeduct===false?'':'checked'}> خصم تلقائي عند تسجيل استلام الدفعة، بدون تأكيد سداد إضافي</label></div>
 </div>
 <div class="notice warn">الخصم التلقائي يُسجّل سداداً في دفتر «وين راحت؟» ويخفض رصيد الحساب المحدد؛ لا يجري تحويلاً مصرفياً. إذا كان القسط مستقطعاً من الراتب قبل إيداع الصافي، أوقف الخصم الآلي حتى لا يُحسب مرتين.</div>
 <div class="notice">إذا كانت الدفعة المستهدفة مسجلة سابقاً لهذا الشهر، يُنفّذ الخصم الآلي عند حفظ هذا الالتزام إن كان الرصيد يكفي. وإلا يبقى المبلغ غير مغطى، دون حساب سالب.</div>`,
 f=>act(n=>{
  const label=String(f.fixedName||'').trim().replace(/\s+/g,' ');
  if(label.length<2||label.length>45||/[<>]/.test(label))throw Error('اسم الالتزام غير صالح.');
  const value=amount(f.fixedAmount),stage=locked?item.stage:f.fixedStage;
  if(!['salary','incentives','split'].includes(stage)||(onlySalary&&stage!=='salary'))
   throw Error('اختر مصدر خصم متوافقاً مع نظام دخلك.');
  if(!['receipt','cash','card'].includes(f.fixedMethod))throw Error('حساب الخصم غير صالح.');
  if(monthlyAllFields(n).some(o=>o.key!==key&&o.label.trim().toLowerCase()===label.toLowerCase()))
   throw Error('يوجد التزام بهذا الاسم.');
  if(['salary','incentives'].some(stage=>
   wfData(n).completed?.[wfMonth]?.[stage]&&wfData(n).completed[wfMonth][stage].mode!=='automatic'))
   throw Error('تم اعتماد تسوية يدوية لهذا الشهر؛ لا يمكن تغيير بنوده.');
  const registered=key?n.obligations.find(o=>o.id===wfObId(wfMonth,key)):null;
  if(registered&&registered.amount!==value)
   throw Error('لهذا الالتزام حركة سداد أو حجز سابقة؛ لا يمكن تغيير مبلغه الحالي. عدّل مبلغ الشهر التالي بدلاً من ذلك.');
  const fields=monthlyFields(n).map(o=>({...o}));
  let field=fields.find(o=>o.key===key);
  if(!field){
   const id='item_'+uid().replace(/[^A-Za-z0-9_-]/g,'').slice(0,30);
   field={key:id,label,stage,reserveOnly:false};fields.push(field);
  }
  field.label=label;field.stage=stage;field.autoDeduct=f.autoDeduct==='yes';
  field.autoMethod=f.fixedMethod;n.settings.wfFields=fields;
  const wf=wfData(n);
  n.settings.twoStageWorkflow={...wf,plans:{...wf.plans,
   [wfMonth]:{...(wf.plans?.[wfMonth]||{}),[field.key]:value}},completed:{...wf.completed}};
  wfFreezeIncomeMode(n,wfMonth);
  if(field.autoDeduct===true){
   for(const stageName of ['incentives','salary']){
    const rec=S.receipts(n,stageName,wfMonth);
    if(rec.length===1&&(!wfData(n).completed?.[wfMonth]?.[stageName]||wfData(n).completed[wfMonth][stageName].mode==='automatic'))
     n=autoFixedSettlement(n,stageName,wfMonth,rec[0].method,rec[0].date).next;
   }
  }
  return n;
 },'تم حفظ الالتزام وتوجيه الخصم الآلي إلى الدفعة المحددة.'),'حفظ الالتزام');
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
  <p class="wf-help">إذا اخترت «النصفين»، أدخل المبلغ كاملاً، ويقسمه التطبيق بين الدفعتين. البنود الجديدة تُضبط على خصم تلقائي عند تسجيل استلام الدخل؛ تقدر تغيّرها من «الثوابت والالتزامات».</p>`,
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
     reserveOnly:false,autoDeduct:true,autoMethod:'receipt'});
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
