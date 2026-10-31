(function(root){
 'use strict';
 const DB='thukhr-financial-recovery-v1',STORE='snapshots';
 function openDb(){
  return new Promise((resolve,reject)=>{
   if(!root.indexedDB){reject(new Error('قاعدة النسخ المحلية غير متاحة.'));return;}
   const request=root.indexedDB.open(DB,1);
   request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});};
   request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
 }
 async function all(){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).getAll();
   req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();
  });
 }
 async function store(profile,data){
  if(!data||data.demo)return;
  const copy=JSON.parse(JSON.stringify(data));
  if(!root.FinanceEngine?.validate(copy))return;
  const list=(await all()).filter(r=>r.profile===profile).sort((a,b)=>b.at.localeCompare(a.at));
  const now=new Date(),stamp=now.toISOString(),key=profile+'|'+stamp+'|'+Math.random().toString(36).slice(2,7);
  const db=await openDb();
  await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite'),os=tx.objectStore(STORE);
   os.put({id:key,profile,at:stamp,data:copy,count:copy.transactions.length});
   for(const old of list.slice(19))os.delete(old.id);
   tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error);
  });
 }
 async function list(profile){return (await all()).filter(x=>x.profile===profile).sort((a,b)=>b.at.localeCompare(a.at)).map(x=>({id:x.id,at:x.at,count:x.count}));}
 async function get(profile,id){
  const db=await openDb();
  const value=await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(id);
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();
  });
  if(!value||value.profile!==profile)throw new Error('النسخة المطلوبة غير موجودة في هذا الملف المالي.');
  root.FinanceEngine.validate(value.data);return value.data;
 }
 root.ThukhrRecovery=Object.freeze({store,list,get});
})(window);
