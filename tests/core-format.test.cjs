'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const F=require('../src/core/format.js');

test('amounts parse from Latin and Arabic digits into integer minor units',()=>{
 assert.equal(F.parseAmount('35,000'),35000);
 assert.equal(F.parseAmount('٣٥٬٠٠٠'),35000);
 assert.equal(F.parseAmount('12.5',2),1250);
 assert.equal(F.parseAmount('0',0,{allowZero:true}),0);
 assert.throws(()=>F.parseAmount('0'),/أكبر من صفر/);
 assert.throws(()=>F.parseAmount('12.5',0),/كسور/);
 assert.throws(()=>F.parseAmount('abc'),/مبلغاً صحيحاً/);
 assert.throws(()=>F.parseAmount('1,23'),/مبلغاً صحيحاً/,'grouping must be in threes');
});

test('amounts format with grouping, optional Arabic digits and a true minus sign',()=>{
 assert.equal(F.formatAmount(1250000),'1,250,000');
 assert.equal(F.formatAmount(1250000,0,'ar'),'١٬٢٥٠٬٠٠٠');
 assert.equal(F.formatAmount(1250,2),'12.5');
 assert.equal(F.formatAmount(-500),'−500');
 assert.equal(F.amountInputValue(1250,2),'12.5');
 assert.equal(F.amountInputValue(0),'');
});

test('dates validate and move by days across month and year ends',()=>{
 assert.ok(F.isDate('2026-02-28'));assert.ok(!F.isDate('2026-02-30'));assert.ok(!F.isDate('2026-2-3'));
 assert.equal(F.addDays('2026-12-31',1),'2027-01-01');
 assert.equal(F.addDays('2026-03-01',-1),'2026-02-28');
 assert.equal(F.daysBetween('2026-01-30','2026-02-02'),3);
});

test('a calendar month is the default financial month',()=>{
 assert.deepEqual(F.periodByKey('2026-02',1),{key:'2026-02',start:'2026-02-01',end:'2026-02-28',days:28});
 assert.equal(F.periodFor('2026-11-03',1).key,'2026-11');
 assert.equal(F.periodLabel('2026-11',1),'تشرين الثاني 2026');
});

test('a financial month can start on a chosen day',()=>{
 const p=F.periodByKey('2026-10',23);
 assert.equal(p.start,'2026-10-23');assert.equal(p.end,'2026-11-22');assert.equal(p.days,31);
 assert.equal(F.periodFor('2026-11-22',23).key,'2026-10','the day before the start day belongs to the previous month');
 assert.equal(F.periodFor('2026-11-23',23).key,'2026-11');
 assert.equal(F.periodFor('2026-01-05',23).key,'2025-12','January before the start day belongs to December');
 assert.equal(F.periodByKey('2026-12',23).end,'2027-01-22');
 assert.equal(F.periodLabel('2026-10',23),'23 تشرين الأول – 22 تشرين الثاني 2026');
 assert.equal(F.periodLabel('2026-12',23),'23 كانون الأول 2026 – 22 كانون الثاني 2027');
 assert.equal(F.periodTitle('2026-10',23),'تشرين الثاني 2026','titled by the month holding most of its days');
});

test('the start day is limited to 1–28 so every month has it',()=>{
 assert.equal(F.clampDay(31),28);assert.equal(F.clampDay(0),1);assert.equal(F.clampDay('7'),7);
 assert.equal(F.shiftKey('2026-01',-1),'2025-12');assert.equal(F.shiftKey('2026-12',1),'2027-01');
});

test('relative day labels',()=>{
 assert.equal(F.dateLabel('2026-11-03',{relativeTo:'2026-11-03'}),'اليوم');
 assert.equal(F.dateLabel('2026-11-02',{relativeTo:'2026-11-03'}),'أمس');
 assert.equal(F.dateLabel('2026-10-20',{relativeTo:'2026-11-03'}),'20 تشرين الأول');
});
