'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const E=require('../engine.js');
const today=E.today(),authorized={category:'repair',reason:'إصلاح عاجل وضروري',confirmed:true};
const tx=(type,fields={})=>({id:E.uid(),type,date:today,amount:5000,...fields});
function setup(){
 let s=E.initial();
 s=E.commit(s,tx('income',{amount:200000,method:'card'}));
 s=E.commit(s,tx('allocate',{amount:60000,walletId:'emergency'}));
 s=E.commit(s,tx('allocate',{amount:30000,walletId:'home'}));
 return s;
}
test('ordinary emergency debit is forbidden',()=>{
 const s=setup();
 assert.throws(()=>E.commit(s,tx('expense',{walletId:'emergency',method:'card'})));
 assert.throws(()=>E.commit(s,tx('expense',{walletId:'emergency',method:'card',emergencyAuthorization:{...authorized,reason:'قصير'}})));
});
test('ordinary release and transfer out are forbidden',()=>{
 const s=setup();
 assert.throws(()=>E.commit(s,tx('release',{walletId:'emergency'})));
 assert.throws(()=>E.commit(s,tx('transfer',{from:'emergency',to:'home'})));
});
test('authorized emergency expense counts once',()=>{
 const s=E.commit(setup(),tx('expense',{walletId:'emergency',method:'card',emergencyAuthorization:authorized})),a=E.stats(s);
 assert.equal(a.card,195000); assert.equal(a.wallets.emergency,55000);assert.equal(a.expenses,5000);
 assert.equal(a.total,a.unallocated+Object.values(a.wallets).reduce((x,y)=>x+y,0));
});
test('funding reallocates rather than spending',()=>{
 const s=setup(),a=E.stats(E.commit(s,tx('transfer',{from:'home',to:'emergency'})));
 assert.equal(a.wallets.emergency,65000);assert.equal(a.total,E.stats(s).total);assert.equal(a.expenses,0);
});
test('approved release transfers back into unallocated',()=>{
 const a=E.stats(E.commit(setup(),tx('release',{walletId:'emergency',emergencyAuthorization:authorized})));
 assert.equal(a.unallocated,115000);assert.equal(a.wallets.emergency,55000);assert.equal(a.total,200000);
});
test('correction records original and rejects silent deletion',()=>{
 let s=E.commit(setup(),tx('expense',{walletId:'emergency',method:'card',emergencyAuthorization:authorized}));
 const id=s.transactions.at(-1).id;assert.throws(()=>E.remove(s,id));
 s=E.correctEmergency(s,id,'الحركة مسجلة خطأ مرتين');
 assert.equal(E.stats(s).wallets.emergency,60000);
 assert.equal(s.settings.emergencyCorrections[0].original.id,id);
});
test('existing emergency expenses remain readable without rewrite',()=>{
 const s=setup(),legacy=JSON.parse(JSON.stringify(s));delete legacy.settings.emergencyProtection;
 const old=tx('expense',{walletId:'emergency',method:'card'});legacy.transactions.push(old);E.validate(legacy);
 const next=E.commit(legacy,tx('income',{method:'card',amount:1000}));
 assert.ok(next.settings.emergencyProtection.legacyIds.includes(old.id));
 assert.deepEqual(next.transactions.at(-2),old);
 assert.throws(()=>E.commit(next,tx('expense',{walletId:'emergency',method:'card'})));
});
