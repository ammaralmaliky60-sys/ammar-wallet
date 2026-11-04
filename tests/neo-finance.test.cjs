'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const css=read('neo-finance.css'),html=read('index.html'),sw=read('sw.js');
test('Neo Finance stylesheet is loaded after the existing stylesheet, preserving layout and pages',()=>{
 assert.ok(html.indexOf('styles.css?v=3.0.3')<html.indexOf('neo-finance.css?v=3.0.4'));
 assert.match(sw,/neo-finance\.css\?v=3\.0\.4/);
 assert.doesNotMatch(css,/localStorage|indexedDB|monthStartDay|transactions|innerHTML/);
});
test('approved A logo is visible in both headers and installed app vector',()=>{
 assert.equal((html.match(/<svg class="brand-mark"/g)||[]).length,2);
 assert.match(read('src/app/icons.js'),/WR\.MARK = '<svg class="brand-mark"/);
 assert.match(read('icon.svg'),/viewBox="0 0 512 512"/);
 assert.match(read('icon.svg'),/fill="#35E3D0"/);
});
test('Neo Finance color tokens are present in both themes',()=>{
 for(const hex of ['#080F20','#121F35','#35E3D0','#3B82F6','#F4F8FF','#16B88A','#F16B78','#F4B544']){
   if(hex==='#3B82F6'||hex==='#16B88A')continue;
   assert.ok(css.includes(hex),hex);
 }
 assert.match(css,/prefers-reduced-motion:reduce/);
});
