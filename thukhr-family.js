/* THUKHR: private family-picture support. No upload, telemetry, sync or network. */
(function(){
 'use strict';
 const DB='thukhr-private-media-v1',STORE='pictures';
 const active=(()=>{try{return localStorage.getItem('thukhr-active-profile-v1')}catch{return null}})();
 const KEY=active&&/^p[a-z0-9]{4,25}$/i.test(active)?'family-photo-'+active:'family-photo';
 let cached=false,photoBlob=null,previewUrl='';
 function openDb(){
  return new Promise((resolve,reject)=>{
   if(!('indexedDB' in window))return reject(Error('التخزين المحلي للصور غير متاح'));
   const req=indexedDB.open(DB,1);
   req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE)};
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error||Error('تعذر فتح مخزن الصور'));
  });
 }
 async function transact(mode,write){
  const db=await openDb();
  try{return await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,mode),s=tx.objectStore(STORE);
   const q=write(s);
   q.onsuccess=()=>resolve(q.result);
   q.onerror=()=>reject(q.error||Error('تعذر حفظ الصورة'));
  })}finally{db.close()}
 }
 async function read(){return await transact('readonly',s=>s.get(KEY))}
 async function put(blob){return await transact('readwrite',s=>s.put(blob,KEY))}
 async function remove(){return await transact('readwrite',s=>s.delete(KEY))}
 function updateElements(){
  const all=document.querySelectorAll('[data-thukhr-family-photo]');
  for(const img of all){
   if(previewUrl){if(img.src!==previewUrl)img.src=previewUrl;img.style.display='block';img.alt='الصورة العائلية المحفوظة على جهازك'}
   else{img.removeAttribute('src');img.style.display='none'}
  }
  document.querySelectorAll('[data-thukhr-family-empty]').forEach(n=>{n.hidden=!!previewUrl});
  const status=document.getElementById('thukhrFamilyStatus');
  if(status)status.textContent=previewUrl?'الصورة محفوظة محلياً على هذا الجهاز فقط.':'لم تُضف صورة. يمكنك اختيارها من هاتفك.';
  const removeBtn=document.getElementById('thukhrFamilyRemove');
  if(removeBtn)removeBtn.hidden=!previewUrl;
 }
 async function sync(){
  if(!cached){try{photoBlob=await read();}catch(e){photoBlob=null}cached=true}
  if(photoBlob&&!previewUrl)previewUrl=URL.createObjectURL(photoBlob);
  updateElements();
 }
 async function resize(file){
  if(!file||!file.type.startsWith('image/'))throw Error('اختر صورة بصيغة مدعومة');
  if(file.size>15*1024*1024)throw Error('حجم الصورة يجب أن يكون أقل من 15 ميغابايت');
  const url=URL.createObjectURL(file);
  try{
   const img=new Image();img.decoding='async';
   await new Promise((ok,bad)=>{img.onload=ok;img.onerror=()=>bad(Error('تعذر قراءة الصورة'));img.src=url});
   const ratio=Math.min(1,1200/Math.max(img.naturalWidth,img.naturalHeight));
   const canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
   const ctx=canvas.getContext('2d');
   if(!ctx)throw Error('معالجة الصورة غير مدعومة');
   ctx.drawImage(img,0,0,canvas.width,canvas.height);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82));
   if(!blob)throw Error('تعذّر ضغط الصورة');
   return blob;
  }finally{URL.revokeObjectURL(url)}
 }
 document.addEventListener('change',async e=>{
  const el=e.target;if(!el||el.id!=='thukhrFamilyFile'||!el.files?.length)return;
  el.disabled=true;
  try{
   const blob=await resize(el.files[0]);
   await put(blob);
   if(previewUrl)URL.revokeObjectURL(previewUrl);
   photoBlob=blob;cached=true;previewUrl=URL.createObjectURL(blob);
   updateElements();
  }catch(err){const status=document.getElementById('thukhrFamilyStatus');if(status)status.textContent=err.message||'تعذر حفظ الصورة'}
  finally{el.value='';el.disabled=false}
 });
 document.addEventListener('click',async e=>{
  const btn=e.target.closest('#thukhrFamilyRemove');if(!btn)return;
  e.preventDefault();
  try{
   await remove();
   photoBlob=null;cached=true;
   if(previewUrl)URL.revokeObjectURL(previewUrl);
   previewUrl='';updateElements();
  }catch(err){const status=document.getElementById('thukhrFamilyStatus');if(status)status.textContent=err.message||'تعذر إزالة الصورة'}
 });
 window.ThukhrFamily={sync};
})();
