'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const get=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const app=get('app.js'),css=get('thukhr-design-system.css'),index=get('index.html'),sw=get('sw.js');
const src=app.slice(app.indexOf('function obligationStatusOptions('),app.indexOf('function smartAllocate(d){'));
if(!src.startsWith('function obligationStatusOptions('))throw Error('Status helper missing.');
const select=(label,name,opts,value)=>'<select name="'+name+'">'+opts.map(([v,l])=>'<option value="'+v+'"'+(v===value?' selected':'')+'>'+l+'</option>').join('')+'</select>';
const api=new Function('select','safe',src+';return {obligationStatusOptions,obligationStatusExplanation,obligationStatusSelect,wireObligationStatusExplanations}')(select,String);
test('salary options keep exact stored accounting values',()=>{
 const all=api.obligationStatusOptions('salary');
 assert.deepEqual(all.map(([v])=>v),['reserve','withheld','pay']);
 assert.equal(all[0][1],'راح أدفعه لاحقاً');
 assert.equal(all[1][1],'انخصم من راتبي');
 assert.equal(all[2][1],'دفعته فعلياً');
});
test('incentives labels correctly name incentive withholding',()=>{
 assert.equal(api.obligationStatusOptions('incentives')[1][1],'انخصم من حوافزي');
});
test('each accounting choice explains the correct balance effect',()=>{
 assert.match(api.obligationStatusExplanation('withheld'),/ما نخصمه مرة ثانية/);
 assert.match(api.obligationStatusExplanation('pay'),/ينقص رصيد البطاقة أو النقد/);
 assert.match(api.obligationStatusExplanation('reserve'),/نحجزه من المتاح للصرف/);
});
test('the chosen value remains visible without changing its stored identifier',()=>{
 const html=api.obligationStatusSelect('mode-bankLoan','withheld','salary');
 assert.match(html,/value="withheld" selected/);
 assert.match(html,/role="status"/);
 assert.match(html,/aria-live="polite"/);
});
test('smart and detailed settlement screens both use the same choices',()=>{
 assert.match(app,/obligationStatusSelect\('mode-'\+o\.key/);
 assert.match(app,/obligationStatusSelect\('settle-'\+o\.key/);
 assert.equal((app.match(/wireObligationStatusExplanations\(\);/g)||[]).length,2);
});
test('status explanations update when a select changes',()=>{
 let listener,display={textContent:'',dataset:{}};
 const selector={value:'reserve',addEventListener:(name,fn)=>{if(name==='change')listener=fn}};
 const wrapper={querySelector:t=>t==='select'?selector:display};
 const root={querySelectorAll:()=>[wrapper]};
 // Wrapper runs the handler under a mock $ lookup.
 const mocked=new Function('api','node','const obligationStatusExplanation=api.obligationStatusExplanation;const $=()=>({querySelectorAll:()=>[node]});return ('+
   api.wireObligationStatusExplanations.toString()+')()');
 mocked(api,wrapper);
 assert.match(display.textContent,/نحجزه/);
 selector.value='pay';listener();
 assert.match(display.textContent,/ينقص رصيد/);
 assert.equal(display.dataset.mode,'pay');
});
test('responsive styles and versioned deployment reference the update',()=>{
 assert.match(css,/thukhr-status-explain/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(index,/thukhr-settlement-20261031-r1/);
 assert.match(sw,/thukhr-settlement-20261031-r1/);
 assert.match(sw,/v1\.8\.4-settlement-balance/);
});
test('engine accounting remains independent of new UI words',()=>{
 const engine=get('engine.js');
 assert.match(engine,/case 'withheld'/);
 assert.match(engine,/case 'reserve'/);
 assert.match(engine,/case 'pay'/);
});
