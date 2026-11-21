'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const css=read('neo-finance.css'),html=read('index.html'),sw=read('sw.js');
test('Neo Finance stylesheet is loaded after the existing stylesheet, preserving layout and pages',()=>{
 const asset = html.match(/href="(\.\/neo-finance\.css[^"]*)"/);
 assert.ok(asset && html.indexOf('./styles.css?') < asset.index);
 assert.ok(sw.includes("'" + asset[1] + "'"));
 assert.doesNotMatch(css,/localStorage|indexedDB|monthStartDay|transactions|innerHTML/);
});
test('approved A logo is visible in both headers and installed app vector',()=>{
 assert.equal((html.match(/<svg class="brand-mark"/g)||[]).length,2);
 assert.match(read('src/app/icons.js'),/WR\.MARK = '<svg class="brand-mark"/);
 assert.match(read('icon.svg'),/viewBox="0 0 512 512"/);
 assert.match(read('icon.svg'),/fill="#35E3D0"/);
});
test('each scheme gets its own colors and native control appearance', () => {
 assert.match(css, /body\[data-theme="light"\] \{\s*color-scheme: light;/);
 assert.match(css, /body\[data-theme="dark"\] \{\s*color-scheme: dark;/);
 assert.match(css, /--bg: #F4F8FF/);
 assert.match(css, /--bg: #080F20/);
});
