/* وين راحت؟ — app/backup.js
 * Confirmations, downloads, rolling local snapshots, integrity hashes, backup and CSV export.
 * Classic script: shares the global scope with the other app/*.js files, loaded in the order listed in index.html. */
'use strict';
function confirmModal(title,text,yes,label='تأكيد'){modal(title,'',`<p class="help-text">${safe(text)}</p>`,()=>{closeModal();yes()},label)}
function download(name,data,type='application/json'){const blob=new Blob([data],{type:type+';charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
const ROLLING_BACKUP_KEY='thukhr-rolling-backup-v1:';
function localSnapshots(){
 try{const rows=JSON.parse(localStorage.getItem(ROLLING_BACKUP_KEY+KEY)||'[]');
 return Array.isArray(rows)?rows.slice(0,3):[]}catch{return []}
}
function keepLocalSnapshot(oldState){
 if(!oldState||oldState.demo||!oldState.transactions?.length)return;
 const previous=localSnapshots();
 if(previous[0]?.date===today())return;
 try{
  const item={date:today(),savedAt:new Date().toISOString(),content:JSON.stringify(oldState)};
  localStorage.setItem(ROLLING_BACKUP_KEY+KEY,JSON.stringify([item,...previous].slice(0,3)));
 }catch(e){console.warn('تعذر حفظ نسخة استرجاع محلية؛ نزّل JSON يدوياً.',e)}
}
function localSnapshotsPanel(){
 const snaps=localSnapshots();
 return `<section class="panel">${section('نسخ الاسترجاع المحلية','حتى ثلاث نسخ من أيام مختلفة إذا توفرت مساحة التخزين.')}
 <div class="notice warn">هذه النسخ على جهازك فقط؛ حذف بيانات الموقع يحذفها. نزّل ملف JSON خارج الهاتف دورياً.</div>
 ${snaps.length?snaps.map((x,i)=>`<div class="keyval"><span>نسخة ${safe(x.date)}</span>
 <button type="button" class="btn secondary small" data-action="rolling-download" data-id="${i}">تنزيل نسخة</button></div>`).join(''):'<p class="help-text">لا توجد نسخ محلية بعد. ستُحفظ نسخة قبل أول تعديل يومي للسجل.</p>'}
 </section>`;
}
function downloadRollingBackup(index){
 const item=localSnapshots()[Number(index)];
 if(!item)throw Error('نسخة الاسترجاع غير متاحة.');
 const object=JSON.parse(item.content);E.validate(object);
 download('thukhr-'+activeProfile+'-snapshot-'+item.date+'.json',JSON.stringify(object,null,2));
}
async function backupSha256(serialized){
 if(!crypto.subtle)throw Error('المتصفح لا يدعم بصمة SHA-256.');
 const bytes=new TextEncoder().encode(serialized);
 const checksum=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(checksum)].map(n=>n.toString(16).padStart(2,'0')).join('');
}

async function backup(){
 try{
  E.validate(state);
  const clean=structuredClone(state);delete clean.backupIntegrity;
  const checksum=await backupSha256(JSON.stringify(clean));
  download('thukhr-'+activeProfile+'-'+today()+'.json',
   JSON.stringify({...clean,backupIntegrity:{algorithm:'SHA-256',digest:checksum}},null,2));
  try{localStorage.setItem('thukhr-last-backup-'+activeProfile,today())}catch{}
  toast('تم تنزيل JSON ببصمة تحقق؛ احتفظ بها خارج جهازك.');
 }catch(e){showError('تعذر إنشاء نسخة محققة: '+e.message)}
}
function exportCsv(){const rows=[['التاريخ','العملية','التفاصيل','المبلغ','العملة','الحساب','الملاحظة','مصدر الدخل','شهر الاستحقاق'],...state.transactions.map(t=>[t.date,...txLabel(t).slice(0,2),inputMoney(t.amount),state.settings.currency,t.method||'داخلي',t.note||'',t.sourceName||'',t.incomePeriod||''])];const clean=v=>{let s=String(v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};download(`mizan-ledger-${today()}.csv`,'\uFEFF'+rows.map(r=>r.map(clean).join(',')).join('\r\n'),'text/csv')}
