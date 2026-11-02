'use strict';
// Guards the static deployment: every file the page or the offline cache asks
// for must exist, and the offline cache must request exactly the same versioned
// URLs that index.html loads (otherwise the installed PWA breaks offline).
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const exists=url=>fs.existsSync(path.join(root,decodeURIComponent(url.replace(/^\.\//,'').split('?')[0])));
const html=read('index.html'),sw=read('sw.js'),manifest=JSON.parse(read('manifest.webmanifest'));
const swAssets=(()=>{const m=sw.match(/const ASSETS\s*=\s*\[([\s\S]*?)\];/);assert.ok(m,'ASSETS array not found in sw.js');return [...m[1].matchAll(/'([^']+)'/g)].map(x=>x[1])})();
const pageAssets=[...html.matchAll(/(?:href|src)="(\.\/[^"#]+)"/g)].map(m=>m[1]).filter(u=>!u.endsWith('/'));

test('every local file referenced by index.html exists',()=>{
 for(const url of pageAssets)assert.ok(exists(url),`missing file for ${url}`);
});
test('every offline-cached asset exists',()=>{
 for(const url of swAssets)if(url!=='./')assert.ok(exists(url),`missing file for ${url}`);
});
test('offline cache contains every script and stylesheet with the same version',()=>{
 for(const url of pageAssets.filter(u=>/\.(js|css)(\?|$)/.test(u)))assert.ok(swAssets.includes(url),`sw.js ASSETS is missing ${url}`);
});
test('offline cache has no duplicate entries',()=>{
 assert.equal(new Set(swAssets).size,swAssets.length);
});
test('manifest icons exist',()=>{
 for(const icon of manifest.icons)assert.ok(exists(icon.src),`missing icon ${icon.src}`);
});
test('fonts referenced by stylesheets exist',()=>{
 for(const css of fs.readdirSync(root).filter(f=>f.endsWith('.css')))
  for(const m of read(css).matchAll(/url\(["']?(\.\/[^"')]+)["']?\)/g))assert.ok(exists(m[1]),`${css}: missing ${m[1]}`);
});
