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
test('Dabburha logo is visible in both headers and app welcome view',()=>{
 assert.equal((html.match(/class="brand-mark" src="\.\/icon\.svg"/g)||[]).length,2);
 assert.match(read('src/app/icons.js'),/WR\.MARK = '<img class="brand-mark" src="\.\/icon\.svg"/);
 assert.match(read('icon.svg'),/viewBox="0 0 512 512"/);
 assert.match(read('icon.svg'),/fill="#2D5BFF"/);
});
test('each scheme gets its own colors and native control appearance', () => {
 const dabburha=read('dabburha-theme.css');
 assert.match(dabburha, /body\[data-theme="light"\] \{\s*color-scheme: light;/);
 assert.match(dabburha, /body\[data-theme="dark"\] \{\s*color-scheme: dark;/);
 assert.match(dabburha, /--bg: #FFE600/);
 assert.match(dabburha, /--bg: #0E0E14/);
});
