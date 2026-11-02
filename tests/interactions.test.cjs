'use strict';
// The interaction layer is presentation-only: these tests pin down its pure helpers and
// guarantee it keeps the original <select> as the single source of truth.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'app','interactions.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

function load(env={}){
 const body=source.replace(/\ninstallInteractions\(\);\s*$/,'\n');
 assert.notEqual(body,source,'installInteractions() must be the last statement');
 const context={
  window:{matchMedia:()=>({matches:false})},state:{wallets:[{id:'home',color:'#25866b'}],settings:{digits:'en'}},
  categoryColor:id=>({home:'#25866b',vegetables:'#54a981'})[id]||'',icon:name=>`<svg data-name="${name}"></svg>`,
  safe:v=>String(v),...env
 };
 return new Function('env','with(env){'+body+';return {readFigure,choiceStyle,choiceOptions,canEnhanceSelect,choiceMarkup}}')(context);
}
const option=(value,text,disabled=false)=>({value,textContent:text,disabled});
const fakeSelect=(options,extra={})=>({multiple:false,disabled:false,dataset:{},closest:()=>({}),options,...extra});

test('figures are read from Latin and Arabic-Indic digits',()=>{
 const {readFigure}=load();
 assert.deepEqual(readFigure('1,234,500'),{value:1234500,decimals:0});
 assert.deepEqual(readFigure('١٢٣٬٤٥٦'),{value:123456,decimals:0});
 assert.deepEqual(readFigure('12.50'),{value:12.5,decimals:2});
 assert.equal(readFigure('−5'),null,'negative or unusual figures are shown as-is, never animated');
});

test('choice style follows the options: cards, colour chips or segments',()=>{
 const {choiceStyle}=load();
 assert.equal(choiceStyle([{value:'card',label:'البطاقة'},{value:'cash',label:'نقداً'}]),'cards');
 assert.equal(choiceStyle([{value:'home',label:'المنزل'},{value:'vegetables',label:'الخضروات'}]),'chips');
 assert.equal(choiceStyle([{value:'en',label:'123'},{value:'ar',label:'١٢٣'}]),'segment');
});

test('labels split into a title and a detail line, placeholders are skipped',()=>{
 const {choiceOptions}=load();
 const select=fakeSelect([option('','اختر',true),option('home','المنزل · 120,000 د.ع')]);
 assert.deepEqual(choiceOptions(select),[{value:'home',label:'المنزل',sub:'120,000 د.ع',disabled:false}]);
});

test('only short, enabled, single-value menus inside a form field are converted',()=>{
 const {canEnhanceSelect}=load();
 const two=[option('card','البطاقة'),option('cash','نقداً')];
 assert.equal(canEnhanceSelect(fakeSelect(two)),true);
 assert.equal(canEnhanceSelect(fakeSelect(two,{disabled:true})),false);
 assert.equal(canEnhanceSelect(fakeSelect(two,{multiple:true})),false);
 assert.equal(canEnhanceSelect(fakeSelect(two,{dataset:{native:''}})),false);
 assert.equal(canEnhanceSelect(fakeSelect(two,{closest:()=>null})),false,'filters outside .field stay native');
 const many=Array.from({length:9},(_,i)=>option('v'+i,'خيار '+i));
 assert.equal(canEnhanceSelect(fakeSelect(many)),false);
});

test('choice buttons escape labels and carry the option value',()=>{
 const escaping=v=>String(v).replace(/</g,'&lt;');
 const {choiceMarkup}=load({safe:escaping});
 const {html:markup}=choiceMarkup(fakeSelect([option('card','<b>x</b>'),option('cash','نقداً')]));
 assert.match(markup,/role="radio"/);
 assert.match(markup,/data-value="card"/);
 assert.doesNotMatch(markup,/<b>x/);
});

test('the layer never writes financial data',()=>{
 assert.doesNotMatch(source,/localStorage|save\(|commitEvent\(|E\.commit\(/);
});

test('interaction script loads before main.js and the design layer loads last',()=>{
 assert.ok(html.indexOf('app/interactions.js')>0&&html.indexOf('app/interactions.js')<html.indexOf('app/main.js'));
 const sheets=[...html.matchAll(/<link rel="stylesheet" href="\.\/([^"?]+)/g)].map(m=>m[1]);
 assert.equal(sheets.at(-1),'firza-ui.css');
});
